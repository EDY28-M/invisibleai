import {
  buildDynamicMessages,
  deepVariableReplacer,
  extractVariables,
  getByPath,
  getStreamingContent,
} from "./common.function";
import { Message, TYPE_PROVIDER } from "@/types";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import curl2Json from "@bany/curl-to-json";
import { CHUNK_POLL_INTERVAL_MS } from "../chat-constants";
import { getResponseSettings, RESPONSE_LENGTHS, LANGUAGES } from "@/lib";
import { MARKDOWN_FORMATTING_INSTRUCTIONS } from "@/config/constants";
import { serverApi } from "@/lib/server-api";

const curlJsonCache = new Map<string, any>();
function getCachedCurlJson(curl: string) {
  let cached = curlJsonCache.get(curl);
  if (!cached) {
    cached = curl2Json(curl);
    curlJsonCache.set(curl, cached);
  }
  return cached;
}

/** Builds a messages array compatible with the InvisibleAI server /api/chat endpoint. */
function buildServerMessages(
  systemPrompt: string | undefined,
  history: Message[],
  userMessage: string,
  imagesBase64: string[]
): Array<{ role: string; content: any }> {
  const messages: Array<{ role: string; content: any }> = [];

  if (systemPrompt?.trim()) {
    messages.push({ role: "system", content: systemPrompt });
  }

  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  if (imagesBase64.length > 0) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: userMessage },
        ...imagesBase64.map((b64) => ({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${b64}` },
        })),
      ],
    });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  return messages;
}

function buildEnhancedSystemPrompt(baseSystemPrompt?: string): string {
  const responseSettings = getResponseSettings();
  const prompts: string[] = [];

  if (baseSystemPrompt) {
    prompts.push(baseSystemPrompt);
  }

  const lengthOption = RESPONSE_LENGTHS.find(
    (l) => l.id === responseSettings.responseLength
  );
  if (lengthOption?.prompt?.trim()) {
    prompts.push(lengthOption.prompt);
  }

  const languageOption = LANGUAGES.find(
    (l) => l.id === responseSettings.language
  );
  if (languageOption?.prompt?.trim()) {
    prompts.push(languageOption.prompt);
  }

  prompts.push(MARKDOWN_FORMATTING_INSTRUCTIONS);

  return prompts.join(" ");
}

async function* fetchInvisibleAIAIResponse(params: {
  systemPrompt?: string;
  userMessage: string;
  imagesBase64?: string[];
  history?: Message[];
  signal?: AbortSignal;
  userId?: string;
  conversationId?: string;
  currentScreen?: string;
  currentRoute?: string;
  appVersion?: string;
  selectedFeature?: string;
  sessionId?: string | null;
}): AsyncIterable<string> {
  try {
    const {
      systemPrompt,
      userMessage,
      imagesBase64 = [],
      history = [],
      signal,
      sessionId,
    } = params;

    if (signal?.aborted) {
      return;
    }

    // ── MODO DIRECTO LOCAL (JS FETCH): Máxima velocidad, cero lag ──
    const storage = await invoke<{
      groq_api_key?: string;
      groq_model?: string;
    }>("secure_storage_get").catch(() => ({} as { groq_api_key?: string; groq_model?: string }));

    if (storage.groq_api_key) {
      const licenseStillValid = await serverApi.ensureLicensedCredentialsValid();
      if (!licenseStillValid) {
        throw new Error("Tu licencia ya no está activa. Actívala nuevamente para usar InvisibleAI API.");
      }

      const messages = buildServerMessages(
        systemPrompt,
        history,
        userMessage,
        imagesBase64
      );
      const modelId = storage.groq_model || "meta-llama/llama-4-scout-17b-16e-instruct";

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${storage.groq_api_key}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          stream: true,
          stream_options: { include_usage: true },
        }),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Groq API Error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`);
      }

      if (!response.body) {
        throw new Error("No response body received from Groq");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let totalTokens = 0;

      while (true) {
        if (signal?.aborted) {
          reader.cancel();
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const trimmed = line.substring(5).trim();
            if (!trimmed || trimmed === "[DONE]") continue;
            try {
              const parsed = JSON.parse(trimmed);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) yield delta;
              // Groq sends usage in the final chunk (choices=[]) when stream_options.include_usage=true
              if (parsed.usage?.total_tokens) {
                totalTokens = parsed.usage.total_tokens;
              }
            } catch {
              // Silencioso
            }
          }
        }
      }

      // Process any content remaining in buffer after stream ends (usage chunk may lack trailing newline)
      if (buffer.trim()) {
        for (const line of buffer.split("\n")) {
          if (line.startsWith("data:")) {
            const trimmed = line.substring(5).trim();
            if (!trimmed || trimmed === "[DONE]") continue;
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.usage?.total_tokens) {
                totalTokens = parsed.usage.total_tokens;
              }
            } catch {}
          }
        }
      }

      // Report token usage to server in background — non-blocking
      if (totalTokens > 0) {
        serverApi.reportChatTokens(totalTokens);
      } else {
        // Groq usage chunk wasn't captured — refresh balance so the UI stays in sync
        serverApi.refreshBalance();
      }
      return;
    }

    let historyString: string | undefined;
    if (history.length > 0) {
      const formattedHistory = [...history].map((msg) => ({
        role: msg.role,
        content: [{ type: "text", text: msg.content }],
      }));
      historyString = JSON.stringify(formattedHistory);
    }

    let imageBase64: any = undefined;
    if (imagesBase64.length > 0) {
      imageBase64 = imagesBase64.length === 1 ? imagesBase64[0] : imagesBase64;
    }

    let streamComplete = false;
    const streamChunks: string[] = [];

    const unlisten = await listen("chat_stream_chunk", (event) => {
      const chunk = event.payload as string;
      streamChunks.push(chunk);
    });

    const unlistenComplete = await listen("chat_stream_complete", () => {
      streamComplete = true;
    });

    try {

      if (signal?.aborted) {
        unlisten();
        unlistenComplete();
        return;
      }

      const conversationId = params.conversationId || "default_conv";
      const userId = params.userId || localStorage.getItem("invisibleai_instance_id") || "default_user";
      const currentRoute = params.currentRoute || window.location.pathname;
      const currentScreen = params.currentScreen || (
        currentRoute === "/chat" ? "ChatPage" :
        currentRoute === "/settings" ? "SettingsPage" :
        currentRoute === "/memory-admin" ? "MemoryAdminPage" : "DashboardPage"
      );
      const appVersion = params.appVersion || "1.2.3";
      const selectedFeature = params.selectedFeature || (
        currentRoute === "/chat" ? "chat" :
        currentRoute === "/memory-admin" ? "mem_admin" : undefined
      );

      await invoke("chat_stream_response", {
        userMessage,
        systemPrompt,
        imageBase64,
        history: historyString,
        userId,
        conversationId,
        currentScreen,
        currentRoute,
        appVersion,
        selectedFeature,
        sessionId,
      });

      let lastIndex = 0;
      while (!streamComplete) {

        if (signal?.aborted) {
          unlisten();
          unlistenComplete();
          return;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, CHUNK_POLL_INTERVAL_MS)
        );

        if (signal?.aborted) {
          unlisten();
          unlistenComplete();
          return;
        }

        for (let i = lastIndex; i < streamChunks.length; i++) {
          yield streamChunks[i];
        }
        lastIndex = streamChunks.length;
      }

      if (signal?.aborted) {
        unlisten();
        unlistenComplete();
        return;
      }

      for (let i = lastIndex; i < streamChunks.length; i++) {
        yield streamChunks[i];
      }
    } finally {
      unlisten();
      unlistenComplete();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    yield `InvisibleAI API Error: ${errorMessage}`;
  }
}

export async function* fetchAIResponse(params: {
  provider: TYPE_PROVIDER | undefined;
  selectedProvider: {
    provider: string;
    variables: Record<string, string>;
  };
  systemPrompt?: string;
  history?: Message[];
  userMessage: string;
  imagesBase64?: string[];
  signal?: AbortSignal;

  useInvisibleAIAPI?: boolean;
  userId?: string;
  conversationId?: string;
  currentScreen?: string;
  currentRoute?: string;
  appVersion?: string;
  selectedFeature?: string;
  sessionId?: string | null;
}): AsyncIterable<string> {
  try {
    const {
      provider,
      selectedProvider,
      systemPrompt,
      history = [],
      userMessage,
      imagesBase64 = [],
      signal,
      useInvisibleAIAPI,
      userId,
      conversationId,
      currentScreen,
      currentRoute,
      appVersion,
      selectedFeature,
      sessionId,
    } = params;

    if (signal?.aborted) {
      return;
    }

    let enrichedSystemPrompt = buildEnhancedSystemPrompt(systemPrompt);

    try {
      const conversationIdVal = conversationId || "default_conv";
      const userIdVal = userId || localStorage.getItem("invisibleai_instance_id") || "default_user";
      const currentRouteVal = currentRoute || window.location.pathname;
      const currentScreenVal = currentScreen || (
        currentRouteVal === "/chat" ? "ChatPage" :
        currentRouteVal === "/settings" ? "SettingsPage" :
        currentRouteVal === "/memory-admin" ? "MemoryAdminPage" : "DashboardPage"
      );
      const appVersionVal = appVersion || "1.2.3";
      const selectedFeatureVal = selectedFeature || (
        currentRouteVal === "/chat" ? "chat" :
        currentRouteVal === "/memory-admin" ? "mem_admin" : undefined
      );

      enrichedSystemPrompt = await invoke<string>("get_enriched_system_prompt", {
        userMessage,
        systemPrompt: enrichedSystemPrompt,
        userId: userIdVal,
        conversationId: conversationIdVal,
        currentScreen: currentScreenVal,
        currentRoute: currentRouteVal,
        appVersion: appVersionVal,
        selectedFeature: selectedFeatureVal,
        sessionId,
      });
    } catch (err) {
      console.error("Failed to enrich system prompt via Tauri:", err);
    }

    if (useInvisibleAIAPI) {
      yield* fetchInvisibleAIAIResponse({
        systemPrompt: enrichedSystemPrompt,
        userMessage,
        imagesBase64,
        history,
        signal,
        userId,
        conversationId,
        currentScreen,
        currentRoute,
        appVersion,
        selectedFeature,
        sessionId,
      });
      return;
    }
    if (!provider) {
      // No custom provider and InvisibleAI API is off — try direct Groq with
      // the locally stored key before giving up. Falls back gracefully to the
      // Render proxy inside fetchInvisibleAIAIResponse if no local key exists.
      yield* fetchInvisibleAIAIResponse({
        systemPrompt: enrichedSystemPrompt,
        userMessage,
        imagesBase64,
        history,
        signal,
        userId,
        conversationId,
        currentScreen,
        currentRoute,
        appVersion,
        selectedFeature,
        sessionId,
      });
      return;
    }
    if (!selectedProvider) {
      throw new Error(`Selected provider not provided`);
    }

    let curlJson;
    try {
      curlJson = getCachedCurlJson(provider.curl);
    } catch (error) {
      throw new Error(
        `Failed to parse curl: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    const extractedVariables = extractVariables(provider.curl);
    const requiredVars = extractedVariables.filter(
      ({ key }) => key !== "SYSTEM_PROMPT" && key !== "TEXT" && key !== "IMAGE"
    );
    for (const { key } of requiredVars) {
      if (
        !selectedProvider.variables?.[key] ||
        selectedProvider.variables[key].trim() === ""
      ) {
        throw new Error(
          `Missing required variable: ${key}. Please configure it in settings.`
        );
      }
    }

    if (!userMessage) {
      throw new Error("User message is required");
    }
    if (imagesBase64.length > 0 && !provider.curl.includes("{{IMAGE}}")) {
      throw new Error(
        `Provider ${provider?.id ?? "unknown"} does not support image input`
      );
    }

    let bodyObj: any = curlJson.data
      ? JSON.parse(JSON.stringify(curlJson.data))
      : {};
    const messagesKey = Object.keys(bodyObj).find((key) =>
      ["messages", "contents", "conversation", "history"].includes(key)
    );

    if (messagesKey && Array.isArray(bodyObj[messagesKey])) {
      const finalMessages = buildDynamicMessages(
        bodyObj[messagesKey],
        history,
        userMessage,
        imagesBase64
      );
      bodyObj[messagesKey] = finalMessages;
    }

    const allVariables = {
      ...Object.fromEntries(
        Object.entries(selectedProvider.variables).map(([key, value]) => [
          key.toUpperCase(),
          value,
        ])
      ),
      SYSTEM_PROMPT: enrichedSystemPrompt || "",
    };

    bodyObj = deepVariableReplacer(bodyObj, allVariables);
    let url = deepVariableReplacer(curlJson.url || "", allVariables);

    const headers = deepVariableReplacer(curlJson.header || {}, allVariables);
    headers["Content-Type"] = "application/json";

    if (provider?.streaming) {
      if (typeof bodyObj === "object" && bodyObj !== null) {
        const streamKey = Object.keys(bodyObj).find(
          (k) => k.toLowerCase() === "stream"
        );
        if (streamKey) {
          bodyObj[streamKey] = true;
        } else {
          bodyObj.stream = true;
        }
      }
    }

    const fetchFunction = url?.includes("http") ? fetch : tauriFetch;

    let response;
    try {
      response = await fetchFunction(url, {
        method: curlJson.method || "POST",
        headers,
        body: curlJson.method === "GET" ? undefined : JSON.stringify(bodyObj),
        signal,
      });
    } catch (fetchError) {

      if (
        signal?.aborted ||
        (fetchError instanceof Error && fetchError.name === "AbortError")
      ) {
        return;
      }
      yield `Network error during API request: ${
        fetchError instanceof Error ? fetchError.message : "Unknown error"
      }`;
      return;
    }

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch {}
      yield `API request failed: ${response.status} ${response.statusText}${
        errorText ? ` - ${errorText}` : ""
      }`;
      return;
    }

    if (!provider?.streaming) {
      let json;
      try {
        json = await response.json();
      } catch (parseError) {
        yield `Failed to parse non-streaming response: ${
          parseError instanceof Error ? parseError.message : "Unknown error"
        }`;
        return;
      }
      const content =
        getByPath(json, provider?.responseContentPath || "") || "";
      yield content;
      return;
    }

    if (!response.body) {
      yield "Streaming not supported or response body missing";
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {

      if (signal?.aborted) {
        reader.cancel();
        return;
      }

      let readResult;
      try {
        readResult = await reader.read();
      } catch (readError) {

        if (
          signal?.aborted ||
          (readError instanceof Error && readError.name === "AbortError")
        ) {
          return;
        }
        yield `Error reading stream: ${
          readError instanceof Error ? readError.message : "Unknown error"
        }`;
        return;
      }
      const { done, value } = readResult;
      if (done) break;

      if (signal?.aborted) {
        reader.cancel();
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data:")) {
          const trimmed = line.substring(5).trim();
          if (!trimmed || trimmed === "[DONE]") continue;
          try {
            const parsed = JSON.parse(trimmed);
            const delta = getStreamingContent(
              parsed,
              provider?.responseContentPath || ""
            );
            if (delta) {
              yield delta;
            }
          } catch (e) {

          }
        }
      }
    }
  } catch (error) {
    throw new Error(
      `Error in fetchAIResponse: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

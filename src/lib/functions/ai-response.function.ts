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
import curl2Json from "@bany/curl-to-json";
import { getResponseSettings, RESPONSE_LENGTHS, LANGUAGES } from "@/lib";
import { MARKDOWN_FORMATTING_INSTRUCTIONS } from "@/config/constants";
import { serverApi } from "@/lib/server-api";

const FREE_CHAT_MODEL = "llama-3.3-70b-versatile";
// Licensed users run on Llama 4 Scout (matches the server config.ts LICENSED_CHAT_MODEL
// default and the Rust backend fallback). Used only as a safety fallback when the
// server-provided groq_model is not stored yet.
const LICENSED_CHAT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

// Global delivery style applied to EVERY profile and both API paths.
// Keeps the model natural and direct without going telegraphic or rambling.
const RESPONSE_STYLE_INSTRUCTIONS =
  "ESTILO DE RESPUESTA (aplica siempre, sea cual sea el perfil): responde de forma natural, fluida y directa. Arranca por la respuesta o recomendación concreta, no con preámbulos ni rodeos. No rellenes con paja, disculpas, ni resúmenes de lo que vas a decir. NO devuelvas preguntas de relleno ni pidas aclaraciones salvo que sea estrictamente imprescindible para poder responder; ante la duda, asume el caso más probable y responde. Tampoco seas telegráfico: da el detalle suficiente para que la respuesta sea genuinamente útil y bien explicada, ni más ni menos. Tono conversacional y claro.";

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
  imagesBase64: string[],
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
    (l) => l.id === responseSettings.responseLength,
  );
  if (lengthOption?.prompt?.trim()) {
    prompts.push(lengthOption.prompt);
  }

  const languageOption = LANGUAGES.find(
    (l) => l.id === responseSettings.language,
  );
  if (languageOption?.prompt?.trim()) {
    const strictLanguagePrompt = `CRITICAL: You MUST write your response entirely in ${languageOption.name}. Do not respond in any other language under any circumstances. Even if the user's input, the audio transcription, or the context is in a different language, your response MUST be 100% in ${languageOption.name}. This is a mandatory instruction.`;
    prompts.push(strictLanguagePrompt);
  }

  prompts.push(RESPONSE_STYLE_INSTRUCTIONS);
  prompts.push(MARKDOWN_FORMATTING_INSTRUCTIONS);

  return prompts.join(" ");
}

/**
 * Reads an SSE stream and yields text chunks. Handles both:
 *   - Groq/OpenAI format:  data: {"choices":[{"delta":{"content":"..."}}]}
 *   - InvisibleAI server:  same envelope plus `data: {"type":"usage", ...}` and `data: [DONE]`
 *
 * onUsage is called with total_tokens when the upstream provides usage data.
 */
async function* readSSEStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal | undefined,
  onUsage?: (tokens: number) => void,
  onError?: (msg: string) => void,
): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consumeLine = function* (line: string): Generator<string> {
    if (!line.startsWith("data:")) return;
    const trimmed = line.substring(5).trim();
    if (!trimmed || trimmed === "[DONE]") return;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.error) {
        onError?.(String(parsed.error));
        return;
      }
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) yield delta as string;
      const total = parsed.usage?.total_tokens;
      if (typeof total === "number" && total > 0) onUsage?.(total);
    } catch {
      /* ignore malformed SSE chunks */
    }
  };

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel().catch(() => { });
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) yield* consumeLine(line);
    }

    // Flush any trailing line that didn't end with \n
    if (buffer.trim()) {
      for (const line of buffer.split("\n")) yield* consumeLine(line);
    }
  } finally {
    reader.releaseLock?.();
  }
}

/**
 * Routes chat completions:
 *   - Licensed users (Groq key cached locally) → direct call to Groq for minimum latency.
 *   - Free users (no local key)               → direct call to the InvisibleAI server,
 *                                                which proxies to Groq with llama-3.3-70b-versatile
 *                                                and tracks credit-based usage.
 *
 * Errors are thrown (not silently yielded) so the UI can render a real error state
 * instead of closing the chat with an empty response.
 */
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
  const {
    systemPrompt,
    userMessage,
    imagesBase64 = [],
    history = [],
    signal,
  } = params;

  if (signal?.aborted) return;

  const storage = await invoke<{
    groq_api_key?: string;
    groq_model?: string;
    instance_id?: string;
    license_key?: string;
  }>("secure_storage_get").catch(() => ({}) as Record<string, string>);

  const messages = buildServerMessages(
    systemPrompt,
    history,
    userMessage,
    imagesBase64,
  );

  // Modelo de chat con licencia (lo entrega el server en /api/credentials).
  const licensedModel = storage.groq_model || LICENSED_CHAT_MODEL;
  // El cliente con licencia le pega a Groq DIRECTO solo con modelos Groq. Para
  // xAI (grok-*) hay que rutear por el server, que tiene la key de xAI y despacha.
  const canCallGroqDirect =
    !!storage.groq_api_key && !licensedModel.startsWith("grok-");

  // ── LICENSED (modelo Groq): llamada directa a Groq ──────────────────────────
  if (canCallGroqDirect) {
    const modelId = licensedModel;

    // IMPORTANT: must use tauriFetch (Tauri plugin-http), NOT native fetch.
    // Native browser fetch is blocked by the Tauri webview security scope.
    const response = await tauriFetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storage.groq_api_key}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          stream: true,
          stream_options: { include_usage: true },
        }),
        signal,
      } as any,
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Groq API Error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""
        }`,
      );
    }
    if (!response.body) throw new Error("No response body received from Groq");

    let totalTokens = 0;
    yield* readSSEStream(
      response.body as unknown as ReadableStream<Uint8Array>,
      signal,
      (tokens) => {
        totalTokens = tokens;
      },
      (msg) => {
        throw new Error(msg);
      },
    );

    if (totalTokens > 0) serverApi.reportChatTokens(totalTokens);
    else serverApi.refreshBalance();
    return;
  }

  // ── FREE: direct call to InvisibleAI server (proxy → Groq + llama-3) ───────
  const instanceId =
    storage.instance_id ||
    localStorage.getItem("invisibleai_instance_id") ||
    undefined;

  // Also send licenseKey in case the instance has one stored but groq_api_key
  // wasn't loaded yet (e.g. first launch after activation before credential refresh).
  const licenseKey =
    storage.license_key ||
    localStorage.getItem("invisibleai_license_key") ||
    undefined;

  const serverUrl = serverApi.getServerUrl();
  const response = await tauriFetch(`${serverUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instanceId,
      licenseKey,
      // Licenciado con modelo no-Groq (xAI/Grok) → su modelo; free → modelo free.
      model: licenseKey ? licensedModel : FREE_CHAT_MODEL,
      messages,
      stream: true,
    }),
    signal,
  } as any);

  if (!response.ok) {
    let errMsg = `Server error ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody?.error) errMsg = errBody.error;
    } catch {
      try {
        const text = await response.text();
        if (text) errMsg = text;
      } catch { }
    }
    throw new Error(errMsg);
  }
  if (!response.body) {
    throw new Error("No response body received from InvisibleAI server");
  }

  yield* readSSEStream(
    response.body as unknown as ReadableStream<Uint8Array>,
    signal,
    undefined,
    (msg) => {
      throw new Error(msg);
    },
  );

  // Server reports usage in its own SSE `type: "usage"` chunk + by side effect.
  // Refresh balance so the UI stays in sync with the credit counter.
  serverApi.refreshBalance();
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

    const enrichedSystemPrompt = buildEnhancedSystemPrompt(systemPrompt);

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
        `Failed to parse curl: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }

    const extractedVariables = extractVariables(provider.curl);
    const requiredVars = extractedVariables.filter(
      ({ key }) => key !== "SYSTEM_PROMPT" && key !== "TEXT" && key !== "IMAGE",
    );
    for (const { key } of requiredVars) {
      if (
        !selectedProvider.variables?.[key] ||
        selectedProvider.variables[key].trim() === ""
      ) {
        throw new Error(
          `Missing required variable: ${key}. Please configure it in settings.`,
        );
      }
    }

    if (!userMessage) {
      throw new Error("User message is required");
    }
    if (imagesBase64.length > 0 && !provider.curl.includes("{{IMAGE}}")) {
      throw new Error(
        `Provider ${provider?.id ?? "unknown"} does not support image input`,
      );
    }

    let bodyObj: any = curlJson.data
      ? JSON.parse(JSON.stringify(curlJson.data))
      : {};
    const messagesKey = Object.keys(bodyObj).find((key) =>
      ["messages", "contents", "conversation", "history"].includes(key),
    );

    if (messagesKey && Array.isArray(bodyObj[messagesKey])) {
      const finalMessages = buildDynamicMessages(
        bodyObj[messagesKey],
        history,
        userMessage,
        imagesBase64,
      );
      bodyObj[messagesKey] = finalMessages;
    }

    const allVariables = {
      ...Object.fromEntries(
        Object.entries(selectedProvider.variables).map(([key, value]) => [
          key.toUpperCase(),
          value,
        ]),
      ),
    };

    bodyObj = deepVariableReplacer(bodyObj, allVariables);
    let url = deepVariableReplacer(curlJson.url || "", allVariables);

    const headers = deepVariableReplacer(curlJson.header || {}, allVariables);
    headers["Content-Type"] = "application/json";

    if (provider?.streaming) {
      if (typeof bodyObj === "object" && bodyObj !== null) {
        const streamKey = Object.keys(bodyObj).find(
          (k) => k.toLowerCase() === "stream",
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
      yield `Network error during API request: ${fetchError instanceof Error ? fetchError.message : "Unknown error"
        }`;
      return;
    }

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch { }
      yield `API request failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""
        }`;
      return;
    }

    if (!provider?.streaming) {
      let json;
      try {
        json = await response.json();
      } catch (parseError) {
        yield `Failed to parse non-streaming response: ${parseError instanceof Error ? parseError.message : "Unknown error"
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
        yield `Error reading stream: ${readError instanceof Error ? readError.message : "Unknown error"
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
              provider?.responseContentPath || "",
            );
            if (delta) {
              yield delta;
            }
          } catch (e) { }
        }
      }
    }
  } catch (error) {
    throw new Error(formatFriendlyErrorMessage(error));
  }
}

export function formatFriendlyErrorMessage(err: any): string {
  const message = err instanceof Error ? err.message : String(err);
  const lowerMsg = message.toLowerCase();

  const isExpired =
    lowerMsg.includes("expirada") ||
    lowerMsg.includes("expired") ||
    lowerMsg.includes("venció") ||
    lowerMsg.includes("expiró");

  const isLicenseInvalid =
    lowerMsg.includes("licencia no encontrada") ||
    lowerMsg.includes("licencia inválida") ||
    lowerMsg.includes("licencia revocada") ||
    lowerMsg.includes("licencia activa") ||
    lowerMsg.includes("no está registrado para esta licencia") ||
    lowerMsg.includes("license revoked") ||
    lowerMsg.includes("license_invalid") ||
    lowerMsg.includes("unauthorized") ||
    lowerMsg.includes("server error 403") ||
    lowerMsg.includes("status code: 403") ||
    lowerMsg.includes("status: 403");

  if (isLicenseInvalid) {
    if (isExpired) {
      return "Tu licencia ha vencido. Por favor, renueva tu suscripción.";
    }
    return "Su licencia ha sido revocada.";
  }

  if (isExpired) {
    return "Tu licencia ha vencido. Por favor, renueva tu suscripción.";
  }

  const isRateLimit =
    (lowerMsg.includes("groq") || lowerMsg.includes("api error")) &&
    (lowerMsg.includes("rate limit") ||
      lowerMsg.includes("429") ||
      lowerMsg.includes("too many requests"));

  const isLimitReached =
    lowerMsg.includes("límite diario gratuito alcanzado") ||
    (lowerMsg.includes("gratuito") && lowerMsg.includes("límite")) ||
    lowerMsg.includes("límite diario alcanzado") ||
    lowerMsg.includes("quota") ||
    lowerMsg.includes("rate limit") ||
    lowerMsg.includes("daily limit") ||
    lowerMsg.includes("limit reached") ||
    lowerMsg.includes("limite alcanzado") ||
    lowerMsg.includes("límite alcanzado") ||
    lowerMsg.includes("429") ||
    lowerMsg.includes("too many requests") ||
    lowerMsg.includes("sin créditos") ||
    lowerMsg.includes("credits") ||
    lowerMsg.includes("crédito") ||
    lowerMsg.includes("credito");

  if (isLimitReached) {
    if (isRateLimit) {
      return "El proveedor de IA (Groq) está experimentando una alta demanda temporal (Límite de tasa / Rate Limit 429). Por favor, espera unos segundos e intenta nuevamente.";
    }
    return "Usaste todos los créditos de tu plan.";
  }

  if (
    lowerMsg.includes("server error") ||
    lowerMsg.includes("failed to fetch") ||
    lowerMsg.includes("network error") ||
    lowerMsg.includes("connect") ||
    lowerMsg.includes("timeout") ||
    lowerMsg.includes("500") ||
    lowerMsg.includes("502") ||
    lowerMsg.includes("503") ||
    lowerMsg.includes("504") ||
    lowerMsg.includes("bad gateway") ||
    lowerMsg.includes("service unavailable") ||
    lowerMsg.includes("failed to send chat request") ||
    lowerMsg.includes("stream read error")
  ) {
    return "El servidor de InvisibleAI está temporalmente fuera de línea o se está reiniciando. Por favor, espera unos instantes e intenta nuevamente.";
  }

  return message;
}

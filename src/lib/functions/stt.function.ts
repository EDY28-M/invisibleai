import {
  deepVariableReplacer,
  getByPath,
  blobToBase64,
} from "./common.function";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";

import { TYPE_PROVIDER } from "@/types";
import curl2Json from "@bany/curl-to-json";
import { serverApi } from "@/lib/server-api";
import { getResponseSettings } from "../storage/response-settings.storage";

const curlJsonCache = new Map<string, any>();
function getCachedCurlJson(curl: string) {
  let cached = curlJsonCache.get(curl);
  if (!cached) {
    cached = curl2Json(curl);
    curlJsonCache.set(curl, cached);
  }
  return cached;
}

const FREE_STT_MODEL = "whisper-large-v3";

/**
 * Routes speech-to-text:
 *   - Licensed users (Groq key cached locally) → direct call to Groq Whisper.
 *   - Free users (no local key)               → direct call to the InvisibleAI server,
 *                                                which proxies to Groq Whisper (non-turbo)
 *                                                and tracks credit-based usage.
 *
 * No blocking license validation: free users must be able to transcribe without a license.
 */
async function fetchInvisibleAISTT(audio: File | Blob, language?: string): Promise<string> {
  const storage = await invoke<{
    groq_api_key?: string;
  }>("secure_storage_get").catch(() => ({}) as { groq_api_key?: string });

  // ── LICENSED: direct call to Groq Whisper ────────────────────────────────
  if (storage.groq_api_key) {
    const form = new FormData();
    const blob = new Blob([await audio.arrayBuffer()], {
      type: audio.type || "audio/wav",
    });
    form.append("file", blob, (audio as File).name || "audio.wav");
    form.append("model", FREE_STT_MODEL);
    form.append("response_format", "json");
    if (language) {
      form.append("language", language);
    }

    // IMPORTANT: tauriFetch (Tauri plugin-http) required; native fetch is blocked
    // by the webview security scope in Tauri v2 production builds.
    // tauriFetch supports FormData natively via plugin-http.
    const resp = await tauriFetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${storage.groq_api_key}` },
        body: form,
      } as any,
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => resp.statusText);
      throw new Error(`Groq Whisper error ${resp.status}: ${errText}`);
    }
    const result = (await resp.json()) as { text?: string };
    return (result.text ?? "").trim();
  }

  // ── FREE: direct call to InvisibleAI server (proxy → Groq Whisper) ───────
  return await serverApi.transcribe(audio, "audio.wav", language);
}

export interface STTParams {
  provider: TYPE_PROVIDER | undefined;
  selectedProvider: {
    provider: string;
    variables: Record<string, string>;
  };
  audio: File | Blob;

  useInvisibleAIAPI?: boolean;
}

export async function fetchSTT(params: STTParams): Promise<string> {
  let warnings: string[] = [];

  try {
    const { provider, selectedProvider, audio, useInvisibleAIAPI } = params;

    const responseSettings = getResponseSettings();
    const mapLanguageToISO = (lang: string): string => {
      switch (lang) {
        case "english": return "en";
        case "spanish": return "es";
        case "french": return "fr";
        case "german": return "de";
        case "italian": return "it";
        case "portuguese": return "pt";
        case "dutch": return "nl";
        case "russian": return "ru";
        case "chinese": return "zh";
        case "japanese": return "ja";
        case "korean": return "ko";
        case "arabic": return "ar";
        case "turkish": return "tr";
        case "polish": return "pl";
        case "swedish": return "sv";
        case "norwegian": return "no";
        case "danish": return "da";
        case "finnish": return "fi";
        case "greek": return "el";
        case "czech": return "cs";
        case "hungarian": return "hu";
        case "romanian": return "ro";
        case "ukrainian": return "uk";
        case "vietnamese": return "vi";
        case "thai": return "th";
        case "indonesian": return "id";
        case "malay": return "ms";
        case "hebrew": return "he";
        case "filipino": return "tl";
        default: return "es";
      }
    };
    const targetISO = mapLanguageToISO(responseSettings.language);

    if (useInvisibleAIAPI) {
      return await fetchInvisibleAISTT(audio, targetISO);
    }

    if (!audio) throw new Error("Audio file is required");

    // No custom provider configured → route through InvisibleAI server (Groq Whisper)
    if (!provider) {
      return await serverApi.transcribe(audio, "audio.wav", targetISO);
    }

    if (!selectedProvider) throw new Error("Selected provider not provided");

    let curlJson: any;
    try {
      curlJson = getCachedCurlJson(provider.curl);
    } catch (error) {
      throw new Error(
        `Failed to parse curl: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    const file = audio as File;
    if (file.size === 0) throw new Error("Audio file is empty");

    const allVariables = {
      ...Object.fromEntries(
        Object.entries(selectedProvider.variables).map(([key, value]) => [
          key.toUpperCase(),
          value,
        ])
      ),
    };

    let url = deepVariableReplacer(curlJson.url || "", allVariables);
    const headers = deepVariableReplacer(curlJson.header || {}, allVariables);
    const formData = deepVariableReplacer(curlJson.form || {}, allVariables);

    const isBinaryUpload = provider.curl.includes("--data-binary");

    const rawParams = curlJson.params || {};

    const decodedParams = Object.fromEntries(
      Object.entries(rawParams).map(([key, value]) => [
        key,
        typeof value === "string" ? decodeURIComponent(value) : "",
      ])
    );

    const replacedParams = deepVariableReplacer(decodedParams, allVariables);

    const queryString = new URLSearchParams(replacedParams).toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }

    let finalHeaders = { ...headers };
    let body: FormData | string | Blob;

    const isForm =
      provider.curl.includes("-F ") || provider.curl.includes("--form");
    if (isForm) {
      const form = new FormData();
      const freshBlob = new Blob([await audio.arrayBuffer()], {
        type: audio.type,
      });
      form.append("file", freshBlob, "audio.wav");
      const headerKeys = Object.keys(headers).map((k) =>
        k.toUpperCase().replace(/[-_]/g, "")
      );

      for (const [key, val] of Object.entries(formData)) {
        if (typeof val !== "string") {
          if (
            !val ||
            headerKeys.includes(key.toUpperCase()) ||
            key.toUpperCase() === "AUDIO"
          )
            continue;
          form.append(key.toLowerCase(), val as string | Blob);
          continue;
        }

        if (!isNaN(parseInt(key, 10))) {
          const [formKey, ...formValueParts] = val.split("=");
          const formValue = formValueParts.join("=");

          if (formKey.toLowerCase() === "file") continue;

          if (
            !formValue ||
            headerKeys.includes(formKey.toUpperCase().replace(/[-_]/g, ""))
          )
            continue;

          form.append(formKey, formValue);
        } else {
          if (key.toLowerCase() === "file") continue;
          if (
            !val ||
            headerKeys.includes(key.toUpperCase()) ||
            key.toUpperCase() === "AUDIO"
          )
            continue;
          form.append(key.toLowerCase(), val as string | Blob);
        }
      }
      delete finalHeaders["Content-Type"];
      body = form;
    } else if (isBinaryUpload) {

      body = new Blob([await audio.arrayBuffer()], {
        type: audio.type,
      });
    } else {

      allVariables.AUDIO = await blobToBase64(audio);
      const dataObj = curlJson.data ? { ...curlJson.data } : {};
      body = JSON.stringify(deepVariableReplacer(dataObj, allVariables));
    }

    const fetchFunction = url?.includes("http") ? fetch : tauriFetch;

    let response: Response;
    try {
      response = await fetchFunction(url, {
        method: curlJson.method || "POST",
        headers: finalHeaders,
        body: curlJson.method === "GET" ? undefined : body,
      });
    } catch (e) {
      throw new Error(`Network error: ${e instanceof Error ? e.message : e}`);
    }

    if (!response.ok) {
      let errText = "";
      try {
        errText = await response.text();
      } catch { }
      let errMsg: string;
      try {
        const errObj = JSON.parse(errText);
        errMsg = errObj.message || errText;
      } catch {
        errMsg = errText || response.statusText;
      }
      throw new Error(`HTTP ${response.status}: ${errMsg}`);
    }

    const responseText = await response.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      return [...warnings, responseText.trim()].filter(Boolean).join("; ");
    }

    const rawPath = provider.responseContentPath || "text";
    const path = rawPath.charAt(0).toLowerCase() + rawPath.slice(1);
    const transcription = (getByPath(data, path) || "").trim();

    if (!transcription) {
      return [...warnings, "No transcription found"].join("; ");
    }

    return [...warnings, transcription].filter(Boolean).join("; ");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }
}

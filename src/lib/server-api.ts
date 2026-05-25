/**
 * Cliente tipado para el InvisibleAI Server.
 *
 * Centraliza todas las llamadas HTTP al servidor propio.
 * La URL del servidor se lee de:
 *   1. Variable de entorno VITE_INVISIBLEAI_SERVER (build-time, recomendado para prod)
 *   2. localStorage["invisibleai_server_url"] (runtime, para dev/testing)
 *   3. Fallback: http://localhost:3000 (local dev)
 *
 * Uso:
 *   import { serverApi } from "@/lib/server-api";
 *   const config = await serverApi.getConfig(licenseKey, instanceId);
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

// ── URL base ──────────────────────────────────────────────────────────────────

function getServerUrl(): string {
  // 1. Build-time env (Vite)
  const envUrl = (import.meta as any).env?.VITE_INVISIBLEAI_SERVER as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, "");

  // 2. Runtime override (dev/testing)
  const stored = localStorage.getItem("invisibleai_server_url");
  if (stored) return stored.replace(/\/$/, "");

  // 3. Local dev fallback
  return "http://localhost:3000";
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface AppConfig {
  mode: "free" | "licensed";
  streaming: boolean;
  chat: {
    model: string;
    supportsVision: boolean;
  };
  stt: {
    type: "server" | "deepgram_streaming";
    model: string;
    language: string;
  };
}

export interface DeepgramTokenResponse {
  token: string;
  model: string;
  language: string;
  expiresAt: string;
}

export interface ActivateResponse {
  activated: boolean;
  instance?: { id: string; name: string };
  is_dev_license?: boolean;
  error?: string;
}

export interface ValidateResponse {
  valid: boolean;
  status?: string;
  type?: string;
  error?: string;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${getServerUrl()}${path}`;
  // tauriFetch permite llamadas de red desde Tauri sin restricciones de CORS
  const resp = await tauriFetch(url, options as any);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText })) as any;
    throw new Error(err.error || `Server error ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

async function apiFetchMultipart<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const url = `${getServerUrl()}${path}`;
  const resp = await tauriFetch(url, {
    method: "POST",
    body: formData,
  } as any);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText })) as any;
    throw new Error(err.error || `Server error ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

// ── API pública ───────────────────────────────────────────────────────────────

export const serverApi = {
  // ── Configuración de la app ───────────────────────────────────────────────

  /**
   * Obtiene la config operativa según estado de licencia.
   * Sin licenseKey → devuelve config free tier.
   */
  async getConfig(licenseKey?: string, instanceId?: string): Promise<AppConfig> {
    const params = new URLSearchParams();
    if (licenseKey) params.set("licenseKey", licenseKey);
    if (instanceId) params.set("instanceId", instanceId);
    const qs = params.toString() ? `?${params}` : "";
    return apiFetch<AppConfig>(`/api/config${qs}`);
  },

  // ── Licencias ─────────────────────────────────────────────────────────────

  async activate(
    licenseKey: string,
    instanceId?: string,
    instanceName?: string,
    platform?: string
  ): Promise<ActivateResponse> {
    return apiFetch<ActivateResponse>("/api/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, instanceId, instanceName, platform }),
    });
  },

  async deactivate(licenseKey: string, instanceId: string): Promise<{ deactivated: boolean }> {
    return apiFetch("/api/deactivate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, instanceId }),
    });
  },

  async validate(licenseKey: string, instanceId: string): Promise<ValidateResponse> {
    return apiFetch<ValidateResponse>("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, instanceId }),
    });
  },

  // ── STT — Transcripción no-streaming (Groq Whisper) ──────────────────────

  /**
   * Envía un audio blob y recibe la transcripción.
   * Usa el servidor para no exponer la API key de Groq.
   */
  async transcribe(audio: Blob, filename = "audio.wav"): Promise<string> {
    const form = new FormData();
    form.append("file", audio, filename);
    const result = await apiFetchMultipart<{ transcription: string }>("/api/stt", form);
    return result.transcription;
  },

  // ── STT — Token efímero Deepgram (solo usuarios con licencia) ────────────

  /**
   * Solicita un token temporal de Deepgram (TTL: 1 hora).
   * La app usa este token para conectar el WebSocket directamente a Deepgram.
   * Solo disponible para licencias activas.
   */
  async getDeepgramToken(licenseKey: string, instanceId: string): Promise<DeepgramTokenResponse> {
    const params = new URLSearchParams({ licenseKey, instanceId });
    return apiFetch<DeepgramTokenResponse>(`/api/stt/token?${params}`);
  },

  // ── Chat / IA ─────────────────────────────────────────────────────────────

  /**
   * Llamada de chat con streaming SSE.
   * Devuelve un ReadableStream que emite chunks de texto.
   */
  async chatStream(params: {
    licenseKey?: string;
    instanceId?: string;
    model: string;
    messages: Array<{ role: string; content: any }>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<ReadableStream<string>> {
    const url = `${getServerUrl()}/api/chat`;
    const resp = await tauriFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, stream: true }),
    } as any);

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText })) as any;
      throw new Error(err.error || `Chat error ${resp.status}`);
    }

    return resp.body as unknown as ReadableStream<string>;
  },

  /**
   * Llamada de chat sin streaming — devuelve el texto completo.
   */
  async chat(params: {
    licenseKey?: string;
    instanceId?: string;
    model: string;
    messages: Array<{ role: string; content: any }>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const result = await apiFetch<{ content: string }>("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, stream: false }),
    });
    return result.content;
  },

  // ── Utilidades ────────────────────────────────────────────────────────────

  /** URL actual del servidor (para mostrar en UI de settings) */
  getServerUrl,

  /** Verifica si el servidor responde */
  async healthCheck(): Promise<boolean> {
    try {
      const resp = await tauriFetch(`${getServerUrl()}/health` as any);
      return resp.ok;
    } catch {
      return false;
    }
  },
};

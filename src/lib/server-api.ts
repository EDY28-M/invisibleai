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
 *
 *   // Inicializar credentials al arrancar la app
 *   serverApi.setCredentials(instanceId, licenseKey);
 *
 *   // Recibir updates de saldo de uso
 *   serverApi.setOnUsageUpdate((balance) => { ... });
 *
 *   const text = await serverApi.chat({ model, messages });
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

// ── URL base ──────────────────────────────────────────────────────────────────

function getServerUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_INVISIBLEAI_SERVER as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const stored = localStorage.getItem("invisibleai_server_url");
  if (stored) return stored.replace(/\/$/, "");
  return "http://localhost:3000";
}

// ── Credenciales del dispositivo (se inicializan en AppProvider.initializeApp) ─

let _instanceId:    string = "";
let _licenseKey:    string = "";
let _onUsageUpdate: ((balance: UsageBalanceInfo) => void) | null = null;

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface AppConfig {
  mode: "free" | "licensed";
  streaming: boolean;
  chat: { model: string; supportsVision: boolean };
  stt:  { type: "server" | "deepgram_streaming"; model: string; language: string };
}

export interface DeepgramTokenResponse {
  token:            string;
  model:            string;
  language:         string;
  expiresAt:        string;
  creditsRemaining?: number;
  creditsMax?:       number;
  segmentSeconds?:   number;
}

export interface ActivationCredentials {
  groqApiKey?:        string;
  model?:             string;
  deepgramApiKey?:    string | null;
  deepgramModel?:     string;
  deepgramLanguage?:  string;
  licenseExpiresAt?:  string | null;
  supportsVision?:    boolean;
}

export interface ActivateResponse {
  activated:       boolean;
  instance?:       { id: string; name: string };
  is_dev_license?: boolean;
  error?:          string;
  /** Bundled by the server to avoid a separate /api/credentials call. */
  credentials?:    ActivationCredentials;
}

export interface ValidateResponse {
  valid:   boolean;
  status?: string;
  type?:   string;
  error?:  string;
}

export interface UsageBalanceInfo {
  licenseType: "free" | "licensed";
  chat: {
    tokensUsedToday:  number;
    tokenLimitPerDay: number;
    remainingToday:   number;
    resetsAt:         string; // ISO
  };
  stt: {
    callsUsedToday:  number;
    callLimitPerDay: number | null; // null = ilimitado
    remainingToday:  number | null;
  };
  streaming: {
    credits:           number;
    maxCredits:        number;
    equivalentMinutes: number;
  };
}

// ── Helpers internos ──────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url  = `${getServerUrl()}${path}`;
  const resp = await tauriFetch(url, options as any);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText })) as any;
    throw new Error(err.error || `Server error ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

async function apiFetchMultipart<T>(path: string, formData: FormData): Promise<T> {
  const url  = `${getServerUrl()}${path}`;
  const resp = await tauriFetch(url, { method: "POST", body: formData } as any);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText })) as any;
    throw new Error(err.error || `Server error ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

/** Dispara un refresh del saldo de uso en background (no bloquea). */
function backgroundRefreshUsage(): void {
  if (!_instanceId || !_onUsageUpdate) return;
  serverApi.getUsageBalance()
    .then(_onUsageUpdate)
    .catch(() => { /* silencioso — no crítico */ });
}

// ── API pública ───────────────────────────────────────────────────────────────

export const serverApi = {

  // ── Inicialización ────────────────────────────────────────────────────────

  /**
   * Guarda las credenciales del dispositivo.
   * Llamar en AppProvider.initializeApp y después de activar/desactivar licencia.
   */
  setCredentials(instanceId: string, licenseKey?: string): void {
    _instanceId = instanceId || "";
    _licenseKey = licenseKey || "";
  },

  /** Registra un callback que se invoca cuando el saldo de uso cambia. */
  setOnUsageUpdate(cb: (balance: UsageBalanceInfo) => void): void {
    _onUsageUpdate = cb;
  },

  // ── Configuración de la app ───────────────────────────────────────────────

  async getConfig(licenseKey?: string, instanceId?: string): Promise<AppConfig> {
    const params = new URLSearchParams();
    if (licenseKey) params.set("licenseKey", licenseKey);
    if (instanceId) params.set("instanceId", instanceId);
    const qs = params.toString() ? `?${params}` : "";
    return apiFetch<AppConfig>(`/api/config${qs}`);
  },

  // ── Saldo de uso ──────────────────────────────────────────────────────────

  /**
   * Obtiene el saldo de uso actual del dispositivo.
   * Usa las credenciales almacenadas con setCredentials().
   */
  async getUsageBalance(): Promise<UsageBalanceInfo> {
    const params = new URLSearchParams();
    if (_instanceId) params.set("instanceId", _instanceId);
    if (_licenseKey) params.set("licenseKey", _licenseKey);
    return apiFetch<UsageBalanceInfo>(`/api/usage?${params}`);
  },

  // ── Licencias ─────────────────────────────────────────────────────────────

  async activate(
    licenseKey: string,
    instanceId?: string,
    instanceName?: string,
    platform?: string,
  ): Promise<ActivateResponse> {
    return apiFetch<ActivateResponse>("/api/activate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ licenseKey, instanceId, instanceName, platform }),
    });
  },

  async deactivate(licenseKey: string, instanceId: string): Promise<{ deactivated: boolean }> {
    return apiFetch("/api/deactivate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ licenseKey, instanceId }),
    });
  },

  async validate(licenseKey: string, instanceId: string): Promise<ValidateResponse> {
    return apiFetch<ValidateResponse>("/api/validate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ licenseKey, instanceId }),
    });
  },

  async getCredentials(licenseKey: string, instanceId: string): Promise<{
    groqApiKey: string;
    model: string;
    deepgramApiKey?: string;
    deepgramModel?: string;
    deepgramLanguage?: string;
    licenseExpiresAt?: string | null;
    supportsVision?: boolean;
  }> {
    const params = new URLSearchParams({ licenseKey, instanceId });
    return apiFetch(`/api/credentials?${params}`);
  },

  // ── STT — Transcripción no-streaming (Groq Whisper) ──────────────────────

  /**
   * Envía un audio blob y recibe la transcripción.
   * Incluye instanceId y licenseKey como query params para tracking de uso.
   * Tras la transcripción dispara un refresh del saldo en background.
   */
  async transcribe(audio: Blob, filename = "audio.wav"): Promise<string> {
    const params = new URLSearchParams();
    if (_instanceId) params.set("instanceId", _instanceId);
    if (_licenseKey) params.set("licenseKey",  _licenseKey);
    const qs   = params.toString() ? `?${params}` : "";
    const form = new FormData();
    form.append("file", audio, filename);
    const result = await apiFetchMultipart<{ transcription: string; usage?: UsageBalanceInfo }>(
      `/api/stt${qs}`, form
    );
    // Si el servidor devolvió el saldo actualizado, notificamos directamente
    if (result.usage && _onUsageUpdate) {
      _onUsageUpdate(result.usage);
    } else {
      backgroundRefreshUsage();
    }
    return result.transcription;
  },

  // ── STT — Token efímero Deepgram (solo usuarios con licencia) ────────────

  /**
   * Solicita un token temporal de Deepgram.
   * Descuenta créditos del saldo del usuario en el servidor.
   */
  async getDeepgramToken(licenseKey: string, instanceId: string): Promise<DeepgramTokenResponse> {
    const params = new URLSearchParams({ licenseKey, instanceId });
    const result = await apiFetch<DeepgramTokenResponse>(`/api/stt/token?${params}`);
    // Refresh saldo para reflejar los créditos descontados
    backgroundRefreshUsage();
    return result;
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
    const url  = `${getServerUrl()}/api/chat`;
    const resp = await tauriFetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...params,
        instanceId: params.instanceId || _instanceId || undefined,
        licenseKey: params.licenseKey || _licenseKey || undefined,
        stream: true,
      }),
    } as any);

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText })) as any;
      throw new Error(err.error || `Chat error ${resp.status}`);
    }

    backgroundRefreshUsage();
    return resp.body as unknown as ReadableStream<string>;
  },

  /**
   * Llamada de chat sin streaming — devuelve el texto completo.
   * El servidor incluye el saldo actualizado en la respuesta.
   */
  async chat(params: {
    licenseKey?: string;
    instanceId?: string;
    model: string;
    messages: Array<{ role: string; content: any }>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const result = await apiFetch<{ content: string; usage?: UsageBalanceInfo }>("/api/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...params,
        instanceId: params.instanceId || _instanceId || undefined,
        licenseKey: params.licenseKey || _licenseKey || undefined,
        stream: false,
      }),
    });

    // Actualizar saldo de uso en el contexto
    if (result.usage && _onUsageUpdate) {
      _onUsageUpdate(result.usage);
    } else {
      backgroundRefreshUsage();
    }

    return result.content;
  },

  // ── Utilidades ────────────────────────────────────────────────────────────

  /**
   * Lightweight balance refresh — fetches latest usage and fires _onUsageUpdate.
   * Safe to call from anywhere without triggering full license validation.
   */
  refreshBalance(): void {
    if (!_instanceId || !_onUsageUpdate) return;
    serverApi.getUsageBalance()
      .then(_onUsageUpdate)
      .catch(() => {});
  },

  /**
   * Reports token usage for a direct (client-side) Groq chat call.
   * Fire-and-forget — does not block the UI. Updates balance via _onUsageUpdate.
   */
  reportChatTokens(tokens: number): void {
    if (!_instanceId || tokens <= 0) return;
    apiFetch<UsageBalanceInfo>("/api/usage/report", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        instanceId: _instanceId,
        licenseKey: _licenseKey || undefined,
        tokens,
      }),
    })
      .then((balance) => { if (_onUsageUpdate) _onUsageUpdate(balance); })
      .catch(() => {});
  },

  getServerUrl,

  async healthCheck(): Promise<boolean> {
    try {
      const resp = await tauriFetch(`${getServerUrl()}/health` as any);
      return resp.ok;
    } catch {
      return false;
    }
  },
};

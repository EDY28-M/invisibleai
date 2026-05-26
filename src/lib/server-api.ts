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
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";

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
const LICENSE_STATE_UPDATED_EVENT = "license-state-updated";

// Nota: el conjunto completo de claves del storage es:
// ["invisibleai_license_key","invisibleai_instance_id","groq_api_key","groq_model",
//  "deepgram_api_key","deepgram_model","deepgram_language","license_expires_at"]

// Solo las claves de licencia premium — el instance_id NO se incluye aquí.
// Al revocar una licencia, el usuario pasa al tier free y conserva su instance_id
// para que el servidor pueda seguir trackeando su uso gratuito.
const PREMIUM_LICENSE_KEYS = [
  "invisibleai_license_key",
  "groq_api_key",
  "groq_model",
  "deepgram_api_key",
  "deepgram_model",
  "deepgram_language",
  "license_expires_at",
] as const;

/**
 * Asegura que _instanceId esté poblado.
 * Si no está, intenta cargarlo desde secure_storage (Tauri keychain).
 * Esto evita la race condition entre AppProvider.initializeApp() y los componentes
 * que llaman a refreshBalance / reportChatTokens antes de que setCredentials se ejecute.
 */
async function ensureCredentialsLoaded(): Promise<boolean> {
  if (_instanceId) return true;
  try {
    const storage = await invoke<{ instance_id?: string; license_key?: string }>("secure_storage_get");
    if (storage.instance_id) {
      _instanceId = storage.instance_id;
      _licenseKey = storage.license_key ?? "";
      return true;
    }
  } catch {
    // Silencioso — el dispositivo aún no tiene credenciales en disco
  }
  return false;
}

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

function isNetworkLikeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Network error") ||
    message.includes("Failed to fetch") ||
    message.includes("Server error 5") ||
    message.includes("connect") ||
    message.includes("timeout")
  );
}

function isLicenseInvalidError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Licencia no encontrada") ||
    message.includes("Licencia inválida") ||
    message.includes("Licencia revocada") ||
    message.includes("Licencia expirada") ||
    message.includes("licencia activa") ||
    message.includes("no está registrado para esta licencia") ||
    message.includes("License revoked") ||
    message.includes("license_invalid")
  );
}

async function clearServerCredentials(reason: string): Promise<void> {
  // Solo eliminamos las credenciales PREMIUM. El instance_id se conserva
  // para que el usuario pueda seguir usando el servidor en tier free.
  await invoke("secure_storage_remove", {
    keys: [...PREMIUM_LICENSE_KEYS],
  }).catch(() => {});
  // Limpiar solo la licencia en memoria — el instanceId se mantiene para el tier free
  _licenseKey = "";
  emit(LICENSE_STATE_UPDATED_EVENT, { active: false, reason }).catch(() => {});
}

async function validateStoredLicenseOrClear(): Promise<boolean> {
  const ready = await ensureCredentialsLoaded();
  if (!ready || !_licenseKey || !_instanceId) return false;
  if (_licenseKey === "invisibleai-admin-local") return true;

  try {
    const validation = await apiFetch<ValidateResponse>("/api/validate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ licenseKey: _licenseKey, instanceId: _instanceId }),
    });

    if (validation.valid) return true;
    await clearServerCredentials(validation.error || "license_invalid");
    return false;
  } catch (error) {
    if (isNetworkLikeError(error)) {
      return true;
    }

    await clearServerCredentials(error instanceof Error ? error.message : "license_invalid");
    return false;
  }
}

/** Dispara un refresh del saldo de uso en background (no bloquea). */
function backgroundRefreshUsage(): void {
  ensureCredentialsLoaded().then((ready) => {
    if (!ready) return;
    serverApi.getUsageBalance()
      .then((balance) => {
        if (_onUsageUpdate) _onUsageUpdate(balance);
        emit("usage-balance-updated", balance).catch(() => {});
      })
      .catch((err) => { console.warn("[serverApi] backgroundRefreshUsage failed:", err); });
  });
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

  /**
   * Revalida la licencia antes de usar credenciales premium guardadas localmente.
   * Si el server confirma que la licencia ya no existe/no es válida, limpia las keys locales.
   * Si el server está temporalmente inaccesible, conserva el comportamiento offline existente.
   */
  async ensureLicensedCredentialsValid(): Promise<boolean> {
    return validateStoredLicenseOrClear();
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
   * No descuenta créditos aquí — los créditos se descuentan al final
   * de la sesión con reportStreamingSeconds() basado en uso real.
   */
  async getDeepgramToken(licenseKey: string, instanceId: string): Promise<DeepgramTokenResponse> {
    const params = new URLSearchParams({ licenseKey, instanceId });
    return apiFetch<DeepgramTokenResponse>(`/api/stt/token?${params}`);
  },

  /**
   * Reporta los segundos reales de streaming Deepgram al terminar una sesión.
   * Funciona tanto con key local como con token del servidor.
   * Fire-and-forget — no bloquea la UI.
   */
  reportStreamingSeconds(seconds: number): void {
    if (seconds <= 0) return;
    const secs = Math.ceil(seconds);
    ensureCredentialsLoaded().then((ready) => {
      if (!ready) return;
      apiFetch<UsageBalanceInfo>("/api/stt/usage", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          instanceId: _instanceId,
          licenseKey: _licenseKey || undefined,
          seconds:    secs,
        }),
      })
        .then((balance) => {
          if (_onUsageUpdate) _onUsageUpdate(balance);
          emit("usage-balance-updated", balance).catch(() => {});
        })
        .catch((err) => {
          if (isLicenseInvalidError(err)) {
            clearServerCredentials(err instanceof Error ? err.message : "license_invalid").catch(() => {});
            return;
          }
          console.warn("[serverApi] reportStreamingSeconds failed:", err);
        });
    });
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
   * Auto-loads credentials from secure_storage if they haven't been set yet
   * (evita la race condition al montar el dashboard antes de initializeApp).
   */
  refreshBalance(): void {
    ensureCredentialsLoaded().then((ready) => {
      if (!ready) return;
      serverApi.getUsageBalance()
        .then((balance) => {
          if (_onUsageUpdate) _onUsageUpdate(balance);
          emit("usage-balance-updated", balance).catch(() => {});
        })
        .catch((err) => { console.warn("[serverApi] refreshBalance failed:", err); });
    });
  },

  /**
   * Reports token usage for a direct (client-side) Groq chat call.
   * Fire-and-forget — does not block the UI. Updates balance via _onUsageUpdate
   * AND emits a cross-window Tauri event so the dashboard updates immediately
   * even if the call was made from the chat overlay window.
   * Retries up to 2 times (15s apart) to survive Render cold-start delays.
   */
  reportChatTokens(tokens: number): void {
    if (tokens <= 0) return;
    ensureCredentialsLoaded().then((ready) => {
      if (!ready) return;
      const attempt = (retriesLeft: number) => {
        apiFetch<UsageBalanceInfo>("/api/usage/report", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            instanceId: _instanceId,
            licenseKey: _licenseKey || undefined,
            tokens,
          }),
        })
          .then((balance) => {
            if (_onUsageUpdate) _onUsageUpdate(balance);
            // Notify ALL windows (dashboard, overlay, etc.) immediately
            emit("usage-balance-updated", balance).catch(() => {});
          })
          .catch((err) => {
            if (isLicenseInvalidError(err)) {
              clearServerCredentials(err instanceof Error ? err.message : "license_invalid").catch(() => {});
              return;
            }

            if (retriesLeft > 0) {
              // Render free tier can take 30-60s to wake up — retry
              setTimeout(() => attempt(retriesLeft - 1), 15_000);
            } else {
              console.warn("[serverApi] reportChatTokens failed after retries:", err);
              // Server unreachable — trigger a plain balance refresh so the
              // dashboard at least shows the latest server-side count
              serverApi.refreshBalance();
            }
          });
      };
      attempt(2);
    });
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

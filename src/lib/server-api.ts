import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";

function getServerUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_INVISIBLEAI_SERVER as
    | string
    | undefined;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const stored = localStorage.getItem("invisibleai_server_url");
  if (stored) return stored.replace(/\/$/, "");
  return "http://localhost:3000";
}

let _instanceId: string = "";
let _licenseKey: string = "";
let _onUsageUpdate: ((balance: UsageBalanceInfo) => void) | null = null;
const LICENSE_STATE_UPDATED_EVENT = "license-state-updated";

const PREMIUM_LICENSE_KEYS = [
  "invisibleai_license_key",
  "groq_api_key",
  "groq_model",
  "deepgram_api_key",
  "deepgram_model",
  "deepgram_language",
  "license_expires_at",
] as const;

async function ensureCredentialsLoaded(): Promise<boolean> {
  if (_instanceId) return true;
  try {
    const storage = await invoke<{
      instance_id?: string;
      license_key?: string;
    }>("secure_storage_get");
    if (storage.instance_id) {
      _instanceId = storage.instance_id;
      _licenseKey = storage.license_key ?? "";
      return true;
    }
  } catch {}
  return false;
}

export interface AppConfig {
  mode: "free" | "licensed";
  streaming: boolean;
  chat: { model: string; supportsVision: boolean };
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
  creditsRemaining?: number;
  creditsMax?: number;
  segmentSeconds?: number;
}

export interface ActivationCredentials {
  groqApiKey?: string;
  model?: string;
  deepgramApiKey?: string | null;
  deepgramModel?: string;
  deepgramLanguage?: string;
  licenseExpiresAt?: string | null;
  supportsVision?: boolean;
}

export interface ActivateResponse {
  activated: boolean;
  instance?: { id: string; name: string };
  is_dev_license?: boolean;
  error?: string;

  credentials?: ActivationCredentials;
}

export interface ValidateResponse {
  valid: boolean;
  status?: string;
  type?: string;
  error?: string;
}

export interface UsageBalanceInfo {
  licenseType: "free" | "licensed";
  chat: {
    tokensUsedToday: number;
    tokenLimitPerDay: number;
    remainingToday: number;
    resetsAt: string;
  };
  stt: {
    callsUsedToday: number;
    callLimitPerDay: number | null;
    remainingToday: number | null;
  };
  streaming: {
    credits: number;
    maxCredits: number;
    equivalentMinutes: number;
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getServerUrl()}${path}`;
  const headers: Record<string, string> = {
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (_instanceId) headers["x-instance-id"] = _instanceId;
  if (_licenseKey) headers["x-license-key"] = _licenseKey;

  const resp = await tauriFetch(url, { ...options, headers } as any);
  if (!resp.ok) {
    const err = (await resp
      .json()
      .catch(() => ({ error: resp.statusText }))) as any;
    throw new Error(err.error || `Server error ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

async function apiFetchMultipart<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const url = `${getServerUrl()}${path}`;
  const headers: Record<string, string> = {};
  if (_instanceId) headers["x-instance-id"] = _instanceId;
  if (_licenseKey) headers["x-license-key"] = _licenseKey;
  const resp = await tauriFetch(url, {
    method: "POST",
    body: formData,
    headers,
  } as any);
  if (!resp.ok) {
    const err = (await resp
      .json()
      .catch(() => ({ error: resp.statusText }))) as any;
    throw new Error(err.error || `Server error ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

export function isNetworkLikeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Network error") ||
    message.includes("Failed to fetch") ||
    message.includes("Server error 5") ||
    message.includes("connect") ||
    message.includes("timeout")
  );
}

export function isLicenseInvalidError(error: unknown): boolean {
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
  await invoke("secure_storage_remove", {
    keys: [...PREMIUM_LICENSE_KEYS],
  }).catch(() => {});

  _licenseKey = "";
  emit(LICENSE_STATE_UPDATED_EVENT, { active: false, reason }).catch(() => {});
}

async function validateStoredLicenseOrClear(): Promise<boolean> {
  const ready = await ensureCredentialsLoaded();
  if (!ready || !_licenseKey || !_instanceId) return false;
  if (_licenseKey === "invisibleai-admin-local") return true;

  try {
    const validation = await apiFetch<ValidateResponse>("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licenseKey: _licenseKey,
        instanceId: _instanceId,
      }),
    });

    if (validation.valid) return true;
    await clearServerCredentials(validation.error || "license_invalid");
    return false;
  } catch (error) {
    if (isLicenseInvalidError(error)) {
      await clearServerCredentials(
        error instanceof Error ? error.message : "license_invalid",
      );
      return false;
    }

    console.debug(
      "[serverApi] validateStoredLicenseOrClear failed due to non-license error, keeping local license:",
      error,
    );
    return true;
  }
}

function backgroundRefreshUsage(): void {
  ensureCredentialsLoaded().then((ready) => {
    if (!ready) return;
    serverApi
      .getUsageBalance()
      .then((balance) => {
        if (_onUsageUpdate) _onUsageUpdate(balance);
        emit("usage-balance-updated", balance).catch(() => {});
      })
      .catch((err) => {
        console.warn("[serverApi] backgroundRefreshUsage failed:", err);
      });
  });
}

export const serverApi = {
  setCredentials(instanceId: string, licenseKey?: string): void {
    _instanceId = instanceId || "";
    _licenseKey = licenseKey || "";
  },

  setOnUsageUpdate(cb: (balance: UsageBalanceInfo) => void): void {
    _onUsageUpdate = cb;
  },

  async ensureLicensedCredentialsValid(): Promise<boolean> {
    return validateStoredLicenseOrClear();
  },

  async getConfig(
    licenseKey?: string,
    instanceId?: string,
  ): Promise<AppConfig> {
    const params = new URLSearchParams();
    if (licenseKey) params.set("licenseKey", licenseKey);
    if (instanceId) params.set("instanceId", instanceId);
    const qs = params.toString() ? `?${params}` : "";
    return apiFetch<AppConfig>(`/api/config${qs}`);
  },

  async getUsageBalance(): Promise<UsageBalanceInfo> {
    const params = new URLSearchParams();
    if (_instanceId) params.set("instanceId", _instanceId);
    if (_licenseKey) params.set("licenseKey", _licenseKey);
    return apiFetch<UsageBalanceInfo>(`/api/usage?${params}`);
  },

  async activate(
    licenseKey: string,
    instanceId?: string,
    instanceName?: string,
    platform?: string,
  ): Promise<ActivateResponse> {
    return apiFetch<ActivateResponse>("/api/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, instanceId, instanceName, platform }),
    });
  },

  async deactivate(
    licenseKey: string,
    instanceId: string,
  ): Promise<{ deactivated: boolean }> {
    return apiFetch("/api/deactivate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, instanceId }),
    });
  },

  async validate(
    licenseKey: string,
    instanceId: string,
  ): Promise<ValidateResponse> {
    return apiFetch<ValidateResponse>("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, instanceId }),
    });
  },

  async getCredentials(
    licenseKey: string,
    instanceId: string,
  ): Promise<{
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

  async transcribe(audio: Blob, filename = "audio.wav"): Promise<string> {
    const params = new URLSearchParams();
    if (_instanceId) params.set("instanceId", _instanceId);
    if (_licenseKey) params.set("licenseKey", _licenseKey);
    const qs = params.toString() ? `?${params}` : "";
    const form = new FormData();
    form.append("file", audio, filename);
    const result = await apiFetchMultipart<{
      transcription: string;
      usage?: UsageBalanceInfo;
    }>(`/api/stt${qs}`, form);

    if (result.usage && _onUsageUpdate) {
      _onUsageUpdate(result.usage);
    } else {
      backgroundRefreshUsage();
    }
    return result.transcription;
  },

  async getDeepgramToken(
    licenseKey: string,
    instanceId: string,
  ): Promise<DeepgramTokenResponse> {
    const params = new URLSearchParams({ licenseKey, instanceId });
    return apiFetch<DeepgramTokenResponse>(`/api/stt/token?${params}`);
  },

  reportStreamingSeconds(seconds: number): void {
    if (seconds <= 0) return;
    const secs = Math.ceil(seconds);
    ensureCredentialsLoaded().then((ready) => {
      if (!ready) return;
      apiFetch<UsageBalanceInfo>("/api/stt/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: _instanceId,
          licenseKey: _licenseKey || undefined,
          seconds: secs,
        }),
      })
        .then((balance) => {
          if (_onUsageUpdate) _onUsageUpdate(balance);
          emit("usage-balance-updated", balance).catch(() => {});
        })
        .catch((err) => {
          if (isLicenseInvalidError(err)) {
            clearServerCredentials(
              err instanceof Error ? err.message : "license_invalid",
            ).catch(() => {});
            return;
          }
          console.warn("[serverApi] reportStreamingSeconds failed:", err);
        });
    });
  },

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
      body: JSON.stringify({
        ...params,
        instanceId: params.instanceId || _instanceId || undefined,
        licenseKey: params.licenseKey || _licenseKey || undefined,
        stream: true,
      }),
    } as any);

    if (!resp.ok) {
      const err = (await resp
        .json()
        .catch(() => ({ error: resp.statusText }))) as any;
      throw new Error(err.error || `Chat error ${resp.status}`);
    }

    backgroundRefreshUsage();
    return resp.body as unknown as ReadableStream<string>;
  },

  async chat(params: {
    licenseKey?: string;
    instanceId?: string;
    model: string;
    messages: Array<{ role: string; content: any }>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const result = await apiFetch<{
      content: string;
      usage?: UsageBalanceInfo;
    }>("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        instanceId: params.instanceId || _instanceId || undefined,
        licenseKey: params.licenseKey || _licenseKey || undefined,
        stream: false,
      }),
    });

    if (result.usage && _onUsageUpdate) {
      _onUsageUpdate(result.usage);
    } else {
      backgroundRefreshUsage();
    }

    return result.content;
  },

  refreshBalance(): void {
    ensureCredentialsLoaded().then((ready) => {
      if (!ready) return;
      serverApi
        .getUsageBalance()
        .then((balance) => {
          if (_onUsageUpdate) _onUsageUpdate(balance);
          emit("usage-balance-updated", balance).catch(() => {});
        })
        .catch((err) => {
          console.warn("[serverApi] refreshBalance failed:", err);
        });
    });
  },

  reportChatTokens(tokens: number): void {
    if (tokens <= 0) return;
    ensureCredentialsLoaded().then((ready) => {
      if (!ready) return;
      const attempt = (retriesLeft: number) => {
        apiFetch<UsageBalanceInfo>("/api/usage/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instanceId: _instanceId,
            licenseKey: _licenseKey || undefined,
            tokens,
          }),
        })
          .then((balance) => {
            if (_onUsageUpdate) _onUsageUpdate(balance);

            emit("usage-balance-updated", balance).catch(() => {});
          })
          .catch((err) => {
            if (isLicenseInvalidError(err)) {
              clearServerCredentials(
                err instanceof Error ? err.message : "license_invalid",
              ).catch(() => {});
              return;
            }

            if (retriesLeft > 0) {
              setTimeout(() => attempt(retriesLeft - 1), 15_000);
            } else {
              console.warn(
                "[serverApi] reportChatTokens failed after retries:",
                err,
              );

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

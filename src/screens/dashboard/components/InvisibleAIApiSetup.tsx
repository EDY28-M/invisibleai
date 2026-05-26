import React, { useEffect, useState } from "react";
import {
  KeyIcon,
  LoaderIcon,
  TrashIcon,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useApp } from "@/contexts";
import { useTranslation } from "@/hooks";
import { serverApi } from "@/lib/server-api";

import {
  Button,
  Input,
  Switch,
} from "@/components";

interface ActivationResponse {
  activated: boolean;
  error?: string;
  license_key?: string;
  instance?: { id: string; name: string; created_at: string };
  is_dev_license?: boolean;
  credentials?: {
    groqApiKey?: string;
    model?: string;
    deepgramApiKey?: string | null;
    deepgramModel?: string;
    deepgramLanguage?: string;
    licenseExpiresAt?: string | null;
    supportsVision?: boolean;
  };
}

interface StorageResult {
  license_key?: string;
  instance_id?: string;
}

const LICENSE_KEY_STORAGE_KEY = "invisibleai_license_key";
const INSTANCE_ID_STORAGE_KEY = "invisibleai_instance_id";

// ── UsageBar ────────────────────────────────────────────────────────────────
interface UsageBarProps {
  label: string;
  used: number;
  max: number | null;
  unit: string;
  unitPrefix?: string;
  colorFrom: string;
  colorTo: string;
  /** Número que se muestra en lugar de `used` (útil para streaming: mostrar disponible) */
  displayUsed?: number;
  /** Si true, la barra muestra el % restante en vez del % consumido */
  inverted?: boolean;
  resetsAt?: string;  // ISO — solo se muestra si está definido
  language?: string;
}

const formatNum = (n: number): string => {
  return n.toLocaleString();
};

const UsageBar = ({
  label, used, max, unit, unitPrefix,
  colorFrom, colorTo, displayUsed, inverted = false,
  resetsAt, language,
}: UsageBarProps) => {
  const safeMax  = max ?? 1;
  const fillPct  = Math.min(100, Math.round((inverted ? (safeMax - used) : used) / safeMax * 100));
  const shown    = displayUsed !== undefined ? displayUsed : used;
  const isWarn   = !inverted && fillPct >= 80;
  const isOk     = inverted  && fillPct >= 50;

  // Tiempo hasta reset
  let resetLabel = "";
  if (resetsAt) {
    const diff = new Date(resetsAt).getTime() - Date.now();
    if (diff > 0) {
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      resetLabel = language === "spanish"
        ? `Resetea en ${h}h ${m}min`
        : `Resets in ${h}h ${m}min`;
    }
  }

  return (
    <div className="rounded-2xl border border-border/15 bg-card/20 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center min-w-0 gap-1.5">
          <span className="text-sm select-none">🪙</span>
          <span className="text-xs font-bold text-foreground/75 truncate">{label}</span>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-xs font-bold tabular-nums ${isWarn ? "text-rose-400" : isOk ? "text-emerald-400" : "text-foreground/70"}`}>
            {unitPrefix ? `${formatNum(shown)} ` : formatNum(shown)}
            {unitPrefix && <span className="font-normal text-muted-foreground/50">{unitPrefix}</span>}
          </span>
          {max !== null && (
            <span className="text-[11px] text-muted-foreground/40 ml-1">/ {formatNum(max)}</span>
          )}
        </div>
      </div>

      {/* Barra */}
      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/8">
        <div
          className={`h-full bg-gradient-to-r ${colorFrom} ${colorTo} rounded-full transition-all duration-700`}
          style={{ width: `${fillPct}%` }}
        />
      </div>

      {/* Pie: unit + reset */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground/40">{unit}</span>
        {resetLabel && (
          <span className="text-[10px] text-muted-foreground/35">{resetLabel}</span>
        )}
      </div>
    </div>
  );
};

// ── InvisibleAIApiSetup ──────────────────────────────────────────────────────
export const InvisibleAIApiSetup = () => {

  const {
    invisibleaiApiEnabled,
    setInvisibleAIApiEnabled,
    hasActiveLicense,
    setHasActiveLicense,
    getActiveLicenseStatus,
    usageBalance,
    refreshUsageBalance,
  } = useApp();

  const { t, language } = useTranslation();

  const [licenseKey, setLicenseKey] = useState("");
  const [storedLicenseKey, setStoredLicenseKey] = useState<string | null>(null);
  const [maskedLicenseKey, setMaskedLicenseKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadLicenseStatus();
  }, []);

  // Refresh balance every 60s while the dashboard is open
  useEffect(() => {
    if (!hasActiveLicense) return;
    const id = setInterval(() => serverApi.refreshBalance(), 60_000);
    return () => clearInterval(id);
  }, [hasActiveLicense]);

  const loadLicenseStatus = async () => {
    try {
      const storage = await invoke<StorageResult>("secure_storage_get");
      if (storage.license_key) {
        setStoredLicenseKey(storage.license_key);
        const masked = await invoke<string>("mask_license_key_cmd", { licenseKey: storage.license_key });
        setMaskedLicenseKey(masked);
      } else {
        setStoredLicenseKey(null);
        setMaskedLicenseKey(null);
      }
    } catch (error) {
      console.error("Failed to load license status:", error);
      setStoredLicenseKey(null);
      setMaskedLicenseKey(null);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) { setError("Please enter a license key"); return; }
    setIsLoading(true); setError(null); setSuccess(null);
    try {
      const response: ActivationResponse = await invoke("activate_license_api", { licenseKey: licenseKey.trim() });
      if (response.activated && response.instance) {
        // Save license identity — Rust already persisted the API credentials
        // (groq_api_key, deepgram_api_key, etc.) from the bundled response.
        await invoke("secure_storage_save", {
          items: [
            { key: LICENSE_KEY_STORAGE_KEY, value: licenseKey.trim() },
            { key: INSTANCE_ID_STORAGE_KEY, value: response.instance.id },
          ],
        });

        // If the server didn't bundle credentials (older server version) fall
        // back to a separate getCredentials call so we stay backwards-compatible.
        if (!response.credentials?.groqApiKey) {
          try {
            const creds = await serverApi.getCredentials(licenseKey.trim(), response.instance.id);
            const saveItems: { key: string; value: string }[] = [
              { key: "groq_api_key", value: creds.groqApiKey },
              { key: "groq_model",   value: creds.model },
            ];
            if (creds.deepgramApiKey)   saveItems.push({ key: "deepgram_api_key",   value: creds.deepgramApiKey });
            if (creds.deepgramModel)    saveItems.push({ key: "deepgram_model",      value: creds.deepgramModel });
            if (creds.deepgramLanguage) saveItems.push({ key: "deepgram_language",   value: creds.deepgramLanguage });
            if (creds.licenseExpiresAt) saveItems.push({ key: "license_expires_at",  value: creds.licenseExpiresAt });
            await invoke("secure_storage_save", { items: saveItems });
          } catch (credErr) {
            console.error("Fallback credentials fetch failed:", credErr);
          }
        }

        setSuccess("License activated successfully!");
        setLicenseKey("");
        if (!response?.is_dev_license) setInvisibleAIApiEnabled(true);
        await loadLicenseStatus();
        await getActiveLicenseStatus();
        await refreshUsageBalance();
      } else {
        setError(response.error || "Failed to activate license");
      }
    } catch (error) {
      setError(typeof error === "string" ? error : "Failed to activate license");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLicense = async () => {
    setIsLoading(true); setError(null); setSuccess(null);
    setHasActiveLicense(false);
    try {
      await invoke("secure_storage_remove", {
        keys: [
          LICENSE_KEY_STORAGE_KEY,
          INSTANCE_ID_STORAGE_KEY,
          "groq_api_key",
          "groq_model",
          "deepgram_api_key",
          "deepgram_model",
          "deepgram_language",
          "license_expires_at",
        ],
      });
      setSuccess("License removed successfully!");
      setInvisibleAIApiEnabled(false);
      await loadLicenseStatus();
      await refreshUsageBalance();
    } catch (error) {
      setError("Failed to remove license");
    } finally {
      setIsLoading(false);
      await invoke("deactivate_license_api");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !storedLicenseKey) handleActivateLicense();
  };

  return (
    <div className="space-y-5 w-full max-w-5xl mx-auto p-1">

      <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-destructive/6 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div>
            <h2 className="text-[15px] font-bold text-foreground/95 tracking-wide">
              {language === "spanish" ? "Licencia" : "License"}
            </h2>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {language === "spanish"
                ? "Conecta tu licencia para acceso premium. El modelo de IA se configura automáticamente."
                : "Connect your license for premium access. The AI model is configured automatically."}
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-zinc-500/20 bg-zinc-500/5 px-4 py-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{success}</p>
            </div>
          )}

          {!storedLicenseKey ? (
            <div className="flex flex-col items-stretch gap-3 sm:flex-row">
              <Input
                type="password"
                placeholder={t("api_setup_license_key_placeholder")}
                value={licenseKey}
                onChange={(event) => { setLicenseKey(event.target.value); setError(null); setSuccess(null); }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="h-11 flex-1 rounded-2xl border border-border/25 bg-card/20 px-4 text-sm"
              />
              <Button
                onClick={handleActivateLicense}
                disabled={isLoading || !licenseKey.trim()}
                className="h-11 rounded-2xl px-6 font-bold text-xs transition-all duration-200 active:scale-95"
              >
                {isLoading ? <LoaderIcon className="size-3.5 animate-spin mr-1.5" /> : <KeyIcon className="size-3.5 mr-1.5" />}
                {language === "spanish" ? "Activar" : "Activate"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-stretch gap-3 sm:flex-row">
              <Input
                type="text"
                value={maskedLicenseKey || ""}
                disabled={true}
                className="h-11 flex-1 rounded-2xl border border-border/20 bg-card/10 px-4 text-sm text-muted-foreground/60"
              />
              <Button
                onClick={handleRemoveLicense}
                disabled={isLoading}
                variant="outline"
                className="h-11 rounded-2xl px-6 font-bold text-xs transition-all duration-200 active:scale-95"
              >
                {isLoading ? <LoaderIcon className="size-3.5 animate-spin mr-1.5" /> : <TrashIcon className="size-3.5 mr-1.5" />}
                {t("api_setup_remove")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-blue-500/8 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h2 className="text-[15px] font-bold text-foreground/95 tracking-wide">
              {language === "spanish" ? "Estado del Sistema" : "System Status"}
            </h2>
            <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-sm">
              {hasActiveLicense
                ? (language === "spanish"
                    ? "Tienes acceso completo a todas las funciones premium activas."
                    : "Full access to all active premium core features.")
                : (language === "spanish"
                    ? "Accedes a los servidores de InvisibleAI en modo gratuito. Activa tu licencia para funciones premium sin límites."
                    : "You have access to InvisibleAI servers in free mode. Activate your license for unlimited premium features.")}
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-3">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
              hasActiveLicense
                ? "border-zinc-500/20 bg-zinc-500/10 text-zinc-500"
                : "border-blue-500/20 bg-blue-500/8 text-blue-500 dark:text-blue-400"
            }`}>
              <span className={`mr-1.5 size-1.5 rounded-full ${hasActiveLicense ? "bg-zinc-500 animate-pulse" : "bg-blue-400 animate-pulse"}`} />
              {hasActiveLicense
                ? t("active")
                : (language === "spanish" ? "Gratuito" : "Free")}
            </span>
            <label className="flex items-center gap-2.5 text-xs font-bold text-foreground/70 cursor-pointer">
              {invisibleaiApiEnabled ? t("api_setup_disable_api") : t("api_setup_enable_api")}
              <Switch
                checked={invisibleaiApiEnabled}
                onCheckedChange={setInvisibleAIApiEnabled}
                disabled={false}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── Créditos de uso ── */}
      {usageBalance && (
        <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
          {/* Orbs */}
          <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-cyan-500/8 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-5">
            {/* Título */}
            <div>
              <h2 className="text-[15px] font-bold text-foreground/95 tracking-wide">
                {language === "spanish" ? "Balance de Créditos" : "Usage Credits"}
              </h2>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {language === "spanish"
                  ? "Consumo en tiempo real — se actualiza tras cada operación."
                  : "Real-time usage — updates after each operation."}
              </p>
            </div>

            {/* ── Chat tokens ── */}
            <UsageBar
              label={language === "spanish" ? "Chat IA" : "AI Chat"}
              used={usageBalance.chat.tokensUsedToday}
              max={usageBalance.chat.tokenLimitPerDay}
              unit={language === "spanish" ? "tokens hoy" : "tokens today"}
              colorFrom="from-violet-500"
              colorTo="to-indigo-400"
              resetsAt={usageBalance.chat.resetsAt}
              language={language}
            />

            {/* ── STT calls (solo free users) ── */}
            {usageBalance.stt.callLimitPerDay !== null && (
              <UsageBar
                label={language === "spanish" ? "Transcripciones (Whisper)" : "Transcriptions (Whisper)"}
                used={usageBalance.stt.callsUsedToday}
                max={usageBalance.stt.callLimitPerDay}
                unit={language === "spanish" ? "llamadas hoy" : "calls today"}
                colorFrom="from-sky-500"
                colorTo="to-blue-400"
                language={language}
              />
            )}

            {/* ── Streaming credits (solo licensed) ── */}
            {usageBalance.licenseType === "licensed" ? (
              <UsageBar
                label={language === "spanish" ? "Créditos Streaming" : "Streaming Credits"}
                used={usageBalance.streaming.maxCredits - usageBalance.streaming.credits}
                max={usageBalance.streaming.maxCredits}
                displayUsed={usageBalance.streaming.credits}
                unitPrefix={language === "spanish" ? "disponibles" : "available"}
                unit={`≈ ${usageBalance.streaming.equivalentMinutes.toFixed(1)} min`}
                colorFrom="from-amber-400"
                colorTo="to-orange-400"
                inverted
                language={language}
              />
            ) : (
              <div className="flex items-center rounded-2xl border border-dashed border-border/20 bg-card/10 px-4 py-3">
                <div className="flex-1">
                  <div className="text-xs font-bold text-foreground/50">
                    {language === "spanish" ? "Streaming en tiempo real" : "Real-time Streaming"}
                  </div>
                  <div className="text-[11px] text-muted-foreground/40 mt-0.5">
                    {language === "spanish"
                      ? "Disponible en plan de pago — activa tu licencia."
                      : "Available on paid plan — activate your license."}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

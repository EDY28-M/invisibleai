import {
  Label,
  Input,
} from "@/components";
import { UseSettingsReturn } from "@/types";
import { LaptopMinimalIcon, MousePointer2Icon, SparklesIcon, CpuIcon, ShieldAlertIcon } from "lucide-react";
import { useTranslation } from "@/hooks";

export const ScreenshotConfigs = ({
  screenshotConfiguration,
  handleScreenshotModeChange,
  handleScreenshotPromptChange,
  handleScreenshotEnabledChange,
  hasActiveLicense,
}: UseSettingsReturn) => {
  const { t } = useTranslation();

  const promptSuggestions = [
    { label: "Explicar código", prompt: "Analiza esta captura de pantalla de código, explica su funcionamiento línea por línea y detalla la lógica utilizada." },
    { label: "Traducir texto", prompt: "Detecta todos los textos e idiomas presentes en esta imagen y tradúcelos de manera fluida y natural al idioma opuesto (Español o Inglés)." },
    { label: "Refactorizar", prompt: "Identifica posibles cuellos de botella, malas prácticas u oportunidades de optimización en este fragmento de código, y proporciona una versión refactorizada." },
    { label: "Buscar Bugs", prompt: "Revisa meticulosamente este código en busca de posibles excepciones, errores de sintaxis, fugas de memoria o vulnerabilidades de seguridad e indica cómo corregirlos." }
  ];

  return (
    <div id="screenshot" className="space-y-6 w-full max-w-5xl mx-auto p-1">

      {/* 1. MÉTODO DE CAPTURA */}
      <div className="space-y-4">
        <div>
          <h3 className="text-[15px] font-bold text-foreground/95 tracking-wide">
            {t("screenshot_method_title")}
          </h3>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {screenshotConfiguration.enabled
              ? t("screenshot_method_screenshot_desc")
              : t("screenshot_method_selection_desc")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* REGION SELECTION CARD */}
          <div
            onClick={() => { if (hasActiveLicense) handleScreenshotEnabledChange(false); }}
            className={`group relative rounded-2xl border p-5 transition-all duration-300 flex flex-col justify-between min-h-[140px] overflow-hidden ${
              !hasActiveLicense
                ? "opacity-50 cursor-not-allowed border-border/15 bg-card/10"
                : !screenshotConfiguration.enabled
                ? "border-border/30 bg-card/60 cursor-pointer shadow-sm"
                : "border-border/15 bg-card/20 text-muted-foreground hover:border-border/30 hover:bg-card/40 cursor-pointer"
            }`}
          >
            {!screenshotConfiguration.enabled && hasActiveLicense && (
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
            )}

            <div className="relative z-10 flex items-start justify-between">
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                !screenshotConfiguration.enabled && hasActiveLicense
                  ? "bg-foreground/8 text-foreground/70"
                  : "bg-muted/50 text-muted-foreground/50 group-hover:bg-muted/70"
              }`}>
                <MousePointer2Icon className="size-5" />
              </div>

              {!hasActiveLicense ? (
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldAlertIcon className="size-3" />
                  {t("screenshot_method_license_required")}
                </div>
              ) : (
                !screenshotConfiguration.enabled && (
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" />
                )
              )}
            </div>

            <div className="relative z-10 mt-4">
              <h4 className={`text-[13px] font-bold uppercase tracking-wider ${
                !screenshotConfiguration.enabled && hasActiveLicense ? "text-foreground/90" : "text-foreground/45"
              }`}>
                {t("screenshot_method_selection_mode")}
              </h4>
              <p className={`text-xs mt-1.5 leading-relaxed ${
                !screenshotConfiguration.enabled && hasActiveLicense ? "text-muted-foreground/70" : "text-muted-foreground/40"
              }`}>
                Selecciona y analiza un área personalizada de tu pantalla al instante.
              </p>
            </div>
          </div>

          {/* FULL SCREEN CARD */}
          <div
            onClick={() => handleScreenshotEnabledChange(true)}
            className={`group relative rounded-2xl border p-5 transition-all duration-300 flex flex-col justify-between min-h-[140px] overflow-hidden cursor-pointer ${
              screenshotConfiguration.enabled
                ? "border-border/30 bg-card/60 shadow-sm"
                : "border-border/15 bg-card/20 text-muted-foreground hover:border-border/30 hover:bg-card/40"
            }`}
          >
            {screenshotConfiguration.enabled && (
              <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full bg-violet-500/20 blur-2xl pointer-events-none" />
            )}

            <div className="relative z-10 flex items-start justify-between">
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                screenshotConfiguration.enabled
                  ? "bg-foreground/8 text-foreground/70"
                  : "bg-muted/50 text-muted-foreground/50 group-hover:bg-muted/70"
              }`}>
                <LaptopMinimalIcon className="size-5" />
              </div>

              {screenshotConfiguration.enabled && (
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" />
              )}
            </div>

            <div className="relative z-10 mt-4">
              <h4 className={`text-[13px] font-bold uppercase tracking-wider ${
                screenshotConfiguration.enabled ? "text-foreground/90" : "text-foreground/45"
              }`}>
                {t("screenshot_method_screenshot_mode")}
              </h4>
              <p className={`text-xs mt-1.5 leading-relaxed ${
                screenshotConfiguration.enabled ? "text-muted-foreground/70" : "text-muted-foreground/40"
              }`}>
                Captura la pantalla completa para obtener el contexto visual total.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MODO DE PROCESAMIENTO */}
      <div className="space-y-4 pt-2 border-t border-border/10">
        <div>
          <h3 className="text-[15px] font-bold text-foreground/95 tracking-wide">
            {t("screenshot_proc_title")}
          </h3>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {screenshotConfiguration.mode === "manual"
              ? t("screenshot_proc_manual_desc")
              : t("screenshot_proc_auto_desc")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* MANUAL MODE CARD */}
          <div
            onClick={() => handleScreenshotModeChange("manual")}
            className={`group relative rounded-2xl border p-5 transition-all duration-300 flex flex-col justify-between min-h-[130px] overflow-hidden cursor-pointer ${
              screenshotConfiguration.mode === "manual"
                ? "border-border/30 bg-card/60 shadow-sm"
                : "border-border/15 bg-card/20 text-muted-foreground hover:border-border/30 hover:bg-card/40"
            }`}
          >
            {screenshotConfiguration.mode === "manual" && (
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
            )}

            <div className="relative z-10 flex items-start justify-between">
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                screenshotConfiguration.mode === "manual"
                  ? "bg-foreground/8 text-foreground/70"
                  : "bg-muted/50 text-muted-foreground/50 group-hover:bg-muted/70"
              }`}>
                <CpuIcon className="size-5" />
              </div>
              {screenshotConfiguration.mode === "manual" && (
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" />
              )}
            </div>

            <div className="relative z-10 mt-3">
              <h4 className={`text-[13px] font-bold uppercase tracking-wider ${
                screenshotConfiguration.mode === "manual" ? "text-foreground/90" : "text-foreground/45"
              }`}>
                {t("screenshot_proc_manual_mode")}
              </h4>
              <p className={`text-xs mt-1.5 leading-relaxed ${
                screenshotConfiguration.mode === "manual" ? "text-muted-foreground/70" : "text-muted-foreground/40"
              }`}>
                Toma la captura y decide manualmente qué orden enviarle a la IA.
              </p>
            </div>
          </div>

          {/* AUTOMATIC AI MODE CARD */}
          <div
            onClick={() => handleScreenshotModeChange("auto")}
            className={`group relative rounded-2xl border p-5 transition-all duration-300 flex flex-col justify-between min-h-[130px] overflow-hidden cursor-pointer ${
              screenshotConfiguration.mode === "auto"
                ? "border-border/30 bg-card/60 shadow-sm"
                : "border-border/15 bg-card/20 text-muted-foreground hover:border-border/30 hover:bg-card/40"
            }`}
          >
            {screenshotConfiguration.mode === "auto" && (
              <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
            )}

            <div className="relative z-10 flex items-start justify-between">
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                screenshotConfiguration.mode === "auto"
                  ? "bg-foreground/8 text-foreground/70"
                  : "bg-muted/50 text-muted-foreground/50 group-hover:bg-muted/70"
              }`}>
                <SparklesIcon className="size-5" />
              </div>
              {screenshotConfiguration.mode === "auto" && (
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" />
              )}
            </div>

            <div className="relative z-10 mt-3">
              <h4 className={`text-[13px] font-bold uppercase tracking-wider ${
                screenshotConfiguration.mode === "auto" ? "text-foreground/90" : "text-foreground/45"
              }`}>
                {t("screenshot_proc_auto_mode")}
              </h4>
              <p className={`text-xs mt-1.5 leading-relaxed ${
                screenshotConfiguration.mode === "auto" ? "text-muted-foreground/70" : "text-muted-foreground/40"
              }`}>
                Analiza las capturas inmediatamente usando una directiva predefinida.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. AUTO PROMPT */}
      {screenshotConfiguration.mode === "auto" && (
        <div className="space-y-4 p-5 rounded-2xl border border-border/20 bg-card/30 backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-400">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
              {t("screenshot_auto_prompt_label")}
            </Label>
            <span className="text-[11px] text-muted-foreground/50">
              Esta directiva se ejecutará automáticamente sobre cada captura procesada.
            </span>
          </div>

          <div className="relative">
            <Input
              placeholder={t("screenshot_auto_prompt_placeholder")}
              value={screenshotConfiguration.autoPrompt}
              onChange={(e) => handleScreenshotPromptChange(e.target.value)}
              className="w-full h-11 rounded-xl border border-border/25 bg-background/30 hover:border-border/40 focus:border-border/50 transition-all duration-300 pl-4 pr-10 text-sm text-foreground/80 font-medium"
            />
            <SparklesIcon className="absolute right-3.5 top-3.5 size-4 text-foreground/30" />
          </div>

          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest block">
              Sugerencias Rápidas
            </span>
            <div className="flex flex-wrap gap-2">
              {promptSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleScreenshotPromptChange(item.prompt)}
                  className={`text-[11px] font-semibold tracking-wide px-3 py-1.5 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                    screenshotConfiguration.autoPrompt === item.prompt
                      ? "bg-foreground/8 border-border/30 text-foreground/70"
                      : "bg-card/20 border-border/15 text-foreground/50 hover:bg-card/40 hover:border-border/25 hover:text-foreground/70"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground/40 leading-relaxed pt-1">
            {t("screenshot_auto_prompt_help")}
          </p>
        </div>
      )}

      {/* 4. FOOTER */}
      <div className="text-xs text-muted-foreground/40 border-t border-border/10 pt-4 mt-2">
        <p className="leading-relaxed">{t("screenshot_tip")}</p>
      </div>

    </div>
  );
};

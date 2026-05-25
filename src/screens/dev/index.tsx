import { AIProviders, STTProviders } from "./components";
import { useSettings, useTranslation } from "@/hooks";
import { useApp } from "@/contexts";
import { PageLayout } from "@/layouts";
import { LockKeyholeIcon } from "lucide-react";

const cardClass =
  "relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden";

/** Shown inside a card when the InvisibleAI API is active and the section is locked. */
const LockedByServerBanner = ({
  onDisable,
}: {
  onDisable: () => void;
}) => (
  <div className="flex flex-col items-center gap-4 py-2">
    <div className="flex items-start gap-3 w-full rounded-2xl bg-indigo-500/8 border border-indigo-500/15 p-4">
      <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center">
        <LockKeyholeIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 leading-snug">
          API de InvisibleAI activa
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Estás usando los servidores de InvisibleAI con tu licencia. Para configurar
          tus propios proveedores y API keys, desactiva primero la opción{" "}
          <span className="font-medium text-foreground/70">
            "Activar API de InvisibleAI"
          </span>{" "}
          en el panel de licencia.
        </p>
      </div>
    </div>

    <button
      onClick={onDisable}
      className="text-xs font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 underline underline-offset-2 transition-colors cursor-pointer"
    >
      Desactivar API de InvisibleAI ahora
    </button>
  </div>
);

const DevSpace = () => {
  const settings = useSettings();
  const { t } = useTranslation();
  const { invisibleaiApiEnabled, setInvisibleAIApiEnabled } = useApp();

  return (
    <PageLayout title={t("dev_title")} description={t("dev_desc")}>
      <div id="dev" className="space-y-5 w-full max-w-5xl mx-auto p-1">

        {/* ── AI Providers ──────────────────────────────────────────────── */}
        <div className={cardClass}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-indigo-500/8 blur-2xl pointer-events-none" />
          <div className="relative z-10">
            {invisibleaiApiEnabled ? (
              <>
                {/* Header stays visible so user knows what section this is */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-foreground/90">
                    {t("dev_ai_title")}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {t("dev_ai_desc")}
                  </p>
                </div>
                <LockedByServerBanner onDisable={() => setInvisibleAIApiEnabled(false)} />
              </>
            ) : (
              <AIProviders {...settings} />
            )}
          </div>
        </div>

        {/* ── STT Providers ─────────────────────────────────────────────── */}
        <div className={cardClass}>
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-sky-500/8 blur-2xl pointer-events-none" />
          <div className="relative z-10">
            {invisibleaiApiEnabled ? (
              <>
                <div className="mb-4">
                  <p className="text-sm font-semibold text-foreground/90">
                    {t("dev_stt_title")}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {t("dev_stt_desc")}
                  </p>
                </div>
                <LockedByServerBanner onDisable={() => setInvisibleAIApiEnabled(false)} />
              </>
            ) : (
              <STTProviders {...settings} />
            )}
          </div>
        </div>

      </div>
    </PageLayout>
  );
};

export default DevSpace;

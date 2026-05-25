import {
  ResponseLength,
  LanguageSelector,
  AutoScrollToggle,
  ConversationalMemoryToggle,
} from "./components";
import { PageLayout } from "@/layouts";
import { useApp } from "@/contexts";
import { useTranslation } from "@/hooks";
import { GetLicense } from "@/components";

const Responses = () => {
  const { hasActiveLicense } = useApp();
  const { t } = useTranslation();

  return (
    <PageLayout
      title={t("responses_title")}
      description={t("responses_desc")}
    >
      <div id="responses" className="space-y-5 w-full max-w-5xl mx-auto p-1">

        {!hasActiveLicense && (
          <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-5 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground/90 tracking-wide">
                  {t("responses_premium_title").replace(/^[^\p{L}\p{N}]+/u, "").trim()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60 leading-relaxed max-w-md">
                  {t("responses_premium_desc")}
                </p>
              </div>
              <GetLicense
                buttonText={t("dashboard_get_license")}
                buttonClassName="shrink-0 h-9 rounded-2xl text-xs font-bold"
              />
            </div>
          </div>
        )}

        <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-blue-500/6 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <ResponseLength />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-violet-500/8 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <LanguageSelector />
            </div>
          </div>
          <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
            <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-cyan-500/8 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <AutoScrollToggle />
            </div>
          </div>
        </div>

        <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
          <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-zinc-500/8 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <ConversationalMemoryToggle />
          </div>
        </div>

      </div>
    </PageLayout>
  );
};

export default Responses;

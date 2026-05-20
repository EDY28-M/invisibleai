import { AIProviders, STTProviders } from "./components";
import { useSettings, useTranslation } from "@/hooks";
import { PageLayout } from "@/layouts";

const cardClass =
  "relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden";

const DevSpace = () => {
  const settings = useSettings();
  const { t } = useTranslation();

  return (
    <PageLayout title={t("dev_title")} description={t("dev_desc")}>
      <div id="dev" className="space-y-5 w-full max-w-5xl mx-auto p-1">

        <div className={cardClass}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-indigo-500/8 blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <AIProviders {...settings} />
          </div>
        </div>

        <div className={cardClass}>
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-sky-500/8 blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <STTProviders {...settings} />
          </div>
        </div>

      </div>
    </PageLayout>
  );
};

export default DevSpace;

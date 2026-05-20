import { ScreenshotConfigs } from "./components";
import { useSettings, useTranslation } from "@/hooks";
import { PageLayout } from "@/layouts";

const Screenshot = () => {
  const settings = useSettings();
  const { t } = useTranslation();

  return (
    <PageLayout
      title={t("screenshot_title")}
      description={t("screenshot_desc")}
    >
      <div className="w-full max-w-5xl mx-auto p-1">
        <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <ScreenshotConfigs {...settings} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Screenshot;

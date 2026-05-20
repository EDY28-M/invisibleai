import { ScreenshotConfigs } from "./components";
import { useSettings, useTranslation } from "@/hooks";
import { PageLayout } from "@/layouts";

const Settings = () => {
  const settings = useSettings();
  const { t } = useTranslation();

  return (
    <PageLayout
      title={t("screenshot_title")}
      description={t("screenshot_desc")}
    >
      <section className="rounded-xl bg-card p-8 shadow-sm shadow-black/5">
        <ScreenshotConfigs {...settings} />
      </section>
    </PageLayout>
  );
};

export default Settings;

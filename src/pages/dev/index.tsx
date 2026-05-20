import { AIProviders, STTProviders } from "./components";
import { useSettings, useTranslation } from "@/hooks";
import { PageLayout } from "@/layouts";

const DevSpace = () => {
  const settings = useSettings();
  const { t } = useTranslation();

  return (
    <PageLayout title={t("dev_title")} description={t("dev_desc")}>
      <section className="rounded-xl bg-card p-6 shadow-sm shadow-black/5">
        <AIProviders {...settings} />
      </section>

      <section className="rounded-xl bg-card p-6 shadow-sm shadow-black/5">
        <STTProviders {...settings} />
      </section>
    </PageLayout>
  );
};

export default DevSpace;

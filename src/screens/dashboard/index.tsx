import { GetLicense } from "@/components";
import { InvisibleAIApiSetup } from "./components";
import { PageLayout } from "@/layouts";
import { useApp } from "@/contexts";
import { useTranslation } from "@/hooks";

const Dashboard = () => {
  const { hasActiveLicense } = useApp();
  const { t } = useTranslation();

  return (
    <PageLayout
      title={t("dashboard_title")}
      description={t("dashboard_description")}
      rightSlot={!hasActiveLicense ? <GetLicense /> : null}
    >
      <div className="space-y-5">
        <InvisibleAIApiSetup />
      </div>
    </PageLayout>
  );
};

export default Dashboard;

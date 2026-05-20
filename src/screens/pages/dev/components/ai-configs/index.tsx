import { Header } from "@/components";
import { UseSettingsReturn } from "@/types";
import { Providers } from "./Providers";
import { useTranslation } from "@/hooks";
import { CustomProviders } from "./CustomProvider";

export const AIProviders = (settings: UseSettingsReturn) => {
  const { t } = useTranslation();

  return (
    <div id="ai-providers" className="space-y-3">
      <Header
        title={t("dev_ai_title")}
        description={t("dev_ai_desc")}
      />

      <Providers {...settings} />
      <CustomProviders {...settings} />
    </div>
  );
};

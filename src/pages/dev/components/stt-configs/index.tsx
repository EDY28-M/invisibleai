import { Header } from "@/components";
import { UseSettingsReturn } from "@/types";
import { Providers } from "./Providers";
import { useTranslation } from "@/hooks";
import { CustomProviders } from "./CustomProvider";

export const STTProviders = (settings: UseSettingsReturn) => {
  const { t } = useTranslation();

  return (
    <div id="stt-providers" className="space-y-3">
      <Header
        title={t("dev_stt_title")}
        description={t("dev_stt_desc")}
      />

      <Providers {...settings} />
      <CustomProviders {...settings} />
    </div>
  );
};

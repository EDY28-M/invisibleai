import { AudioSelection } from "./components";
import { PageLayout } from "@/layouts";
import { useTranslation } from "@/hooks";

const Audio = () => {
  const { t } = useTranslation();

  return (
    <PageLayout
      title={t("audio_title")}
      description={t("audio_desc")}
    >
      <AudioSelection />
    </PageLayout>
  );
};

export default Audio;

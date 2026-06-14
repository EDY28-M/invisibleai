import { useApp } from "@/contexts";
import { useTranslation } from "@/hooks";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { PageLayout } from "@/layouts";
import { VoiceAgentPanel } from "./components/VoiceAgentPanel";
import { LicenseGate } from "./components/LicenseGate";

const VoiceAgent = () => {
  const { hasActiveLicense, selectedAudioDevices } = useApp();
  const { t } = useTranslation();
  const agent = useVoiceAgent(selectedAudioDevices?.input?.id || undefined);

  return (
    <PageLayout
      title={t("voice_agent_title")}
      description={t("voice_agent_desc")}
    >
      {!hasActiveLicense ? (
        <LicenseGate />
      ) : (
        <VoiceAgentPanel agent={agent} />
      )}
    </PageLayout>
  );
};

export default VoiceAgent;

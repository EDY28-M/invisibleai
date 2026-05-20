import { AudioSelection } from "./components";
import { PageLayout } from "@/layouts";
import { getPlatform } from "@/lib";
import { useTranslation } from "@/hooks";

const getOsInstructions = () => {
  const platform = getPlatform();

  switch (platform) {
    case "macos":
      return {
        mic: "System Preferences → Sound → Input",
        audio: "System Preferences → Sound → Output",
      };
    case "windows":
      return {
        mic: "Settings → System → Sound → Input",
        audio: "Settings → System → Sound → Output",
      };
    case "linux":
      return {
        mic: "Sound Settings → Input Devices",
        audio: "Sound Settings → Output Devices",
      };
    default:
      return {
        mic: "your system's sound settings",
        audio: "your system's sound settings",
      };
  }
};

const Audio = () => {
  const osInstructions = getOsInstructions();
  const { t } = useTranslation();

  return (
    <PageLayout
      title={t("audio_title")}
      description={t("audio_desc")}
    >
      <section className="rounded-xl bg-card p-6 shadow-sm shadow-black/5">
        <AudioSelection />
      </section>

      <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
        <p className="line-clamp-2">
          <strong>{t("audio_trouble_title")}</strong>{" "}
          {t("audio_trouble_desc")
            .replace("{mic}", osInstructions.mic)
            .replace("{audio}", osInstructions.audio)}
        </p>
      </div>
    </PageLayout>
  );
};

export default Audio;

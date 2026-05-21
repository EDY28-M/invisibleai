import { Card, Updater, DragButton, CustomCursor, Button } from "@/components";
import {
  SystemAudio,
  Completion,
  AudioVisualizer,
  StatusIndicator,
} from "./components";
import { useApp } from "@/hooks";
import { useApp as useAppContext } from "@/contexts";
import { SparklesIcon } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorLayout } from "@/layouts";
import { getPlatform } from "@/lib";
import { MicVadCapturer } from "./components/speech/MicVadCapturer";

const App = () => {
  const { isHidden, systemAudio } = useApp();
  const { customizable, selectedAudioDevices } = useAppContext();
  const platform = getPlatform();

  const openDashboard = async () => {
    try {
      await invoke("open_dashboard");
    } catch (error) {
      console.error("Failed to open dashboard:", error);
    }
  };

  return (
    <ErrorBoundary
      fallbackRender={() => {
        return <ErrorLayout isCompact />;
      }}
      resetKeys={["app-error"]}
      onReset={() => {
        console.log("Reset");
      }}
    >
      <div
        className={`w-screen h-screen flex overflow-hidden justify-center items-start ${isHidden ? "hidden pointer-events-none" : ""
          }`}
      >
        <Card className="w-full flex flex-row items-center gap-2 px-3 py-2 border border-black/5 dark:border-white/5 bg-card/40 dark:bg-card/30 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-[22px] transition-all duration-500">
          <SystemAudio {...systemAudio} />
          {systemAudio?.capturing && systemAudio?.isDualChannel && (
            <MicVadCapturer
              key={selectedAudioDevices?.input?.id || "default"}
              onSpeechTranscribed={systemAudio.handleMicSpeechDetected}
              onStreamActive={systemAudio.setMicStream}
              onError={systemAudio.setError}
              microphoneDeviceId={selectedAudioDevices?.input?.id}
              vadConfig={systemAudio.vadConfig}
            />
          )}
          {systemAudio?.capturing ? (
            <div className="flex flex-row items-center gap-2 justify-between w-full">
              <div className="flex flex-1 items-center gap-2">
                <AudioVisualizer
                  isRecording={systemAudio?.capturing}
                  stream={systemAudio?.micStream}
                />
              </div>
              <div className="flex !w-fit items-center gap-2">
                <StatusIndicator
                  setupRequired={systemAudio.setupRequired}
                  error={systemAudio.error}
                  isProcessing={systemAudio.isProcessing}
                  isAIProcessing={systemAudio.isAIProcessing}
                  capturing={systemAudio.capturing}
                />
              </div>
            </div>
          ) : null}

          <div
            className={`${systemAudio?.capturing
              ? "hidden w-full fade-out transition-all duration-300"
              : "w-full flex flex-row gap-2 items-center"
              }`}
          >
            <Completion isHidden={isHidden} />
            <Button
              size="icon"
              className="cursor-pointer h-9 w-9 rounded-[14px] border border-amber-500/10 dark:border-amber-400/5 bg-amber-500/5 dark:bg-amber-400/5 hover:bg-amber-500/15 dark:hover:bg-amber-400/15 text-amber-600 dark:text-amber-400 shadow-xs transition-all duration-300 hover:scale-105 active:scale-95 shrink-0"
              title="Open Dev Space"
              onClick={openDashboard}
            >
              <SparklesIcon className="h-4 w-4" />
            </Button>
          </div>

          <Updater />
          <DragButton />
        </Card>
        {customizable.cursor.type === "invisible" && platform !== "linux" ? (
          <CustomCursor />
        ) : null}
      </div>
    </ErrorBoundary>
  );
};

export default App;

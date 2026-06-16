import { Card, Updater, DragButton, CustomCursor, Button } from "@/components";
import {
  SystemAudio,
  Completion,
  AudioVisualizer,
  StatusIndicator,
} from "./components";
import { useApp } from "@/hooks";
import { useApp as useAppContext } from "@/contexts";
import { invoke } from "@tauri-apps/api/core";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorLayout } from "@/layouts";
import { getPlatform } from "@/lib";
import { MicVadCapturer } from "./components/speech/MicVadCapturer";
import { AppIcons } from "./components/icons/AppIcons";
import "./aurora-shell.css";

const App = () => {
  const { isHidden, systemAudio } = useApp();
  const { customizable, selectedAudioDevices } = useAppContext();
  const platform = getPlatform();

  const toggleDashboard = async () => {
    try {
      await invoke("toggle_dashboard");
    } catch (error) {
      console.error("Failed to toggle dashboard:", error);
    }
  };

  return (
    <ErrorBoundary
      fallbackRender={() => {
        return <ErrorLayout isCompact />;
      }}
      resetKeys={["app-error"]}
    >
      <div
        className={`aurora-shell w-screen h-screen flex overflow-hidden justify-center items-start ${isHidden ? "hidden pointer-events-none" : ""
          }`}
      >
        <Card className="aurora-window w-full flex flex-row items-center gap-2 px-3 py-2 backdrop-blur-2xl rounded-[22px] transition-all duration-500">
          <SystemAudio {...systemAudio} />
          {systemAudio?.capturing && systemAudio?.isDualChannel && !systemAudio?.isStreamingMode && (
            <MicVadCapturer
              key={selectedAudioDevices?.input?.id || "default"}
              onSpeechStart={systemAudio.handleMicSpeechStart}
              onSpeechEnd={systemAudio.handleMicSpeechDetected}
              onStreamActive={(stream) => {
                systemAudio.setMicStream(stream);
                if (systemAudio.isStreamingMode && systemAudio.initializeStreaming && stream) {
                  systemAudio.initializeStreaming(stream);
                }
              }}
              onError={systemAudio.setError}
              microphoneDeviceId={selectedAudioDevices?.input?.id}
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

          {!systemAudio?.capturing ? (
            <div className="w-full flex flex-row gap-2 items-center">
              <Completion isHidden={isHidden} />
            </div>
          ) : null}

          <Button
            size="icon"
            className="au-iconbtn cursor-pointer h-9 w-9 rounded-[14px] border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground/60 hover:text-foreground shadow-xs transition-all duration-300 hover:scale-105 active:scale-95 shrink-0"
            title="Toggle dashboard"
            onClick={toggleDashboard}
          >
            <AppIcons.BrainToggle className="h-4 w-4" strokeWidth={1.7} />
          </Button>
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

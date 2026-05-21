import { Card, Updater, DragButton, CustomCursor, Button } from "@/components";
import {
  SystemAudio,
  Completion,
  AudioVisualizer,
  StatusIndicator,
} from "./components";
import { useApp } from "@/hooks";
import { useApp as useAppContext } from "@/contexts";
import { SparklesIcon, StopCircleIcon, Loader2 } from "lucide-react";
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
          {(systemAudio?.capturing || systemAudio?.isFinalizingCapture) && systemAudio?.isDualChannel && (
            <MicVadCapturer
              key={`${selectedAudioDevices?.input?.id || "default"}-${systemAudio.captureSegmentId}`}
              onSpeechTranscribed={systemAudio.handleMicSpeechDetected}
              onStreamActive={systemAudio.setMicStream}
              onError={systemAudio.setError}
              onSpeechStart={systemAudio.pausePendingTranscriptionCommit}
              onSpeechProcessingStart={systemAudio.beginPendingSpeechTranscription}
              onSpeechProcessingEnd={systemAudio.endPendingSpeechTranscription}
              microphoneDeviceId={selectedAudioDevices?.input?.id}
              vadConfig={systemAudio.vadConfig}
              finishSignal={systemAudio.micVadFinishSignal}
            />
          )}
          {(systemAudio?.capturing || systemAudio?.isFinalizingCapture || systemAudio?.isPopoverOpen) ? (
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
                {systemAudio?.isDualChannel && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={systemAudio.stopCaptureAndSend}
                    disabled={systemAudio.isFinalizingCapture || systemAudio.isAIProcessing}
                    className="h-8 rounded-[12px] px-3 border border-red-500/15 bg-red-500/5 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 shadow-xs transition-all duration-300 active:scale-95"
                    title="Stop Multihilo capture and send captured audio"
                    aria-label="Stop Multihilo capture and send captured audio"
                  >
                    {systemAudio.isFinalizingCapture ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="text-[11px] font-semibold">Sending...</span>
                      </>
                    ) : (
                      <>
                        <StopCircleIcon className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-semibold">Stop & Send</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          <div
            className={`${(systemAudio?.capturing || systemAudio?.isFinalizingCapture || systemAudio?.isPopoverOpen)
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

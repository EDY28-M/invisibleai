import { Button } from "@/components";
import { MicIcon, StopCircleIcon, XIcon, Loader2 } from "lucide-react";

interface RecordingPanelProps {
  isVadMode: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  isAIProcessing: boolean;
  recordingProgress: number;
  maxDuration: number;
  onStartRecording: () => void;
  onStopAndSend: () => void;
  onIgnore: () => void;
}

export const RecordingPanel = ({
  isVadMode,
  isRecording,
  isProcessing,
  isAIProcessing,
  recordingProgress,
  maxDuration,
  onStartRecording,
  onStopAndSend,
  onIgnore,
}: RecordingPanelProps) => {
  const isWorking = isProcessing || isAIProcessing;

  return (
    <div className="rounded-[18px] border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 overflow-hidden shadow-inner">
      {}
      {!isVadMode && (
        <div className="p-3.5 space-y-3">
          {}
          {isWorking && (
            <div className="flex items-center justify-end gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">
                {isProcessing ? "Transcribing..." : "Generating..."}
              </span>
            </div>
          )}

          {}
          {!isWorking && (
            <>
              <div className="flex gap-2">
                {!isRecording ? (
                  <Button
                    onClick={onStartRecording}
                    className="flex-1 gap-1.5 h-9 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold shadow-xs transition-all cursor-pointer"
                    size="sm"
                  >
                    <MicIcon className="w-3.5 h-3.5" />
                    Start Recording
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={onIgnore}
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-1 h-9 rounded-xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 text-muted-foreground font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <XIcon className="w-3 h-3" />
                      Discard
                    </Button>
                    <Button
                      onClick={onStopAndSend}
                      size="sm"
                      className="flex-1 gap-1 h-9 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <StopCircleIcon className="w-3 h-3" />
                      Stop & Send
                    </Button>
                  </>
                )}
              </div>

              {}
              {isRecording && (
                <div className="space-y-1">
                  <div className="w-full bg-muted rounded-full h-1">
                    <div
                      className="bg-red-500 h-1 rounded-full transition-all duration-500"
                      style={{
                        width: `${(recordingProgress / maxDuration) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Recording {recordingProgress}s
                    </span>
                    <span>{maxDuration}s max</span>
                  </div>
                </div>
              )}

              {}
              <div className="flex justify-end gap-3 text-[8px] text-muted-foreground/60">
                {!isRecording ? (
                  <span>
                    <kbd className="px-1 py-0.5 rounded bg-muted font-mono">
                      Space
                    </kbd>{" "}
                    /{" "}
                    <kbd className="px-1 py-0.5 rounded bg-muted font-mono">
                      Enter
                    </kbd>{" "}
                    start
                  </span>
                ) : (
                  <>
                    <span>
                      <kbd className="px-1 py-0.5 rounded bg-muted font-mono">
                        Enter
                      </kbd>{" "}
                      send
                    </span>
                    <span>
                      <kbd className="px-1 py-0.5 rounded bg-muted font-mono">
                        Esc
                      </kbd>{" "}
                      discard
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

import { useState, useCallback, useEffect } from "react";
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  ScrollArea,
} from "@/components";
import {
  HeadphonesIcon,
  AlertCircleIcon,
  LoaderIcon,
  AudioLinesIcon,
  CameraIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ModeSwitcher } from "./ModeSwitcher";
import { RecordingPanel } from "./RecordingPanel";
import { ResultsSection } from "./ResultsSection";
import { SettingsPanel } from "./SettingsPanel";
import { PermissionFlow } from "./PermissionFlow";
import { QuickActions } from "./QuickActions";
import { Warning } from "./Warning";
import { useSystemAudioType } from "@/hooks";
import { useApp } from "@/contexts";
import { cn } from "@/lib/utils";
import {
  getScreenCaptureErrorMessage,
  requestScreenRecordingPermissionIfNeeded,
} from "@/lib/screen-capture-permission";

export const SystemAudio = (props: useSystemAudioType) => {
  const {
    capturing,
    isProcessing,
    isAIProcessing,
    lastTranscription,
    lastAIResponse,
    error,
    setupRequired,
    startCapture,
    stopCapture,
    isPopoverOpen,
    setIsPopoverOpen,
    useSystemPrompt,
    setUseSystemPrompt,
    contextContent,
    setContextContent,
    startNewConversation,
    conversation,
    resizeWindow,
    quickActions,
    addQuickAction,
    removeQuickAction,
    isManagingQuickActions,
    setIsManagingQuickActions,
    showQuickActions,
    setShowQuickActions,
    handleQuickActionClick,
    vadConfig,
    updateVadConfiguration,
    isRecordingInContinuousMode,
    recordingProgress,
    manualStopAndSend,
    startContinuousRecording,
    ignoreContinuousRecording,
    scrollAreaRef,
    isDualChannel,
    setIsDualChannel,
    useConversationalMemory,
    setUseConversationalMemory,
  } = props;

  const { hasActiveLicense, supportsImages } = useApp();

  const [conversationMode, setConversationMode] = useState(false);

  const [screenshotImage, setScreenshotImage] = useState<string | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);

  const isVadMode = vadConfig.enabled;
  const hasResponse = lastAIResponse || isAIProcessing;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPopoverOpen) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setConversationMode((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPopoverOpen]);

  useEffect(() => {
    if (isProcessing && screenshotImage) {
      setScreenshotImage(null);
    }
  }, [isProcessing, screenshotImage]);

  const handleToggleCapture = async () => {
    if (capturing) {
      await stopCapture();
    } else {
      await startCapture();
    }
  };

  const handleModeChange = (vadEnabled: boolean, dualChannelEnabled: boolean) => {
    updateVadConfiguration({
      ...vadConfig,
      enabled: vadEnabled,
    });
    setIsDualChannel(dualChannelEnabled);
  };

  const handleCaptureScreenshot = useCallback(async () => {
    if (isCapturingScreenshot) return;

    setIsCapturingScreenshot(true);
    try {
      await requestScreenRecordingPermissionIfNeeded();

      const base64: string = await invoke("capture_to_base64");

      setScreenshotImage(base64);
    } catch (err) {
      console.error(await getScreenCaptureErrorMessage(err), err);
    } finally {
      setIsCapturingScreenshot(false);
    }
  }, [isCapturingScreenshot]);

  const handleRemoveScreenshot = useCallback(() => {
    setScreenshotImage(null);
  }, []);

  const getButtonIcon = () => {
    if (setupRequired) return <AlertCircleIcon className="text-orange-500" />;
    if (error && !setupRequired)
      return <AlertCircleIcon className="text-red-500" />;
    if (isProcessing) return <LoaderIcon className="animate-spin text-foreground/70" />;
    if (capturing)
      return <AudioLinesIcon className="text-emerald-500 dark:text-emerald-400 animate-pulse" />;
    return <HeadphonesIcon className="h-4.5 w-4.5" />;
  };

  const getButtonTitle = () => {
    if (setupRequired) return "Setup required - Click for instructions";
    if (error && !setupRequired) return `Error: ${error}`;
    if (isProcessing) return "Transcribing audio...";
    if (capturing) return "Stop system audio capture";
    return "Start system audio capture";
  };

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={(open) => {
        if (capturing && !open) {
          return;
        }
        setIsPopoverOpen(open);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={getButtonTitle()}
          onClick={handleToggleCapture}
          className={cn(
            "cursor-pointer h-9 w-9 rounded-[14px] transition-all duration-300 border border-transparent hover:scale-105 active:scale-95 shrink-0",
            capturing
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
              : error
                ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/5 dark:hover:border-white/5 text-foreground/80 hover:text-foreground"
          )}
        >
          {getButtonIcon()}
        </Button>
      </PopoverTrigger>

      {(capturing || setupRequired || error) && (
        <PopoverContent
          align="end"
          side="bottom"
          className="select-none w-screen p-0 border border-black/5 dark:border-white/10 bg-card/85 dark:bg-card/75 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden"
          sideOffset={8}
        >
          <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
            { }
            <div className="flex-shrink-0 p-3.5 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between gap-2">
                { }
                {!setupRequired && (
                  <ModeSwitcher
                    isVadMode={isVadMode}
                    isDualChannel={isDualChannel}
                    onModeChange={handleModeChange}
                    disabled={
                      isRecordingInContinuousMode ||
                      isProcessing ||
                      isAIProcessing
                    }
                  />
                )}
                {setupRequired && (
                  <h2 className="font-semibold text-sm">Setup Required</h2>
                )}

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Screenshot Capture Button */}
                  {hasActiveLicense && !setupRequired && supportsImages && (
                    <Button
                      size="sm"
                      onClick={handleCaptureScreenshot}
                      disabled={isCapturingScreenshot}
                      className={cn(
                        "h-9 rounded-[12px] text-[10px] font-black tracking-widest uppercase transition-all duration-300 flex items-center gap-1.5 px-3 select-none active:scale-95 border cursor-pointer",
                        screenshotImage
                          ? "bg-gradient-to-b from-sky-500 to-sky-600 border-sky-400/30 text-white shadow-[0_4px_16px_rgba(14,165,233,0.22)]"
                          : "bg-neutral-200/40 dark:bg-neutral-800/40 text-muted-foreground/90 hover:text-foreground hover:bg-neutral-200/80 dark:hover:bg-neutral-800/80 border-black/5 dark:border-white/5 shadow-xs"
                      )}
                      title="Capture screenshot to include with transcription"
                    >
                      {isCapturingScreenshot ? (
                        <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CameraIcon className={cn("w-3.5 h-3.5", screenshotImage ? "text-white" : "text-sky-500/80")} />
                      )}
                      Screenshot
                    </Button>
                  )}

                  {/* Start New Conversation Button */}
                  {!setupRequired && (
                    <Button
                      size="sm"
                      onClick={startNewConversation}
                      className="h-9 rounded-[12px] text-[10px] font-black tracking-widest uppercase bg-neutral-200/40 dark:bg-neutral-800/40 text-muted-foreground/90 hover:text-foreground hover:bg-neutral-200/80 dark:hover:bg-neutral-800/80 border border-black/5 dark:border-white/5 shadow-xs transition-all duration-300 flex items-center gap-1.5 px-3 select-none active:scale-95 cursor-pointer"
                      title="Start a new conversation"
                    >
                      <PlusIcon className="w-3.5 h-3.5 text-emerald-500/80" />
                      New
                    </Button>
                  )}

                  {/* Close Popover Button */}
                  {!capturing && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded-full bg-neutral-200/40 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5 text-muted-foreground hover:text-foreground hover:bg-neutral-200/80 dark:hover:bg-neutral-800/80 transition-all duration-300 active:scale-90 flex items-center justify-center cursor-pointer shrink-0"
                      title="Close"
                      onClick={() => {
                        setIsPopoverOpen(false);
                        resizeWindow(false);
                      }}
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
              <div className="p-2 space-y-2">
                { }
                {screenshotImage && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <img
                      src={`data:image/png;base64,${screenshotImage}`}
                      alt="Screenshot"
                      className="h-12 w-20 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium">
                        Screenshot attached
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Will be sent with next transcription
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={handleRemoveScreenshot}
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                { }
                {error && !setupRequired && (
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/15 backdrop-blur-md shadow-[0_4px_20px_rgba(239,68,68,0.06)] animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-1 rounded-lg bg-red-500/10 dark:bg-red-500/20 text-red-500 flex-shrink-0 mt-0.5">
                      <AlertCircleIcon className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                        System Alert
                      </p>
                      <p className="text-[11px] text-red-500/90 dark:text-red-400/90 leading-relaxed font-medium mt-0.5">{error}</p>
                    </div>
                  </div>
                )}

                { }
                {setupRequired ? (
                  <PermissionFlow
                    onPermissionGranted={() => {
                      startCapture();
                    }}
                    onPermissionDenied={() => {

                    }}
                  />
                ) : (
                  <>
                    { }
                    <RecordingPanel
                      isVadMode={isVadMode}
                      isRecording={isRecordingInContinuousMode}
                      isProcessing={isProcessing}
                      isAIProcessing={isAIProcessing}
                      recordingProgress={recordingProgress}
                      maxDuration={vadConfig.max_recording_duration_secs}
                      onStartRecording={startContinuousRecording}
                      onStopAndSend={manualStopAndSend}
                      onIgnore={ignoreContinuousRecording}
                    />

                    { }
                    <ResultsSection
                      lastTranscription={lastTranscription}
                      lastAIResponse={lastAIResponse}
                      isAIProcessing={isAIProcessing}
                      conversation={conversation}
                      conversationMode={conversationMode}
                      setConversationMode={setConversationMode}
                    />

                    { }
                    <SettingsPanel
                      vadConfig={vadConfig}
                      onUpdateVadConfig={updateVadConfiguration}
                      useSystemPrompt={useSystemPrompt}
                      setUseSystemPrompt={setUseSystemPrompt}
                      contextContent={contextContent}
                      setContextContent={setContextContent}
                      useConversationalMemory={useConversationalMemory}
                      setUseConversationalMemory={setUseConversationalMemory}
                    />

                    { }
                    <Warning isVadMode={isVadMode} />
                  </>
                )}
              </div>
            </ScrollArea>

            { }
            {!setupRequired && hasResponse && (
              <div className="flex-shrink-0 border-t border-border/50 p-2">
                <QuickActions
                  actions={quickActions}
                  onActionClick={handleQuickActionClick}
                  onAddAction={addQuickAction}
                  onRemoveAction={removeQuickAction}
                  isManaging={isManagingQuickActions}
                  setIsManaging={setIsManagingQuickActions}
                  show={showQuickActions}
                  setShow={setShowQuickActions}
                />
              </div>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};

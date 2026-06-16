import { useState, useEffect, useRef } from "react";
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  ScrollArea,
} from "@/components";
import { invoke } from "@tauri-apps/api/core";
import { ModeSwitcher } from "./ModeSwitcher";
import { RecordingPanel } from "./RecordingPanel";
import { ResultsSection } from "./ResultsSection";
import { SettingsPanel } from "./SettingsPanel";
import { PermissionFlow } from "./PermissionFlow";
import { QuickActions } from "./QuickActions";
import { useSystemAudioType } from "@/hooks";
import { useApp, useUsage } from "@/contexts";
import { cn } from "@/lib/utils";
import { AppIcons } from "../icons/AppIcons";

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
    isStreamingMode,
    streamingSmartMode,
    setStreamingSmartMode,
    interimTranscription,
    systemInterimTranscription,
    screenshotImage,
    isCapturingScreenshot,
    accumulatedSystemText,
    handleCaptureScreenshot,
    handleRemoveScreenshot,
  } = props;

  const { hasActiveLicense, supportsImages } = useApp();
  const { usageBalance } = useUsage();

  const [conversationMode, setConversationMode] = useState(false);
  // Guard de re-entrada SÍNCRONO. Antes era un useState que mantenía el botón
  // `disabled` durante todo el await de updateVadConfiguration (que hace IPC a
  // Rust para parar la captura) → el botón se "congelaba" varios cientos de ms.
  // Con un ref evitamos doble disparo sin bloquear visualmente el control.
  const isSwitchingModeRef = useRef(false);

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

  const handleToggleCapture = async () => {
    if (capturing) {
      await stopCapture();
    } else {
      await startCapture();
    }
  };

  const handleModeChange = async (vadEnabled: boolean, dualChannelEnabled: boolean) => {
    if (isSwitchingModeRef.current) return;
    isSwitchingModeRef.current = true;

    // Optimista: refleja el canal en la UI de inmediato para que el cambio se
    // sienta instantáneo. La reconfiguración (IPC a Rust) ocurre en segundo
    // plano sin congelar el botón.
    setIsDualChannel(dualChannelEnabled);

    try {
      await updateVadConfiguration({ ...vadConfig, enabled: vadEnabled }, dualChannelEnabled);
    } catch (error) {
      console.error("Failed to switch STT mode:", error);
    } finally {
      isSwitchingModeRef.current = false;
    }
  };

  const getButtonIcon = () => {
    if (setupRequired) return <AppIcons.Warning className="text-orange-500" strokeWidth={1.7} />;
    if (error && !setupRequired)
      return <AppIcons.Warning className="text-red-500" strokeWidth={1.7} />;
    if (isProcessing) return <AppIcons.Loader className="animate-spin text-foreground/70" strokeWidth={1.7} />;
    if (capturing)
      return <AppIcons.Activity className="text-zinc-700 dark:text-zinc-300 animate-pulse" strokeWidth={1.7} />;
    return <AppIcons.SystemAudio className="h-4.5 w-4.5" strokeWidth={1.7} />;
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
              ? "bg-black/[0.06] dark:bg-white/[0.08] border-black/[0.08] dark:border-white/[0.10] text-zinc-800 dark:text-zinc-200 shadow-[0_0_10px_rgba(0,0,0,0.06)]"
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
            <div className="flex-shrink-0 px-4 py-3 border-b border-black/5 dark:border-white/5">
              <div className="flex flex-nowrap items-center justify-between gap-1.5">
                { }
                {!setupRequired && (
                  <ModeSwitcher
                    isVadMode={isVadMode}
                    isDualChannel={isDualChannel}
                    isStreamingMode={isStreamingMode}
                    streamingSmartMode={streamingSmartMode}
                    onModeChange={handleModeChange}
                    onStreamingSmartModeChange={setStreamingSmartMode}
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
                {!setupRequired && hasActiveLicense && usageBalance && (
                  <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 select-none cursor-default transition-all duration-300 shrink" title={`Streaming Credits: ${usageBalance.streaming.credits.toLocaleString()} / ${usageBalance.streaming.maxCredits.toLocaleString()}`}>
                    <span>🪙</span>
                    <span className="tabular-nums">{usageBalance.streaming.credits.toLocaleString()}</span>
                  </div>
                )}

                <div className="ml-auto flex items-center gap-1.5 flex-shrink-0 max-w-full">
                  {/* Screenshot Capture Button — visible si el modelo soporta
                      visión (supportsImages); free ahora usa scout con visión.
                      El modo Selección sigue siendo premium (gate en el handler). */}
                  {!setupRequired && supportsImages && (
                    <Button
                      size="sm"
                      onClick={handleCaptureScreenshot}
                      disabled={isCapturingScreenshot}
                      className={cn(
                        "h-9 rounded-[12px] text-[10px] font-black tracking-widest uppercase transition-all duration-300 flex items-center gap-1.5 px-3 max-[640px]:px-2 select-none active:scale-95 border cursor-pointer",
                        screenshotImage
                          ? "bg-gradient-to-b from-sky-500 to-sky-600 border-sky-400/30 text-white shadow-[0_4px_16px_rgba(14,165,233,0.22)]"
                          : "bg-neutral-200/40 dark:bg-neutral-800/40 text-muted-foreground/90 hover:text-foreground hover:bg-neutral-200/80 dark:hover:bg-neutral-800/80 border-black/5 dark:border-white/5 shadow-xs"
                      )}
                      title="Capture screenshot to include with transcription"
                    >
                      {isCapturingScreenshot ? (
                        <AppIcons.Loader className="w-3.5 h-3.5 animate-spin" strokeWidth={1.7} />
                      ) : (
                        <AppIcons.Camera className={cn("w-3.5 h-3.5", screenshotImage ? "text-white" : "text-sky-500/80")} strokeWidth={1.7} />
                      )}
                    </Button>
                  )}

                  {/* Start New Conversation Button */}
                  {!setupRequired && (
                    <Button
                      size="sm"
                      onClick={startNewConversation}
                      className="h-9 rounded-[12px] text-[10px] font-black tracking-widest uppercase bg-neutral-200/40 dark:bg-neutral-800/40 text-muted-foreground/90 hover:text-foreground hover:bg-neutral-200/80 dark:hover:bg-neutral-800/80 border border-black/5 dark:border-white/5 shadow-xs transition-all duration-300 flex items-center gap-1.5 px-3 max-[640px]:px-2 select-none active:scale-95 cursor-pointer"
                      title="Start a new conversation"
                    >
                      <AppIcons.New className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" strokeWidth={1.8} />
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
                      <AppIcons.Close className="h-3.5 w-3.5" strokeWidth={1.8} />
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
                      <AppIcons.Close className="h-3 w-3" strokeWidth={1.8} />
                    </Button>
                  </div>
                )}

                { }
                {error && !setupRequired && (
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/15 backdrop-blur-md shadow-[0_4px_20px_rgba(239,68,68,0.06)] animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-1 rounded-lg bg-red-500/10 dark:bg-red-500/20 text-red-500 flex-shrink-0 mt-0.5">
                      <AppIcons.Warning className="w-3.5 h-3.5 animate-pulse" strokeWidth={1.7} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                        System Alert
                      </p>
                      <p className="text-[11px] text-red-500/90 dark:text-red-400/90 leading-relaxed font-medium mt-0.5">{error}</p>
                      {error.toLowerCase().includes("speech provider") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await invoke("open_dashboard");
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="mt-2.5 h-7.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 border border-black/10 dark:border-white/10 shadow-xs cursor-pointer active:scale-95 transition-all duration-200"
                        >
                          Open Dev Space Settings
                        </Button>
                      )}
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
                      interimTranscription={interimTranscription}
                      systemInterimTranscription={systemInterimTranscription}
                      isStreamingMode={isStreamingMode}
                      accumulatedSystemText={accumulatedSystemText}
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
                      isStreamingMode={isStreamingMode}
                      hasActiveLicense={hasActiveLicense}
                    />
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

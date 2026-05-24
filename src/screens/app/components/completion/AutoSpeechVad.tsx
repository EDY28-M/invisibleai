import { Button } from "@/components";
import { useApp } from "@/contexts";
import { DeepgramStreamManager, fetchSTT, getMicrophoneStream } from "@/lib";
import { floatArrayToWav } from "@/lib/utils";
import { UseCompletionReturn } from "@/types";
import { MicVAD } from "@ricky0123/vad-web";
import { useEffect, useRef, useState } from "react";
import { AppIcons } from "../icons/AppIcons";

interface AutoSpeechVADProps {
  submit: UseCompletionReturn["submit"];
  setState: UseCompletionReturn["setState"];
  setEnableVAD: UseCompletionReturn["setEnableVAD"];
  microphoneDeviceId?: string;
}

const STREAMING_MIC_DISPATCH_IDLE_MS = 1000;

const mergeStreamingTranscriptText = (currentText: string, nextText: string) => {
  const current = currentText.trim();
  const next = nextText.trim();

  if (!current) return next;
  if (!next || current === next || current.endsWith(next)) return current;
  if (next.startsWith(current)) return next;

  return `${current} ${next}`;
};

const AutoSpeechVADInternal = ({
  submit,
  setState,
  setEnableVAD,
  microphoneDeviceId,
}: AutoSpeechVADProps) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState<string | false>(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const { selectedSttProvider, allSttProviders, invisibleaiApiEnabled } =
    useApp();
  const vadRef = useRef<MicVAD | null>(null);
  const streamingManagerRef = useRef<DeepgramStreamManager | null>(null);
  const streamingDispatchTimerRef = useRef<number | null>(null);
  const streamingSpeakingTimerRef = useRef<number | null>(null);
  const streamingPendingTextRef = useRef("");
  const lastStreamingAudioAtRef = useRef(0);
  const callbacksRef = useRef({ submit, setState });
  const sttConfigRef = useRef({
    selectedSttProvider,
    allSttProviders,
    invisibleaiApiEnabled,
  });

  useEffect(() => {
    callbacksRef.current = { submit, setState };
  }, [submit, setState]);

  useEffect(() => {
    sttConfigRef.current = {
      selectedSttProvider,
      allSttProviders,
      invisibleaiApiEnabled,
    };
  }, [selectedSttProvider, allSttProviders, invisibleaiApiEnabled]);

  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;

    const clearStreamingDispatchTimer = () => {
      if (streamingDispatchTimerRef.current !== null) {
        window.clearTimeout(streamingDispatchTimerRef.current);
        streamingDispatchTimerRef.current = null;
      }
    };

    const clearStreamingSpeakingTimer = () => {
      if (streamingSpeakingTimerRef.current !== null) {
        window.clearTimeout(streamingSpeakingTimerRef.current);
        streamingSpeakingTimerRef.current = null;
      }
    };

    const flushStreamingPendingTranscript = () => {
      clearStreamingDispatchTimer();

      const finalText = streamingPendingTextRef.current.trim();
      streamingPendingTextRef.current = "";

      if (!active || !finalText) {
        return;
      }

      const idleForMs = Date.now() - lastStreamingAudioAtRef.current;
      if (
        lastStreamingAudioAtRef.current > 0 &&
        idleForMs < STREAMING_MIC_DISPATCH_IDLE_MS
      ) {
        const delay = Math.max(50, STREAMING_MIC_DISPATCH_IDLE_MS - idleForMs);
        streamingPendingTextRef.current = finalText;
        streamingDispatchTimerRef.current = window.setTimeout(
          flushStreamingPendingTranscript,
          delay
        );
        return;
      }

      setIsTranscribing(false);
      callbacksRef.current.setState((prev: any) => ({
        ...prev,
        input: finalText,
        error: null,
      }));
      callbacksRef.current.submit(finalText);
    };

    const scheduleStreamingDispatch = () => {
      clearStreamingDispatchTimer();
      streamingDispatchTimerRef.current = window.setTimeout(
        flushStreamingPendingTranscript,
        STREAMING_MIC_DISPATCH_IDLE_MS
      );
    };

    const markStreamingAudioActivity = () => {
      lastStreamingAudioAtRef.current = Date.now();
      setUserSpeaking(true);
      clearStreamingSpeakingTimer();
      streamingSpeakingTimerRef.current = window.setTimeout(() => {
        if (active) {
          setUserSpeaking(false);
        }
      }, 350);

      if (streamingPendingTextRef.current.trim()) {
        scheduleStreamingDispatch();
      }
    };

    const queueStreamingTranscript = (text: string) => {
      const trimmedText = text.trim();
      if (!active || !trimmedText) {
        return;
      }

      streamingPendingTextRef.current = mergeStreamingTranscriptText(
        streamingPendingTextRef.current,
        trimmedText
      );
      scheduleStreamingDispatch();
    };

    const handleSpeechEnd = async (audio: Float32Array) => {
      try {
        const audioBlob = floatArrayToWav(audio, 16000, "wav");
        const {
          selectedSttProvider,
          allSttProviders,
          invisibleaiApiEnabled,
        } = sttConfigRef.current;
        const useInvisibleAIAPI = invisibleaiApiEnabled;

        if (!selectedSttProvider.provider && !useInvisibleAIAPI) {
          console.warn("No speech provider selected");
          callbacksRef.current.setState((prev: any) => ({
            ...prev,
            error:
              "No speech provider selected. Please select one in settings.",
          }));
          return;
        }

        const providerConfig = allSttProviders.find(
          (p) => p.id === selectedSttProvider.provider
        );

        if (!providerConfig && !useInvisibleAIAPI) {
          console.warn("Selected speech provider configuration not found");
          callbacksRef.current.setState((prev: any) => ({
            ...prev,
            error:
              "Speech provider configuration not found. Please check your settings.",
          }));
          return;
        }

        setIsTranscribing(true);

        const transcription = await fetchSTT({
          provider: useInvisibleAIAPI ? undefined : providerConfig,
          selectedProvider: selectedSttProvider,
          audio: audioBlob,
          useInvisibleAIAPI,
        });

        if (transcription) {
          callbacksRef.current.submit(transcription);
        }
      } catch (error) {
        console.error("Failed to transcribe audio:", error);
        callbacksRef.current.setState((prev: any) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Transcription failed",
        }));
      } finally {
        setIsTranscribing(false);
      }
    };

    const setupVad = async () => {
      try {
        setLoading(true);
        setErrored(false);
        setUserSpeaking(false);
        streamingPendingTextRef.current = "";
        lastStreamingAudioAtRef.current = 0;
        clearStreamingDispatchTimer();
        clearStreamingSpeakingTimer();

        const {
          selectedSttProvider,
          allSttProviders,
          invisibleaiApiEnabled,
        } = sttConfigRef.current;
        const providerConfig = allSttProviders.find(
          (p) => p.id === selectedSttProvider.provider
        );
        const useStreamingProvider =
          !invisibleaiApiEnabled && providerConfig?.streaming === true;

        stream = await getMicrophoneStream(microphoneDeviceId);

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (useStreamingProvider) {
          const vars = selectedSttProvider.variables || {};
          const apiKey = vars.api_key || vars.API_KEY || "";

          if (!apiKey) {
            throw new Error("Deepgram Streaming requires an API Key.");
          }

          const streamingManager = new DeepgramStreamManager(
            {
              apiKey,
              model: vars.model || vars.MODEL || "nova-3",
              language: vars.language || vars.LANGUAGE || "es-419",
              utteranceEndMs: 1000,
              endpointing: 10,
            },
            {
              onTranscript: (_text, _isFinal, fullAccumulated) => {
                if (!active) return;
                callbacksRef.current.setState((prev: any) => ({
                  ...prev,
                  input: fullAccumulated,
                  error: null,
                }));
              },
              onUtteranceEnd: (finalText) => {
                queueStreamingTranscript(finalText);
              },
              onAudioActivity: () => {
                markStreamingAudioActivity();
              },
              onError: (error) => {
                if (!active) return;
                callbacksRef.current.setState((prev: any) => ({
                  ...prev,
                  error: error.message,
                }));
              },
            }
          );

          streamingManagerRef.current = streamingManager;
          await streamingManager.start(stream);

          if (!active) {
            streamingManager.destroy();
            return;
          }

          setListening(true);
          setLoading(false);
          return;
        }

        const vad = await MicVAD.new({
          stream,
          onFrameProcessed: (probabilities: { isSpeech: number }) => {
            if (active) {
              setUserSpeaking(probabilities.isSpeech > 0.6);
            }
          },
          onSpeechEnd: handleSpeechEnd,
        });

        if (!active) {
          vad.destroy();
          return;
        }

        vadRef.current = vad;
        vad.start();
        setListening(true);
        setLoading(false);
      } catch (error) {
        if (!active) {
          stream?.getTracks().forEach((track) => track.stop());
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : "Microphone VAD failed";
        console.error("Failed to initialize microphone VAD:", error);
        setErrored(errorMessage);
        setListening(false);
        setLoading(false);
        setEnableVAD(false);
      }
    };

    setupVad();

    return () => {
      active = false;
      vadRef.current?.destroy();
      vadRef.current = null;
      streamingManagerRef.current?.destroy();
      streamingManagerRef.current = null;
      clearStreamingDispatchTimer();
      clearStreamingSpeakingTimer();
      streamingPendingTextRef.current = "";
      lastStreamingAudioAtRef.current = 0;
      stream?.getTracks().forEach((track) => track.stop());
      setListening(false);
      setUserSpeaking(false);
    };
  }, [microphoneDeviceId, setEnableVAD]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          if (listening) {
            vadRef.current?.pause();
            setListening(false);
            setEnableVAD(false);
          } else {
            vadRef.current?.start();
            setListening(true);
            setEnableVAD(true);
          }
        }}
        className={`cursor-pointer h-9 w-9 rounded-[14px] transition-all duration-300 border border-transparent hover:scale-105 active:scale-95 shrink-0 ${listening
          ? userSpeaking
            ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.12)]"
            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
          : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/5 dark:hover:border-white/5 text-foreground/80 hover:text-foreground"
          }`}
        title={
          errored
            ? errored
            : isTranscribing
              ? "Transcribing..."
              : listening
                ? userSpeaking
                  ? "Speaking..."
                  : "Listening (Click to pause)"
                : "Start listening"
        }
      >
        {loading || isTranscribing ? (
          <AppIcons.Loader className="h-4.5 w-4.5 animate-spin text-emerald-500" strokeWidth={1.7} />
        ) : userSpeaking ? (
          <AppIcons.MicSpeaking className="h-4.5 w-4.5 text-amber-500" strokeWidth={1.7} />
        ) : listening ? (
          <AppIcons.MicMuted className="h-4.5 w-4.5 animate-pulse text-emerald-600 dark:text-emerald-400" strokeWidth={1.7} />
        ) : (
          <AppIcons.Mic className="h-4.5 w-4.5" strokeWidth={1.7} />
        )}
      </Button>
    </>
  );
};

export const AutoSpeechVAD = (props: AutoSpeechVADProps) => {
  return <AutoSpeechVADInternal key={props.microphoneDeviceId} {...props} />;
};

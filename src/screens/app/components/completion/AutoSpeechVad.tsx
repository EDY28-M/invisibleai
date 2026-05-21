import { Button } from "@/components";
import { useApp } from "@/contexts";
import { fetchSTT, getMicrophoneStream } from "@/lib";
import { floatArrayToWav } from "@/lib/utils";
import { UseCompletionReturn } from "@/types";
import { MicVAD } from "@ricky0123/vad-web";
import { LoaderCircleIcon, MicIcon, MicOffIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AutoSpeechVADProps {
  submit: UseCompletionReturn["submit"];
  setState: UseCompletionReturn["setState"];
  setEnableVAD: UseCompletionReturn["setEnableVAD"];
  microphoneDeviceId?: string;
}

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

        stream = await getMicrophoneStream(microphoneDeviceId);

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
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
        className={`cursor-pointer h-9 w-9 rounded-[14px] transition-all duration-300 border border-transparent hover:scale-105 active:scale-95 shrink-0 ${
          listening
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
          <LoaderCircleIcon className="h-4.5 w-4.5 animate-spin text-emerald-500" />
        ) : userSpeaking ? (
          <LoaderCircleIcon className="h-4.5 w-4.5 animate-spin text-amber-500" />
        ) : listening ? (
          <MicOffIcon className="h-4.5 w-4.5 animate-pulse text-emerald-600 dark:text-emerald-400" />
        ) : (
          <MicIcon className="h-4.5 w-4.5" />
        )}
      </Button>
    </>
  );
};

export const AutoSpeechVAD = (props: AutoSpeechVADProps) => {
  return <AutoSpeechVADInternal key={props.microphoneDeviceId} {...props} />;
};

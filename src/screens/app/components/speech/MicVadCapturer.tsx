import { useEffect, useRef } from "react";
import { MicVAD } from "@ricky0123/vad-web";
import { useApp } from "@/contexts";
import { fetchSTT, getMicrophoneStream } from "@/lib";
import { floatArrayToWav } from "@/lib/utils";

interface MicVadCapturerProps {
  onSpeechTranscribed: (transcription: string) => void;
  onStreamActive: (stream: MediaStream | null) => void;
  onError: (error: string) => void;
  microphoneDeviceId?: string;
}

export function MicVadCapturer({
  onSpeechTranscribed,
  onStreamActive,
  onError,
  microphoneDeviceId,
}: MicVadCapturerProps) {
  const { selectedSttProvider, allSttProviders, invisibleaiApiEnabled } = useApp();
  const callbacksRef = useRef({
    onSpeechTranscribed,
    onStreamActive,
    onError,
  });
  const sttConfigRef = useRef({
    selectedSttProvider,
    allSttProviders,
    invisibleaiApiEnabled,
  });

  useEffect(() => {
    callbacksRef.current = {
      onSpeechTranscribed,
      onStreamActive,
      onError,
    };
  }, [onSpeechTranscribed, onStreamActive, onError]);

  useEffect(() => {
    sttConfigRef.current = {
      selectedSttProvider,
      allSttProviders,
      invisibleaiApiEnabled,
    };
  }, [selectedSttProvider, allSttProviders, invisibleaiApiEnabled]);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let vadInstance: MicVAD | null = null;
    let cancelled = false;

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
          console.warn("No STT provider selected for microphone channel");
          return;
        }

        const providerConfig = allSttProviders.find(
          (p) => p.id === selectedSttProvider.provider
        );

        if (!providerConfig && !useInvisibleAIAPI) {
          console.warn("STT provider configuration not found");
          return;
        }

        const transcription = await fetchSTT({
          provider: useInvisibleAIAPI ? undefined : providerConfig,
          selectedProvider: selectedSttProvider,
          audio: audioBlob,
          useInvisibleAIAPI,
        });

        if (transcription && transcription.trim()) {
          callbacksRef.current.onSpeechTranscribed(transcription);
        }
      } catch (err) {
        console.error("Failed to transcribe microphone speech:", err);
        callbacksRef.current.onError(
          err instanceof Error
            ? `Microphone STT Error: ${err.message}`
            : "Failed to transcribe microphone speech"
        );
      }
    };

    const setupVadStream = async () => {
      try {
        const stream = await getMicrophoneStream(microphoneDeviceId);

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        activeStream = stream;
        callbacksRef.current.onStreamActive(stream);

        const vad = await MicVAD.new({
          stream,
          minSpeechFrames: 5,
          preSpeechPadFrames: 10,
          onSpeechEnd: handleSpeechEnd,
        });

        if (cancelled) {
          vad.destroy();
          return;
        }

        vadInstance = vad;
        vad.start();
      } catch (err) {
        if (cancelled) {
          activeStream?.getTracks().forEach((track) => track.stop());
          return;
        }

        console.error("Failed to initialize microphone VAD stream:", err);
        callbacksRef.current.onError(
          err instanceof Error
            ? `Microphone Access Error: ${err.message}`
            : "Failed to initialize microphone VAD stream"
        );

        if (activeStream) {
          activeStream.getTracks().forEach((track) => track.stop());
          activeStream = null;
        }
        callbacksRef.current.onStreamActive(null);
      }
    };

    setupVadStream();

    return () => {
      cancelled = true;
      vadInstance?.destroy();
      activeStream?.getTracks().forEach((track) => track.stop());
      callbacksRef.current.onStreamActive(null);
    };
  }, [microphoneDeviceId]);

  return null;
}

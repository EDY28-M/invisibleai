import { useEffect, useRef } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import { useApp } from "@/contexts";
import { fetchSTT } from "@/lib";
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
  const streamRef = useRef<MediaStream | null>(null);

  const audioConstraints: MediaTrackConstraints =
    microphoneDeviceId && microphoneDeviceId !== "default"
      ? { deviceId: { ideal: microphoneDeviceId } }
      : {};

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const setupStream = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: microphoneDeviceId && microphoneDeviceId !== "default"
            ? { deviceId: { ideal: microphoneDeviceId } }
            : true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        streamRef.current = stream;
        onStreamActive(stream);
      } catch (err) {
        console.error("Failed to capture microphone stream for visualizer:", err);
        onError(
          err instanceof Error
            ? `Microphone Access Error: ${err.message}`
            : "Failed to access microphone"
        );
      }
    };

    setupStream();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = null;
      onStreamActive(null);
    };
  }, [microphoneDeviceId, onStreamActive, onError]);

  useMicVAD({
    userSpeakingThreshold: 0.65,
    minSpeechFrames: 5,
    preSpeechFrames: 10,
    startOnLoad: true,
    additionalAudioConstraints: audioConstraints,
    onSpeechEnd: async (audio: Float32Array) => {
      try {

        const audioBlob = floatArrayToWav(audio, 16000, "wav");

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
          onSpeechTranscribed(transcription);
        }
      } catch (err) {
        console.error("Failed to transcribe microphone speech:", err);
        onError(
          err instanceof Error
            ? `Microphone STT Error: ${err.message}`
            : "Failed to transcribe microphone speech"
        );
      }
    },
  });

  return null;
}

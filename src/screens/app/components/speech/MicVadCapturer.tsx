import { useEffect, useRef } from "react";
import { MicVAD } from "@ricky0123/vad-web";
import { getMicrophoneStream } from "@/lib";
import { floatArrayToWav } from "@/lib/utils";

interface MicVadCapturerProps {
  onSpeechStart?: () => void;
  onSpeechEnd: (audioBlob: Blob) => void;
  onStreamActive: (stream: MediaStream | null) => void;
  onError: (error: string) => void;
  microphoneDeviceId?: string;
}

export function MicVadCapturer({
  onSpeechStart,
  onSpeechEnd,
  onStreamActive,
  onError,
  microphoneDeviceId,
}: MicVadCapturerProps) {
  const callbacksRef = useRef({
    onSpeechStart,
    onSpeechEnd,
    onStreamActive,
    onError,
  });

  useEffect(() => {
    callbacksRef.current = {
      onSpeechStart,
      onSpeechEnd,
      onStreamActive,
      onError,
    };
  }, [onSpeechStart, onSpeechEnd, onStreamActive, onError]);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let vadInstance: MicVAD | null = null;
    let cancelled = false;

    const handleSpeechEnd = async (audio: Float32Array) => {
      try {
        const audioBlob = floatArrayToWav(audio, 16000, "wav");
        callbacksRef.current.onSpeechEnd(audioBlob);
      } catch (err) {
        console.error("Failed to process microphone speech audio:", err);
        callbacksRef.current.onError(
          err instanceof Error
            ? `Microphone Audio Processing Error: ${err.message}`
            : "Failed to process microphone speech audio"
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
          // Carga el worklet, el modelo ONNX y el runtime WASM DESDE LA APP
          // (public/vad/, copiados por scripts/copy-vad-assets.mjs) en vez del
          // CDN de jsDelivr → funciona offline, arranca más rápido y no depende
          // de una versión "@latest" remota que podría romper la app.
          baseAssetPath: "/vad/",
          onnxWASMBasePath: "/vad/",
          ortConfig: (ort) => {
            // Un solo hilo: los webviews de Tauri no son cross-origin isolated,
            // así que no hay SharedArrayBuffer → así evitamos las variantes
            // "threaded" del WASM (que no copiamos). El modelo VAD es diminuto.
            ort.env.wasm.numThreads = 1;
          },
          minSpeechFrames: 5,
          preSpeechPadFrames: 10,
          onSpeechStart: () => {
            callbacksRef.current.onSpeechStart?.();
          },
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

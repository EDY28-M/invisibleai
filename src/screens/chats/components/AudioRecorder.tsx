import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components";
import { AudioVisualizer } from "@/screens/app/components/speech/audio-visualizer";
import { fetchSTT, getMicrophoneStream } from "@/lib";
import { useApp } from "@/contexts";
import { StopCircle, Send } from "lucide-react";
import { DeepgramStreamManager } from "@/lib/functions/deepgram-stream";
import { serverApi } from "@/lib/server-api";
import { invoke } from "@tauri-apps/api/core";

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onCancel: () => void;
  onTranscriptUpdate?: (text: string) => void;
}

const MAX_DURATION = 3 * 60 * 1000;

export const AudioRecorder = ({
  onTranscriptionComplete,
  onCancel,
  onTranscriptUpdate,
}: AudioRecorderProps) => {
  const { selectedSttProvider, allSttProviders, selectedAudioDevices, invisibleaiApiEnabled, hasActiveLicense } =
    useApp();
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [liveTranscription, setLiveTranscription] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Streaming state refs
  const deepgramManagerRef = useRef<DeepgramStreamManager | null>(null);
  const streamingSessionStartRef = useRef<number | null>(null);
  const streamingUsageLastReportAtRef = useRef<number | null>(null);
  const streamingUsageReportTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Persistent accumulated transcript refs
  const finalTranscriptsRef = useRef<string[]>([]);
  const currentInterimRef = useRef<string>("");

  const reportStreamingUsageSinceLastTick = useCallback(() => {
    const lastReportAt = streamingUsageLastReportAtRef.current;
    if (lastReportAt === null) return;

    const now = Date.now();
    const secondsUsed = (now - lastReportAt) / 1000;
    if (secondsUsed < 1) return;

    serverApi.reportStreamingSeconds(secondsUsed);
    streamingUsageLastReportAtRef.current = now;
  }, []);

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }

    // Stop credit reporting
    if (streamingUsageReportTimerRef.current !== null) {
      clearInterval(streamingUsageReportTimerRef.current);
      streamingUsageReportTimerRef.current = null;
    }
    if (streamingUsageLastReportAtRef.current !== null) {
      const lastReportAt = streamingUsageLastReportAtRef.current;
      const now = Date.now();
      const secondsUsed = (now - lastReportAt) / 1000;
      if (secondsUsed >= 1) {
        serverApi.reportStreamingSeconds(secondsUsed);
      }
      streamingUsageLastReportAtRef.current = null;
    }
    streamingSessionStartRef.current = null;

    if (deepgramManagerRef.current) {
      deepgramManagerRef.current.destroy();
      deepgramManagerRef.current = null;
    }

    if (mediaRecorderRef.current?.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    mediaRecorderRef.current = null;

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }

    finalTranscriptsRef.current = [];
    currentInterimRef.current = "";
    setAudioStream(null);
  }, []);

  useEffect(() => {
    startRecording();

    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (maxDurationTimeoutRef.current) clearTimeout(maxDurationTimeoutRef.current);
      if (streamingUsageReportTimerRef.current) clearInterval(streamingUsageReportTimerRef.current);

      if (deepgramManagerRef.current) {
        deepgramManagerRef.current.destroy();
      }

      if (mediaRecorderRef.current?.state === "recording") {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
    };
  }, []);

  const startStaticRecorder = (stream: MediaStream) => {
    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/ogg";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    recorder.start(100);
  };

  const startRecording = async () => {
    try {
      const deviceId = selectedAudioDevices?.input?.id;
      const stream = await getMicrophoneStream(deviceId);

      streamRef.current = stream;
      setAudioStream(stream);
      startTimeRef.current = Date.now();

      const isPremiumStreaming = invisibleaiApiEnabled && hasActiveLicense;

      if (isPremiumStreaming) {
        try {
          const storage = await invoke<{
            license_key?: string;
            instance_id?: string;
            deepgram_api_key?: string;
            deepgram_model?: string;
            deepgram_language?: string;
          }>("secure_storage_get");

          let tokenData;
          if (storage.deepgram_api_key) {
            tokenData = {
              token: storage.deepgram_api_key,
              model: storage.deepgram_model || "nova-3",
              language: storage.deepgram_language || "es-419",
            };
          } else {
            const licenseKey = storage.license_key ?? "";
            const instanceId = storage.instance_id ?? "";
            tokenData = await serverApi.getDeepgramToken(licenseKey, instanceId);
          }

          const manager = new DeepgramStreamManager({
            apiKey: tokenData.token,
            model: tokenData.model,
            language: tokenData.language,
            endpointing: 200,
            utteranceEndMs: 1000,
          }, {
            onTranscript: (text, isFinal, _fullAccumulated) => {
              if (isFinal) {
                finalTranscriptsRef.current.push(text);
                currentInterimRef.current = "";
              } else {
                currentInterimRef.current = text;
              }

              const finals = finalTranscriptsRef.current.join(" ").trim();
              const fullText = currentInterimRef.current 
                ? (finals ? `${finals} ${currentInterimRef.current}` : currentInterimRef.current)
                : finals;

              setLiveTranscription(fullText);
              if (onTranscriptUpdate) {
                onTranscriptUpdate(fullText);
              }
            },
            onError: (err) => {
              console.error("[AudioRecorder] Deepgram stream error:", err);
              // Fallback to static recorder if stream fails during capture
              if (deepgramManagerRef.current) {
                deepgramManagerRef.current.destroy();
                deepgramManagerRef.current = null;
              }
              startStaticRecorder(stream);
            }
          });

          deepgramManagerRef.current = manager;
          await manager.start(stream);

          // Start credit tracking
          streamingSessionStartRef.current = Date.now();
          streamingUsageLastReportAtRef.current = Date.now();
          streamingUsageReportTimerRef.current = setInterval(
            reportStreamingUsageSinceLastTick,
            10000
          );

        } catch (streamErr) {
          console.error("[AudioRecorder] Failed to start streaming, falling back to static recorder:", streamErr);
          startStaticRecorder(stream);
        }
      } else {
        startStaticRecorder(stream);
      }

      durationIntervalRef.current = setInterval(() => {
        setDuration(Date.now() - startTimeRef.current);
      }, 100);

      maxDurationTimeoutRef.current = setTimeout(() => {
        handleSend();
      }, MAX_DURATION);
    } catch (error) {
      console.error("Failed to start recording:", error);
      cleanup();
      onCancel();
    }
  };

  const handleStop = () => {
    cleanup();
    onCancel();
  };

  const handleSend = async () => {
    if (isTranscribing) return;

    setIsTranscribing(true);
    const isPremiumStreaming = invisibleaiApiEnabled && hasActiveLicense;

    if (isPremiumStreaming && deepgramManagerRef.current) {
      try {
        const text = await deepgramManagerRef.current.stop();
        cleanup();
        onTranscriptionComplete(text);
      } catch (error) {
        console.error("[AudioRecorder] Streaming transcription failed:", error);
        cleanup();
        onCancel();
      }
    } else if (mediaRecorderRef.current) {
      const mimeType = mediaRecorderRef.current.mimeType;
      const chunks = [...audioChunksRef.current];

      cleanup();

      try {
        const audioBlob = new Blob(chunks, { type: mimeType });

        const provider = allSttProviders.find(
          (p) => p.id === selectedSttProvider.provider
        );

        const text = await fetchSTT({
          provider: invisibleaiApiEnabled ? undefined : provider,
          selectedProvider: selectedSttProvider,
          audio: audioBlob,
          useInvisibleAIAPI: invisibleaiApiEnabled,
        });

        if (onTranscriptUpdate) {
          onTranscriptUpdate(text);
        }
        onTranscriptionComplete(text);
      } catch (error) {
        console.error("[AudioRecorder] Static transcription failed:", error);
        cleanup();
        onCancel();
      }
    } else {
      cleanup();
      onCancel();
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border bg-background rounded-lg overflow-hidden">
      <div className="h-12 relative bg-muted/20">
        {audioStream ? (
          <div className="h-full w-full pt-3">
            <AudioVisualizer stream={audioStream} isRecording={true} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Initializing...
          </div>
        )}
      </div>

      {liveTranscription && (
        <div className="px-4 py-2.5 text-[11px] lg:text-xs border-t bg-muted/10 text-muted-foreground max-h-24 overflow-y-auto italic font-sans leading-relaxed select-all">
          {liveTranscription}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-mono tabular-nums font-medium">
            {formatTime(duration)}
          </span>
          <span className="text-xs text-muted-foreground">/ 3:00</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={handleStop}
            disabled={isTranscribing}
            className="h-8 w-8"
            title="Stop recording"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isTranscribing}
            className="h-8 w-8"
            title={isTranscribing ? "Sending..." : "Send to AI"}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

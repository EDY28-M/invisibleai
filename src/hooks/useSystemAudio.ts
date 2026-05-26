import { useEffect, useState, useCallback, useRef } from "react";
import { useWindowResize, useGlobalShortcuts } from ".";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useApp } from "@/contexts";
import {
  appendStreamingCopilotContext,
  buildStreamingCopilotDecision,
  shouldSuppressSmartSystemResponse,
  fetchSTT,
  fetchAIResponse,
  DeepgramStreamManager,
  type StreamingChannel,
  type StreamingCopilotBuffers,
  type StreamingSmartSystemResponseRecord,
} from "@/lib/functions";
import { serverApi, type DeepgramTokenResponse } from "@/lib/server-api";
import {
  getScreenCaptureErrorMessage,
  requestScreenRecordingPermissionIfNeeded,
} from "@/lib/screen-capture-permission";
import {
  DEFAULT_QUICK_ACTIONS,
  DEFAULT_SYSTEM_PROMPT,
  STORAGE_KEYS,
} from "@/config";
import {
  safeLocalStorage,
  generateConversationTitle,
  saveConversation,
  CONVERSATION_SAVE_DEBOUNCE_MS,
  generateConversationId,
  generateMessageId,
  getGlobalMemoryContext,
  getMicrophoneStream,
} from "@/lib";
import { Message } from "@/types/completion";
import { extractAndStoreMemories } from "@/lib/functions";

export interface VadConfig {
  enabled: boolean;
  hop_size: number;
  sensitivity_rms: number;
  peak_threshold: number;
  silence_chunks: number;
  min_speech_chunks: number;
  pre_speech_chunks: number;
  noise_gate_threshold: number;
  max_recording_duration_secs: number;
}

const DEFAULT_VAD_CONFIG: VadConfig = {
  enabled: true,
  hop_size: 1024,
  sensitivity_rms: 0.002,
  peak_threshold: 0.008,
  silence_chunks: 12,
  min_speech_chunks: 2,
  pre_speech_chunks: 15,
  noise_gate_threshold: 0.0005,
  max_recording_duration_secs: 180,
};

const STREAMING_DISPATCH_IDLE_MS = 500;
const STREAMING_CREDIT_REPORT_INTERVAL_MS = 10_000;

const mergeStreamingTranscriptText = (currentText: string, nextText: string) => {
  const current = currentText.trim();
  const next = nextText.trim();

  if (!current) return next;
  if (!next || current === next || current.endsWith(next)) return current;
  if (next.startsWith(current)) return next;

  return `${current} ${next}`;
};

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export type useSystemAudioType = ReturnType<typeof useSystemAudio>;

export interface SpeechUtterance {
  id: string;
  startTime: number;
  channel: "system" | "mic";
  isRecording: boolean;
  isProcessed: boolean;
  isDiscarded: boolean;
  audioBlob?: Blob;
  base64Audio?: string;
  sttPromise?: Promise<string>;
}

export function useSystemAudio() {
  const { resizeWindow } = useWindowResize();
  const globalShortcuts = useGlobalShortcuts();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [lastTranscription, setLastTranscription] = useState<string>("");
  const [lastAIResponse, setLastAIResponse] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [setupRequired, setSetupRequired] = useState<boolean>(false);
  const [quickActions, setQuickActions] = useState<string[]>([]);
  const [isManagingQuickActions, setIsManagingQuickActions] =
    useState<boolean>(false);
  const [showQuickActions, setShowQuickActions] = useState<boolean>(true);
  const [vadConfig, setVadConfig] = useState<VadConfig>(DEFAULT_VAD_CONFIG);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);
  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(false);
  const [isRecordingInContinuousMode, setIsRecordingInContinuousMode] =
    useState<boolean>(false);
  const [isDualChannel, setIsDualChannel] = useState<boolean>(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  const [isStreamingMode, setIsStreamingMode] = useState<boolean>(false);
  const [interimTranscription, setInterimTranscription] = useState<string>("");
  const [systemInterimTranscription, setSystemInterimTranscription] = useState<string>("");
  const [streamingSmartMode, setStreamingSmartMode] = useState<boolean>(false);
  const [screenshotImage, setScreenshotImage] = useState<string | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState<boolean>(false);
  const [accumulatedSystemText, setAccumulatedSystemText] = useState<string>("");

  const deepgramManagerRef = useRef<DeepgramStreamManager | null>(null);
  const deepgramTokenCacheRef = useRef<{ token: DeepgramTokenResponse; fetchedAt: number } | null>(null);
  const streamingSessionStartRef = useRef<number | null>(null);
  const streamingUsageLastReportAtRef = useRef<number | null>(null);
  const streamingUsageReportTimerRef = useRef<number | null>(null);
  const isStreamingModeRef = useRef<boolean>(false);
  const streamingSmartModeRef = useRef<boolean>(false);
  const streamingMicStreamRef = useRef<MediaStream | null>(null);
  const accumulatedSystemTextRef = useRef<string>("");
  const streamingCopilotBuffersRef = useRef<StreamingCopilotBuffers>({
    mic: [],
    system: [],
  });
  const streamingLastSmartSystemResponseRef = useRef<StreamingSmartSystemResponseRecord | null>(null);

  useEffect(() => { isStreamingModeRef.current = isStreamingMode; }, [isStreamingMode]);
  useEffect(() => { streamingSmartModeRef.current = streamingSmartMode; }, [streamingSmartMode]);
  useEffect(() => { accumulatedSystemTextRef.current = accumulatedSystemText; }, [accumulatedSystemText]);

  const resetStreamingCopilotBuffers = useCallback(() => {
    streamingCopilotBuffersRef.current = {
      mic: [],
      system: [],
    };
    streamingLastSmartSystemResponseRef.current = null;
  }, []);

  const handleCaptureScreenshot = useCallback(async () => {
    if (isCapturingScreenshot) return;

    setIsCapturingScreenshot(true);
    try {
      await requestScreenRecordingPermissionIfNeeded();

      const base64: string = await invoke("capture_to_base64");

      // Compress the image to reduce payload size (max 1280px wide, JPEG 75%)
      const compressedBase64 = await compressBase64Image(base64, 1280, 0.75);
      setScreenshotImage(compressedBase64);
    } catch (err) {
      console.error(await getScreenCaptureErrorMessage(err), err);
    } finally {
      setIsCapturingScreenshot(false);
    }
  }, [isCapturingScreenshot]);

  /** Compress a base64 image via canvas — reduces size for AI vision payloads */
  function compressBase64Image(base64: string, maxWidth: number, quality: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(base64); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        // Strip the data:image/jpeg;base64, prefix
        resolve(dataUrl.split(",")[1] ?? base64);
      };
      img.onerror = () => resolve(base64);
      // The incoming base64 may or may not have a data URL prefix
      img.src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
    });
  }


  const handleRemoveScreenshot = useCallback(() => {
    setScreenshotImage(null);
  }, []);

  const [conversation, setConversation] = useState<ChatConversation>({
    id: "",
    title: "",
    messages: [],
    createdAt: 0,
    updatedAt: 0,
  });

  const [useSystemPrompt, setUseSystemPrompt] = useState<boolean>(true);
  const [contextContent, setContextContent] = useState<string>("");
  const [useConversationalMemory, setUseConversationalMemory] = useState<boolean>(false);

  const {
    selectedSttProvider,
    allSttProviders,
    selectedAIProvider,
    allAiProviders,
    systemPrompt,
    selectedAudioDevices,
    invisibleaiApiEnabled,
  } = useApp();
  const abortControllerRef = useRef<AbortController | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const capturingRef = useRef<boolean>(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const manualMicStreamRef = useRef<MediaStream | null>(null);
  const streamingDispatchTimerRef = useRef<{ mic: number | null; system: number | null }>({
    mic: null,
    system: null,
  });
  const streamingPendingTextRef = useRef<{ mic: string; system: string }>({
    mic: "",
    system: "",
  });
  const lastStreamingAudioAtRef = useRef<{ mic: number; system: number }>({
    mic: 0,
    system: 0,
  });

  const conversationRef = useRef(conversation);
  const isDualChannelRef = useRef(isDualChannel);
  const isContinuousModeRef = useRef(isContinuousMode);
  const vadConfigRef = useRef(vadConfig);
  const useSystemPromptRef = useRef(useSystemPrompt);
  const systemPromptRef = useRef(systemPrompt);
  const contextContentRef = useRef(contextContent);
  const useConversationalMemoryRef = useRef(useConversationalMemory);

  const selectedSttProviderRef = useRef(selectedSttProvider);
  const allSttProvidersRef = useRef(allSttProviders);
  const invisibleaiApiEnabledRef = useRef(invisibleaiApiEnabled);

  useEffect(() => { conversationRef.current = conversation; }, [conversation]);
  useEffect(() => { isDualChannelRef.current = isDualChannel; }, [isDualChannel]);
  useEffect(() => { isContinuousModeRef.current = isContinuousMode; }, [isContinuousMode]);
  useEffect(() => { vadConfigRef.current = vadConfig; }, [vadConfig]);
  useEffect(() => { useSystemPromptRef.current = useSystemPrompt; }, [useSystemPrompt]);
  useEffect(() => { systemPromptRef.current = systemPrompt; }, [systemPrompt]);
  useEffect(() => { contextContentRef.current = contextContent; }, [contextContent]);
  useEffect(() => { useConversationalMemoryRef.current = useConversationalMemory; }, [useConversationalMemory]);
  useEffect(() => { selectedSttProviderRef.current = selectedSttProvider; }, [selectedSttProvider]);
  useEffect(() => { allSttProvidersRef.current = allSttProviders; }, [allSttProviders]);
  useEffect(() => { invisibleaiApiEnabledRef.current = invisibleaiApiEnabled; }, [invisibleaiApiEnabled]);


  const isLastTranscriptionSavedRef = useRef<boolean>(true);
  const lastTranscriptionRef = useRef(lastTranscription);
  const lastAIResponseRef = useRef(lastAIResponse);

  useEffect(() => { lastTranscriptionRef.current = lastTranscription; }, [lastTranscription]);
  useEffect(() => { lastAIResponseRef.current = lastAIResponse; }, [lastAIResponse]);

  // Chronological queue to track concurrent active speech utterances across both channels
  const activeSpeechUtterancesRef = useRef<SpeechUtterance[]>([]);
  const isProcessingQueueRef = useRef<boolean>(false);

  const resetSpeechQueue = useCallback(() => {
    activeSpeechUtterancesRef.current = [];
    isProcessingQueueRef.current = false;
  }, []);

  const discardQueuedSpeechUtterances = useCallback((channel: SpeechUtterance["channel"]) => {
    const before = activeSpeechUtterancesRef.current.length;
    activeSpeechUtterancesRef.current = activeSpeechUtterancesRef.current.filter(
      (utterance) =>
        utterance.channel !== channel || utterance.isProcessed || utterance.isDiscarded
    );
    return activeSpeechUtterancesRef.current.length !== before;
  }, []);

  const previousOutputDeviceIdRef = useRef(selectedAudioDevices.output.id);

  useEffect(() => {
    const previousOutputDeviceId = previousOutputDeviceIdRef.current;

    if (previousOutputDeviceId === selectedAudioDevices.output.id) {
      return;
    }

    previousOutputDeviceIdRef.current = selectedAudioDevices.output.id;

    if (!capturingRef.current || (!vadConfig.enabled && !isStreamingModeRef.current)) {
      return;
    }

    let cancelled = false;

    const restartBackendCapture = async () => {
      try {
        if (isStreamingModeRef.current) {
          // Restart Rust Deepgram stream with new device — usar credenciales cacheadas (local key o server token)
          const cached = deepgramTokenCacheRef.current;
          if (!cached) return;
          const deviceId =
            selectedAudioDevices.output.id !== "default"
              ? selectedAudioDevices.output.id
              : null;

          await invoke("stop_system_deepgram_stream");
          if (cancelled || !capturingRef.current) return;

          await invoke("start_system_deepgram_stream", {
            apiKey: cached.token.token,
            model: cached.token.model,
            language: cached.token.language,
            deviceId,
          });
        } else {
          // Restart classic VAD capture
          resetSpeechQueue();
          await invoke("stop_system_audio_capture");

          if (cancelled || !capturingRef.current || !vadConfig.enabled) {
            return;
          }

          const deviceId =
            selectedAudioDevices.output.id !== "default"
              ? selectedAudioDevices.output.id
              : null;

          await invoke("start_system_audio_capture", {
            vadConfig: vadConfig,
            deviceId,
          });
        }
      } catch (err) {
        console.error(
          "Failed to dynamically restart system audio capture on device change:",
          err
        );
      }
    };

    restartBackendCapture();

    return () => {
      cancelled = true;
    };
  }, [resetSpeechQueue, selectedAudioDevices.output.id, vadConfig]);

  const updateDualChannel = useCallback((value: boolean) => {
    setIsDualChannel(value);
    safeLocalStorage.setItem("system_audio_dual_channel", String(value));
  }, []);

  const updateConversationalMemory = useCallback((value: boolean) => {
    setUseConversationalMemory(value);
    safeLocalStorage.setItem("system_audio_use_memory", String(value));
  }, []);

  const updateStreamingSmartMode = useCallback((value: boolean) => {
    setStreamingSmartMode(value);
    streamingSmartModeRef.current = value;
    streamingLastSmartSystemResponseRef.current = null;
    safeLocalStorage.setItem("system_audio_streaming_smart_mode", String(value));
  }, []);

  useEffect(() => {
    const savedContext = safeLocalStorage.getItem(
      STORAGE_KEYS.SYSTEM_AUDIO_CONTEXT
    );
    if (savedContext) {
      try {
        const parsed = JSON.parse(savedContext);
        setUseSystemPrompt(parsed.useSystemPrompt ?? true);
        setContextContent(parsed.contextContent ?? "");
      } catch (error) {
        console.error("Failed to load system audio context:", error);
      }
    }

    const savedMemory = safeLocalStorage.getItem("system_audio_use_memory");
    if (savedMemory) {
      setUseConversationalMemory(savedMemory === "true");
    }

    const savedStreamingSmartMode = safeLocalStorage.getItem("system_audio_streaming_smart_mode");
    if (savedStreamingSmartMode) {
      setStreamingSmartMode(savedStreamingSmartMode === "true");
    }

    const savedVadConfig = safeLocalStorage.getItem("vad_config");
    if (savedVadConfig) {
      try {
        const parsed = JSON.parse(savedVadConfig);
        setVadConfig(parsed);
      } catch (error) {
        console.error("Failed to load VAD config:", error);
      }
    }

    const savedDualChannel = safeLocalStorage.getItem("system_audio_dual_channel");
    if (savedDualChannel) {
      setIsDualChannel(savedDualChannel === "true");
    }
  }, []);

  useEffect(() => {
    const savedActions = safeLocalStorage.getItem(
      STORAGE_KEYS.SYSTEM_AUDIO_QUICK_ACTIONS
    );
    if (savedActions) {
      try {
        const parsed = JSON.parse(savedActions);
        setQuickActions(parsed);
      } catch (error) {
        console.error("Failed to load quick actions:", error);
        setQuickActions(DEFAULT_QUICK_ACTIONS);
      }
    } else {
      setQuickActions(DEFAULT_QUICK_ACTIONS);
    }
  }, []);

  useEffect(() => {
    let progressUnlisten: (() => void) | undefined;
    let startUnlisten: (() => void) | undefined;
    let stopUnlisten: (() => void) | undefined;
    let errorUnlisten: (() => void) | undefined;
    let discardedUnlisten: (() => void) | undefined;
    let cancelled = false;

    const setupContinuousListeners = async () => {
      try {
        const uProgress = await listen("recording-progress", (event) => {
          const seconds = event.payload as number;
          setRecordingProgress(seconds);
        });
        if (cancelled) { uProgress(); return; }
        progressUnlisten = uProgress;

        const uStart = await listen("continuous-recording-start", () => {
          setRecordingProgress(0);
          setIsRecordingInContinuousMode(true);
        });
        if (cancelled) { uStart(); return; }
        startUnlisten = uStart;

        const uStop = await listen("continuous-recording-stopped", () => {
          setRecordingProgress(0);
          setIsRecordingInContinuousMode(false);
        });
        if (cancelled) { uStop(); return; }
        stopUnlisten = uStop;

        const uError = await listen("audio-encoding-error", (event) => {
          const errorMsg = event.payload as string;

          if (
            isContinuousModeRef.current &&
            errorMsg.toLowerCase().includes("no audio recorded")
          ) {
            console.warn("Ignoring empty system loopback audio in Manual mode");
            setIsRecordingInContinuousMode(false);
            return;
          }

          console.error("Audio encoding error:", errorMsg);
          setError(`Failed to process audio: ${errorMsg}`);
          setIsProcessing(false);
          setIsAIProcessing(false);
          setIsRecordingInContinuousMode(false);

          // Discard active recording system utterance to unblock queue
          const utterance = activeSpeechUtterancesRef.current.find(
            (u) => u.channel === "system" && u.isRecording && !u.isDiscarded
          );
          if (utterance) {
            utterance.isDiscarded = true;
            utterance.isRecording = false;
          }
          processSpeechQueueRef.current();
        });
        if (cancelled) { uError(); return; }
        errorUnlisten = uError;

        const uDiscarded = await listen("speech-discarded", (event) => {
          const reason = event.payload as string;
          console.log("Speech discarded:", reason);
        });
        if (cancelled) { uDiscarded(); return; }
        discardedUnlisten = uDiscarded;
      } catch (err) {
        console.error("Failed to setup continuous recording listeners:", err);
      }
    };

    setupContinuousListeners();

    return () => {
      cancelled = true;
      if (progressUnlisten) progressUnlisten();
      if (startUnlisten) startUnlisten();
      if (stopUnlisten) stopUnlisten();
      if (errorUnlisten) errorUnlisten();
      if (discardedUnlisten) discardedUnlisten();
    };
  }, []);

  const saveContextSettings = useCallback(
    (usePrompt: boolean, content: string) => {
      try {
        const contextSettings = {
          useSystemPrompt: usePrompt,
          contextContent: content,
        };
        safeLocalStorage.setItem(
          STORAGE_KEYS.SYSTEM_AUDIO_CONTEXT,
          JSON.stringify(contextSettings)
        );
      } catch (error) {
        console.error("Failed to save context settings:", error);
      }
    },
    []
  );

  const updateUseSystemPrompt = useCallback(
    (value: boolean) => {
      setUseSystemPrompt(value);
      saveContextSettings(value, contextContent);
    },
    [contextContent, saveContextSettings]
  );

  const updateContextContent = useCallback(
    (content: string) => {
      setContextContent(content);
      saveContextSettings(useSystemPrompt, content);
    },
    [useSystemPrompt, saveContextSettings]
  );

  const saveQuickActions = useCallback((actions: string[]) => {
    try {
      safeLocalStorage.setItem(
        STORAGE_KEYS.SYSTEM_AUDIO_QUICK_ACTIONS,
        JSON.stringify(actions)
      );
    } catch (error) {
      console.error("Failed to save quick actions:", error);
    }
  }, []);

  const addQuickAction = useCallback(
    (action: string) => {
      if (action && !quickActions.includes(action)) {
        const newActions = [...quickActions, action];
        setQuickActions(newActions);
        saveQuickActions(newActions);
      }
    },
    [quickActions, saveQuickActions]
  );

  const removeQuickAction = useCallback(
    (action: string) => {
      const newActions = quickActions.filter((a) => a !== action);
      setQuickActions(newActions);
      saveQuickActions(newActions);
    },
    [quickActions, saveQuickActions]
  );

  const handleQuickActionClick = async (action: string) => {
    setError("");

    const effectiveSystemPrompt = useSystemPrompt
      ? systemPrompt || DEFAULT_SYSTEM_PROMPT
      : contextContent || DEFAULT_SYSTEM_PROMPT;

    let updatedMessages = [...conversationRef.current.messages];

    const prevTranscription = lastTranscriptionRef.current;
    const prevAIResponse = lastAIResponseRef.current;

    if (prevTranscription && !isLastTranscriptionSavedRef.current) {
      const timestamp = Date.now();
      const userMessage = {
        id: generateMessageId("user", timestamp),
        role: "user" as const,
        content: prevTranscription,
        timestamp,
      };
      const assistantMessage = {
        id: generateMessageId("assistant", timestamp + 1),
        role: "assistant" as const,
        content: prevAIResponse,
        timestamp: timestamp + 1,
      };
      updatedMessages.push(userMessage, assistantMessage);

      conversationRef.current = {
        ...conversationRef.current,
        messages: [...conversationRef.current.messages, userMessage, assistantMessage],
        updatedAt: timestamp,
        title: conversationRef.current.title || generateConversationTitle(prevTranscription),
      };

      setConversation(conversationRef.current);
      isLastTranscriptionSavedRef.current = true;
    }

    const previousMessages = updatedMessages.map((msg) => {
      return { role: msg.role, content: msg.content };
    });

    setLastTranscription(action);
    setLastAIResponse("");
    isLastTranscriptionSavedRef.current = false;

    await processWithAI(action, effectiveSystemPrompt, previousMessages);
  };

  const startFrontendMicRecording = useCallback(async () => {
    const stream = await getMicrophoneStream(selectedAudioDevices.input.id);
    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/ogg";
    const recorder = new MediaRecorder(stream, { mimeType });

    audioChunksRef.current = [];
    manualMicStreamRef.current = stream;
    mediaRecorderRef.current = recorder;
    setMicStream(stream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.start(100);
  }, [selectedAudioDevices.input.id]);

  const stopFrontendMicRecording = useCallback(async (shouldSend: boolean) => {
    const recorder = mediaRecorderRef.current;
    const stream = manualMicStreamRef.current;

    mediaRecorderRef.current = null;
    manualMicStreamRef.current = null;
    setMicStream(null);

    const stopTracks = () => {
      stream?.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
    };

    if (!recorder) {
      stopTracks();
      audioChunksRef.current = [];
      return null;
    }

    const waitForStop = new Promise<void>((resolve) => {
      const previousOnStop = recorder.onstop;
      recorder.onstop = (event) => {
        if (typeof previousOnStop === "function") {
          previousOnStop.call(recorder, event);
        }
        resolve();
      };
    });

    if (recorder.state === "recording") {
      try {
        recorder.stop();
        await waitForStop;
      } catch (error) {
        console.error("Failed to stop MediaRecorder:", error);
      }
    }

    stopTracks();

    const chunks = [...audioChunksRef.current];
    audioChunksRef.current = [];

    if (!shouldSend || chunks.length === 0) {
      return null;
    }

    return new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
  }, []);

  const startContinuousRecording = useCallback(async () => {
    try {
      setRecordingProgress(0);
      setError("");

      await startFrontendMicRecording();

      const deviceId =
        selectedAudioDevices.output.id !== "default"
          ? selectedAudioDevices.output.id
          : null;

      await invoke<string>("start_system_audio_capture", {
        vadConfig: vadConfig,
        deviceId: deviceId,
      });
    } catch (err) {
      console.error("Failed to start continuous recording:", err);
      await stopFrontendMicRecording(false);
      setError(`Failed to start recording: ${err}`);
    }
  }, [
    vadConfig,
    selectedAudioDevices.output.id,
    startFrontendMicRecording,
    stopFrontendMicRecording,
  ]);

  const ignoreContinuousRecording = useCallback(async () => {
    try {
      if (!isContinuousMode || !isRecordingInContinuousMode) return;

      await stopFrontendMicRecording(false);
      await invoke<string>("stop_system_audio_capture");

      setRecordingProgress(0);
      setIsProcessing(false);
      setIsRecordingInContinuousMode(false);
    } catch (err) {
      console.error("Failed to ignore recording:", err);
      setError(`Failed to ignore recording: ${err}`);
    }
  }, [isContinuousMode, isRecordingInContinuousMode, stopFrontendMicRecording]);

  const handleSystemSpeechStart = useCallback(() => {
    if (!capturingRef.current) return;

    const newUtterance: SpeechUtterance = {
      id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      channel: "system",
      isRecording: true,
      isProcessed: false,
      isDiscarded: false,
    };

    activeSpeechUtterancesRef.current.push(newUtterance);
    console.log("[Queue] Registered system speech start at", newUtterance.startTime);
  }, []);

  const handleMicSpeechStart = useCallback(() => {
    if (!capturingRef.current) return;
    if (isStreamingModeRef.current) return;

    const newUtterance: SpeechUtterance = {
      id: `mic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      channel: "mic",
      isRecording: true,
      isProcessed: false,
      isDiscarded: false,
    };

    activeSpeechUtterancesRef.current.push(newUtterance);
    console.log("[Queue] Registered mic speech start at", newUtterance.startTime);
  }, []);

  const processSpeechQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    try {
      while (true) {
        if (!capturingRef.current) break;

        // Filter out non-discarded and non-processed utterances
        const activeUtterances = activeSpeechUtterancesRef.current.filter(
          (u) => !u.isDiscarded && !u.isProcessed
        );

        if (activeUtterances.length === 0) break;

        // Sort by startTime ascending (chronological order)
        activeUtterances.sort((a, b) => a.startTime - b.startTime);

        let readyUtterance: SpeechUtterance | undefined;

        // Find the earliest utterance that is ready (finished recording and has STT promise)
        // Don't block on still-recording utterances — process whatever is ready
        readyUtterance = activeUtterances.find(
          (u) => !u.isRecording && u.sttPromise
        );

        if (!readyUtterance) {
          console.log("[Queue] No ready utterances to process.");
          break;
        }

        console.log(`[Queue] Processing completed utterance from channel: ${readyUtterance.channel} (startTime: ${readyUtterance.startTime})`);

        setIsProcessing(true);
        let transcription = "";
        try {
          const timeoutPromise = new Promise<string>((_, reject) => {
            setTimeout(
              () => reject(new Error("Speech transcription timed out (30s)")),
              30000
            );
          });

          transcription = await Promise.race([
            readyUtterance.sttPromise!,
            timeoutPromise,
          ]);
        } catch (sttError: any) {
          console.error(`STT Error for ${readyUtterance.channel}:`, sttError);
          setError(sttError.message || `Failed to transcribe ${readyUtterance.channel} audio`);
          setIsPopoverOpen(true);
        } finally {
          setIsProcessing(false);
        }

        // Send to AI if non-empty
        if (transcription && transcription.trim()) {
          const trimmed = transcription.trim();
          const formattedTranscription =
            readyUtterance.channel === "mic"
              ? `[Tú]: ${trimmed}`
              : `[Sistema]: ${trimmed}`;

          if (isStreamingModeRef.current) {
            handleNewTranscriptionRef.current(formattedTranscription).catch((err) => {
              console.error("[Queue] Failed to submit streaming transcription:", err);
              setError(err instanceof Error ? err.message : "Failed to submit streaming transcription");
            });
          } else {
            await handleNewTranscriptionRef.current(formattedTranscription);
          }
        } else {
          console.log(`[Queue] Received empty transcription from ${readyUtterance.channel}`);
        }

        // Mark as processed
        readyUtterance.isProcessed = true;

        // Prune processed/discarded utterances from the array to prevent growing indefinitely
        activeSpeechUtterancesRef.current = activeSpeechUtterancesRef.current.filter(
          (u) => !u.isProcessed && !u.isDiscarded
        );

        // Sleep to let React process states smoothly
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    } catch (err) {
      console.error("[Queue] Error in processSpeechQueue:", err);
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, []);

  const processWithAI = useCallback(
    async (
      transcription: string,
      prompt: string,
      previousMessages: Message[],
      shouldSaveToDb: boolean = true,
      persistedTranscription?: string
    ) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        setIsAIProcessing(true);
        setLastAIResponse("");
        setError("");

        // Only attach and clear the screenshot if this is a persistent user/mic message, 
        // to prevent background system streams from consuming it.
        const visibleTranscription = persistedTranscription ?? transcription;
        const isSystemStreamingMessage = !shouldSaveToDb && visibleTranscription.startsWith("[Sistema]:");
        const activeScreenshot = isSystemStreamingMessage ? null : screenshotImage;
        if (!isSystemStreamingMessage) {
          setScreenshotImage(null);
        }

        let fullResponse = "";

        const useInvisibleAIAPI = invisibleaiApiEnabled;

        const provider = useInvisibleAIAPI
          ? undefined
          : allAiProviders.find((p) => p.id === selectedAIProvider.provider);

        let effectivePrompt = prompt;
        if (isDualChannel && !isStreamingModeRef.current) {
          effectivePrompt += "\n\nNOTA: Esta es una reunión en tiempo real con doble canal. " +
            "Las transcripciones que comienzan con '[Tú]:' son lo que dice el usuario (tú). " +
            "Las transcripciones que comienzan con '[Sistema]:' son lo que dice la otra persona (el interlocutor o el sistema). " +
            "Por favor, analiza el contexto y ayuda al usuario a responder de forma clara, precisa, coherente y muy rápida.";
        }

        let extendedMessageHistory = [...previousMessages];

        if (useConversationalMemoryRef.current) {
          try {
            const memoryContextStr = await getGlobalMemoryContext(15);
            if (memoryContextStr) {
              const globalContextBlock = `
[INSTRUCCIÓN CRÍTICA DEL SISTEMA]
A continuación se incluyen los recuerdos y temas de conversaciones anteriores con este usuario:
<PastConversations>
${memoryContextStr}
</PastConversations>

ERES CAPAZ DE RECORDAR EL PASADO: El sistema te está proveyendo esta memoria.
Si el usuario pregunta "¿De qué hablamos la sesión pasada?" o "¿Te acuerdas de mí?", DEBES responder usando la información de <PastConversations>.
ESTÁ ESTRICTAMENTE PROHIBIDO decir que "cada sesión es independiente", que "el modelo parte de cero", o que "no tienes memoria". Tienes memoria, y está en <PastConversations>. Usa esta información de manera fluida y natural.`;
              effectivePrompt = globalContextBlock + "\n\n" + effectivePrompt;
            }
          } catch (memError) {
            console.error("Failed to load historical conversations for memory:", memError);
          }
        }

        try {
          for await (const chunk of fetchAIResponse({
            provider: useInvisibleAIAPI ? undefined : provider,
            selectedProvider: selectedAIProvider,
            systemPrompt: effectivePrompt,
            history: extendedMessageHistory,
            userMessage: transcription,
            imagesBase64: activeScreenshot ? [activeScreenshot] : [],
            useInvisibleAIAPI,
            signal,
          })) {
            if (signal.aborted) {
              break;
            }
            fullResponse += chunk;
            setLastAIResponse((prev) => prev + chunk);
          }
        } catch (aiError: any) {
          if (aiError.name !== "AbortError") {
            setError(aiError.message || "Failed to get AI response");
          }
        }

        if (fullResponse && shouldSaveToDb) {
          const timestamp = Date.now();
          const userMsg = {
            id: generateMessageId("user", timestamp),
            role: "user" as const,
            content: visibleTranscription,
            timestamp,
          };
          const assistantMsg = {
            id: generateMessageId("assistant", timestamp + 1),
            role: "assistant" as const,
            content: fullResponse,
            timestamp: timestamp + 1,
          };

          conversationRef.current = {
            ...conversationRef.current,
            messages: [...conversationRef.current.messages, userMsg, assistantMsg],
            updatedAt: timestamp,
            title: conversationRef.current.title || generateConversationTitle(visibleTranscription),
          };

          setConversation(conversationRef.current);
          isLastTranscriptionSavedRef.current = true;
        }
      } catch (err) {
        setError("Failed to get AI response");
      } finally {
        setIsAIProcessing(false);
      }
    },
    [selectedAIProvider, allAiProviders, isDualChannel, screenshotImage, invisibleaiApiEnabled]
  );

  const handleStreamingCopilotTranscription = useCallback(async (
    channel: StreamingChannel,
    text: string
  ) => {
    if (!capturingRef.current || !isStreamingModeRef.current) return;

    const trimmedText = text.trim();
    if (!trimmedText) return;

    setError("");

    const now = Date.now();
    const displayTranscription =
      channel === "mic" ? `[Tú]: ${trimmedText}` : `[Sistema]: ${trimmedText}`;
    const effectiveSystemPrompt = useSystemPromptRef.current
      ? systemPromptRef.current || DEFAULT_SYSTEM_PROMPT
      : contextContentRef.current || DEFAULT_SYSTEM_PROMPT;

    const decision = buildStreamingCopilotDecision({
      channel,
      text: trimmedText,
      userPreparationContext: effectiveSystemPrompt,
      buffers: streamingCopilotBuffersRef.current,
      systemDetectionMode: streamingSmartModeRef.current ? "smart" : "standard",
      now,
    });

    streamingCopilotBuffersRef.current = appendStreamingCopilotContext(
      streamingCopilotBuffersRef.current,
      {
        channel,
        text: trimmedText,
        timestamp: now,
      },
      now
    );

    if (channel === "system") {
      const prevAccumulated = accumulatedSystemTextRef.current;
      const newAccumulated = prevAccumulated
        ? `${prevAccumulated} ${trimmedText}`
        : trimmedText;
      setAccumulatedSystemText(newAccumulated);
      accumulatedSystemTextRef.current = newAccumulated;
    } else {
      setAccumulatedSystemText("");
      accumulatedSystemTextRef.current = "";
    }

    if (!decision.shouldRespond) {
      return;
    }

    if (channel === "system" && streamingSmartModeRef.current) {
      const shouldSuppress = shouldSuppressSmartSystemResponse({
        currentText: trimmedText,
        decision,
        previous: streamingLastSmartSystemResponseRef.current,
        now,
      });

      if (shouldSuppress) {
        return;
      }

      streamingLastSmartSystemResponseRef.current = {
        text: trimmedText,
        timestamp: now,
        currentEventKind: decision.currentEventKind,
        triggerScore: decision.triggerScore,
        confidence: decision.confidence,
      };
    }

    const prevTranscription = lastTranscriptionRef.current;
    const prevAIResponse = lastAIResponseRef.current;
    const hasPendingMicResponse =
      channel === "system" &&
      prevTranscription.startsWith("[Tú]:") &&
      !isLastTranscriptionSavedRef.current;

    if (hasPendingMicResponse) {
      return;
    }

    let updatedMessages = [...conversationRef.current.messages];

    if (prevTranscription && !isLastTranscriptionSavedRef.current) {
      const timestamp = Date.now();
      const userMsg = {
        id: generateMessageId("user", timestamp),
        role: "user" as const,
        content: prevTranscription,
        timestamp,
      };
      const assistantMsg = {
        id: generateMessageId("assistant", timestamp + 1),
        role: "assistant" as const,
        content: prevAIResponse,
        timestamp: timestamp + 1,
      };
      updatedMessages.push(userMsg, assistantMsg);

      conversationRef.current = {
        ...conversationRef.current,
        messages: [...conversationRef.current.messages, userMsg, assistantMsg],
        updatedAt: timestamp,
        title: conversationRef.current.title || generateConversationTitle(prevTranscription),
      };

      setConversation(conversationRef.current);
      isLastTranscriptionSavedRef.current = true;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLastTranscription(displayTranscription);
    setLastAIResponse("");
    isLastTranscriptionSavedRef.current = !decision.shouldSaveToDb;

    const previousMessagesForAI = updatedMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    await processWithAI(
      decision.aiUserMessage,
      decision.aiSystemPrompt,
      previousMessagesForAI,
      decision.shouldSaveToDb,
      displayTranscription
    );
  }, [processWithAI]);

  const handleNewTranscription = useCallback(async (formattedText: string) => {
    if (!capturingRef.current) return;

    setError("");

    if (isStreamingModeRef.current) {
      if (formattedText.startsWith("[Tú]: ")) {
        await handleStreamingCopilotTranscription(
          "mic",
          formattedText.replace(/^\[Tú\]:\s*/, "")
        );
        return;
      }

      if (formattedText.startsWith("[Sistema]: ")) {
        await handleStreamingCopilotTranscription(
          "system",
          formattedText.replace(/^\[Sistema\]:\s*/, "")
        );
        return;
      }
    }

    let updatedMessages = [...conversationRef.current.messages];
    const prevTranscription = lastTranscriptionRef.current;
    const prevAIResponse = lastAIResponseRef.current;

    // Check if the current transcription is system loopback audio
    const isSystemText = formattedText.startsWith("[Sistema]: ");

    if (isSystemText) {
      const segmentText = formattedText.slice(11).trim();
      if (segmentText) {
        // Append to accumulated system text
        const prevAccumulated = accumulatedSystemTextRef.current;
        const newAccumulated = prevAccumulated ? `${prevAccumulated} ${segmentText}` : segmentText;
        setAccumulatedSystemText(newAccumulated);
        accumulatedSystemTextRef.current = newAccumulated;

        // Trigger AI processing with the fully accumulated system text so far!
        // But do NOT save it to database/history!
        const fullSystemTranscription = `[Sistema]: ${newAccumulated}`;

        if (prevTranscription && !isLastTranscriptionSavedRef.current) {
          const timestamp = Date.now();
          const userMsg = {
            id: generateMessageId("user", timestamp),
            role: "user" as const,
            content: prevTranscription,
            timestamp,
          };
          const assistantMsg = {
            id: generateMessageId("assistant", timestamp + 1),
            role: "assistant" as const,
            content: prevAIResponse,
            timestamp: timestamp + 1,
          };
          updatedMessages.push(userMsg, assistantMsg);

          conversationRef.current = {
            ...conversationRef.current,
            messages: [...conversationRef.current.messages, userMsg, assistantMsg],
            updatedAt: timestamp,
            title: conversationRef.current.title || generateConversationTitle(prevTranscription),
          };

          setConversation(conversationRef.current);
          isLastTranscriptionSavedRef.current = true;
        }

        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        setLastTranscription(fullSystemTranscription);
        setLastAIResponse("");
        setAccumulatedSystemText("");
        accumulatedSystemTextRef.current = "";
        setSystemInterimTranscription("");
        isLastTranscriptionSavedRef.current = true; // Set to true so we don't accidentally save it later

        const effectiveSystemPrompt = useSystemPromptRef.current
          ? systemPromptRef.current || DEFAULT_SYSTEM_PROMPT
          : contextContentRef.current || DEFAULT_SYSTEM_PROMPT;

        const previousMessagesForAI = updatedMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        await processWithAI(
          fullSystemTranscription,
          effectiveSystemPrompt,
          previousMessagesForAI,
          false // shouldSaveToDb = false
        );
      }
      return;
    }

    // Otherwise, it is mic audio ([Tú]: ...) or standard mode
    const isMicText = formattedText.startsWith("[Tú]: ");
    if (isMicText) {
      // Flush accumulated system text as a persistent message in conversation history!
      const accumulatedSystemToSave = accumulatedSystemTextRef.current;
      if (accumulatedSystemToSave && accumulatedSystemToSave.trim()) {
        // Clear accumulated system state
        setAccumulatedSystemText("");
        accumulatedSystemTextRef.current = "";

        const systemTimestamp = Date.now() - 5;
        const systemMsg = {
          id: generateMessageId("user", systemTimestamp),
          role: "user" as const,
          content: `[Sistema]: ${accumulatedSystemToSave.trim()}`,
          timestamp: systemTimestamp,
        };

        updatedMessages.push(systemMsg);

        conversationRef.current = {
          ...conversationRef.current,
          messages: [...conversationRef.current.messages, systemMsg],
          updatedAt: systemTimestamp,
        };
        setConversation(conversationRef.current);
      }
    }

    if (prevTranscription && !isLastTranscriptionSavedRef.current) {
      const timestamp = Date.now();
      const userMsg = {
        id: generateMessageId("user", timestamp),
        role: "user" as const,
        content: prevTranscription,
        timestamp,
      };
      const assistantMsg = {
        id: generateMessageId("assistant", timestamp + 1),
        role: "assistant" as const,
        content: prevAIResponse,
        timestamp: timestamp + 1,
      };
      updatedMessages.push(userMsg, assistantMsg);

      conversationRef.current = {
        ...conversationRef.current,
        messages: [...conversationRef.current.messages, userMsg, assistantMsg],
        updatedAt: timestamp,
        title: conversationRef.current.title || generateConversationTitle(prevTranscription),
      };

      setConversation(conversationRef.current);
      isLastTranscriptionSavedRef.current = true;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLastTranscription(formattedText);
    setLastAIResponse("");
    isLastTranscriptionSavedRef.current = false;

    const effectiveSystemPrompt = useSystemPromptRef.current
      ? systemPromptRef.current || DEFAULT_SYSTEM_PROMPT
      : contextContentRef.current || DEFAULT_SYSTEM_PROMPT;

    const previousMessagesForAI = updatedMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    await processWithAI(
      formattedText,
      effectiveSystemPrompt,
      previousMessagesForAI,
      true // shouldSaveToDb = true
    );
  }, [handleStreamingCopilotTranscription, processWithAI]);

  const handleNewTranscriptionRef = useRef(handleNewTranscription);
  useEffect(() => {
    handleNewTranscriptionRef.current = handleNewTranscription;
  }, [handleNewTranscription]);

  const processSpeechQueueRef = useRef(processSpeechQueue);
  useEffect(() => {
    processSpeechQueueRef.current = processSpeechQueue;
  }, [processSpeechQueue]);

  useEffect(() => {
    if (isDualChannel || isStreamingMode) return;
    if (discardQueuedSpeechUtterances("mic")) {
      processSpeechQueueRef.current();
    }
  }, [discardQueuedSpeechUtterances, isDualChannel, isStreamingMode]);

  const handleSystemSpeechStartRef = useRef(handleSystemSpeechStart);
  useEffect(() => {
    handleSystemSpeechStartRef.current = handleSystemSpeechStart;
  }, [handleSystemSpeechStart]);

  const handleMicSpeechStartRef = useRef(handleMicSpeechStart);
  useEffect(() => {
    handleMicSpeechStartRef.current = handleMicSpeechStart;
  }, [handleMicSpeechStart]);

  const dispatchStreamingTranscript = useCallback((channel: "mic" | "system", customText?: string) => {
    if (!capturingRef.current) return;

    try {
      const finalText =
        channel === "mic"
          ? customText ?? deepgramManagerRef.current?.getAccumulatedText() ?? ""
          : customText ?? "";
      const trimmedText = finalText.trim();

      if (!isStreamingModeRef.current || !trimmedText) {
        return;
      }

      if (channel === "mic") {
        deepgramManagerRef.current?.reset();
        setInterimTranscription("");

        let utterance = activeSpeechUtterancesRef.current.find(
          (u) => u.channel === "mic" && u.isRecording && !u.isDiscarded
        );

        if (!utterance) {
          utterance = {
            id: `mic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            startTime: Date.now() - STREAMING_DISPATCH_IDLE_MS,
            channel: "mic",
            isRecording: true,
            isProcessed: false,
            isDiscarded: false,
          };
          activeSpeechUtterancesRef.current.push(utterance);
        }

        utterance.isRecording = false;
        utterance.sttPromise = Promise.resolve(trimmedText);
      } else {
        setSystemInterimTranscription("");

        activeSpeechUtterancesRef.current.push({
          id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          startTime: Date.now() - STREAMING_DISPATCH_IDLE_MS,
          channel: "system",
          isRecording: false,
          isProcessed: false,
          isDiscarded: false,
          sttPromise: Promise.resolve(trimmedText),
        });
      }

      processSpeechQueueRef.current();
    } catch (err) {
      console.error(`[Streaming] Error dispatching ${channel} transcript:`, err);
      setError(`Streaming error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const clearStreamingPendingTranscript = useCallback((channel: "mic" | "system") => {
    const timer = streamingDispatchTimerRef.current[channel];
    if (timer !== null) {
      window.clearTimeout(timer);
      streamingDispatchTimerRef.current[channel] = null;
    }
    streamingPendingTextRef.current[channel] = "";
    lastStreamingAudioAtRef.current[channel] = 0;
  }, []);

  const flushStreamingPendingTranscript = useCallback((channel: "mic" | "system") => {
    const timer = streamingDispatchTimerRef.current[channel];
    if (timer !== null) {
      window.clearTimeout(timer);
      streamingDispatchTimerRef.current[channel] = null;
    }

    const finalText = streamingPendingTextRef.current[channel].trim();
    streamingPendingTextRef.current[channel] = "";

    if (!finalText || !capturingRef.current || !isStreamingModeRef.current) {
      return;
    }

    const idleForMs = Date.now() - lastStreamingAudioAtRef.current[channel];
    if (lastStreamingAudioAtRef.current[channel] > 0 && idleForMs < STREAMING_DISPATCH_IDLE_MS) {
      const delay = Math.max(50, STREAMING_DISPATCH_IDLE_MS - idleForMs);
      streamingPendingTextRef.current[channel] = finalText;
      streamingDispatchTimerRef.current[channel] = window.setTimeout(() => {
        streamingDispatchTimerRef.current[channel] = null;
        flushStreamingPendingTranscript(channel);
      }, delay);
      return;
    }

    dispatchStreamingTranscript(channel, finalText);
  }, [dispatchStreamingTranscript]);

  const scheduleStreamingPendingDispatch = useCallback((channel: "mic" | "system") => {
    const existingTimer = streamingDispatchTimerRef.current[channel];
    if (existingTimer !== null) {
      window.clearTimeout(existingTimer);
    }

    streamingDispatchTimerRef.current[channel] = window.setTimeout(() => {
      streamingDispatchTimerRef.current[channel] = null;
      flushStreamingPendingTranscript(channel);
    }, STREAMING_DISPATCH_IDLE_MS);
  }, [flushStreamingPendingTranscript]);

  const markStreamingAudioActivity = useCallback((channel: "mic" | "system") => {
    lastStreamingAudioAtRef.current[channel] = Date.now();

    if (!streamingPendingTextRef.current[channel].trim()) {
      return;
    }

    scheduleStreamingPendingDispatch(channel);
  }, [scheduleStreamingPendingDispatch]);

  const queueStreamingPendingTranscript = useCallback((channel: "mic" | "system", text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || !capturingRef.current || !isStreamingModeRef.current) {
      return;
    }

    streamingPendingTextRef.current[channel] = mergeStreamingTranscriptText(
      streamingPendingTextRef.current[channel],
      trimmedText
    );
    scheduleStreamingPendingDispatch(channel);
  }, [scheduleStreamingPendingDispatch]);

  const reportStreamingUsageSinceLastTick = useCallback(() => {
    const lastReportAt = streamingUsageLastReportAtRef.current;
    if (lastReportAt === null) return;

    const now = Date.now();
    const secondsUsed = (now - lastReportAt) / 1000;
    if (secondsUsed < 1) return;

    serverApi.reportStreamingSeconds(secondsUsed);
    streamingUsageLastReportAtRef.current = now;
  }, []);

  const startStreamingUsageReporting = useCallback(() => {
    const now = Date.now();
    if (streamingSessionStartRef.current === null) {
      streamingSessionStartRef.current = now;
    }
    if (streamingUsageLastReportAtRef.current === null) {
      streamingUsageLastReportAtRef.current = now;
    }
    if (streamingUsageReportTimerRef.current !== null) return;

    streamingUsageReportTimerRef.current = window.setInterval(
      reportStreamingUsageSinceLastTick,
      STREAMING_CREDIT_REPORT_INTERVAL_MS
    );
  }, [reportStreamingUsageSinceLastTick]);

  const stopStreamingUsageReporting = useCallback(() => {
    if (streamingUsageReportTimerRef.current !== null) {
      window.clearInterval(streamingUsageReportTimerRef.current);
      streamingUsageReportTimerRef.current = null;
    }

    reportStreamingUsageSinceLastTick();
    streamingUsageLastReportAtRef.current = null;
    streamingSessionStartRef.current = null;
  }, [reportStreamingUsageSinceLastTick]);

  useEffect(() => {
    return () => {
      stopStreamingUsageReporting();
    };
  }, [stopStreamingUsageReporting]);

  const initializeStreaming = useCallback(async (micMediaStream: MediaStream | null) => {
    streamingMicStreamRef.current = micMediaStream;
    if (deepgramManagerRef.current) {
      deepgramManagerRef.current.destroy();
      deepgramManagerRef.current = null;
    }

    // ── Obtener credenciales de Deepgram ────────────────────────────────────
    // Prioridad:
    //   1. API key local configurada por el usuario en STT Settings → usarla directamente
    //   2. Sin key local y server disponible → solicitar token efímero al servidor (licencia)
    //   3. Sin key local y server caído → mostrar error con instrucciones
    let tokenData: DeepgramTokenResponse;

    const sttVars = selectedSttProviderRef.current.variables || {};
    const localApiKey = sttVars.api_key || sttVars.API_KEY || "";

    if (localApiKey) {
      // El usuario configuró su propia API key → usarla sin pasar por el servidor
      tokenData = {
        token: localApiKey,
        model: sttVars.model || sttVars.MODEL || "nova-3",
        language: sttVars.language || sttVars.LANGUAGE || "es-419",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      deepgramTokenCacheRef.current = { token: tokenData, fetchedAt: Date.now() };
    } else {
      // Sin key local → intentar usar la key de licencia guardada o pedir token efímero
      try {
        const storage = await invoke<{
          license_key?: string;
          instance_id?: string;
          deepgram_api_key?: string;
          deepgram_model?: string;
          deepgram_language?: string;
        }>("secure_storage_get");

        if (storage.deepgram_api_key) {
          const licenseStillValid = await serverApi.ensureLicensedCredentialsValid();
          if (!licenseStillValid) {
            setError("Tu licencia ya no está activa. Actívala nuevamente para usar streaming.");
            setIsPopoverOpen(true);
            return;
          }

          tokenData = {
            token: storage.deepgram_api_key,
            model: storage.deepgram_model || "nova-3",
            language: storage.deepgram_language || "es-419",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          };
        } else {
          const now = Date.now();
          const cached = deepgramTokenCacheRef.current;
          const TOKEN_MARGIN_MS = 5 * 60 * 1000; // renovar 5 min antes de expirar

          if (cached && (now - cached.fetchedAt) < (55 * 60 * 1000 - TOKEN_MARGIN_MS)) {
            tokenData = cached.token;
          } else {
            const licenseKey = storage.license_key ?? "";
            const instanceId = storage.instance_id ?? "";

            if (!licenseKey || !instanceId) {
              setError("Streaming requiere una licencia activa o configura tu API key de Deepgram en Settings.");
              setIsPopoverOpen(true);
              return;
            }

            tokenData = await serverApi.getDeepgramToken(licenseKey, instanceId);
            deepgramTokenCacheRef.current = { token: tokenData, fetchedAt: now };
          }
        }
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(errMsg || "No se pudo obtener acceso a Deepgram. Configura tu API key en Deepgram Streaming Settings o verifica tu conexión al servidor.");
        setIsPopoverOpen(true);
        return;
      }
    }

    const config = {
      apiKey: tokenData.token,
      model: tokenData.model,
      language: tokenData.language,
      utteranceEndMs: 1000,
      endpointing: 10,
    };

    // 1. Microphone Deepgram Stream (Only if micMediaStream is available and we are in Dual Channel / Multihilo mode)
    if (micMediaStream && isDualChannelRef.current) {
      const micCallbacks = {
        onTranscript: (_text: string, _isFinal: boolean, fullAccumulated: string) => {
          setInterimTranscription(fullAccumulated);
          markStreamingAudioActivity("mic");
        },
        onUtteranceEnd: (finalText: string) => {
          if (finalText.trim() && capturingRef.current) {
            queueStreamingPendingTranscript("mic", finalText);
          }
        },
        onError: (error: Error) => {
          console.error("[Streaming] Mic Deepgram error:", error);
          setError(`Deepgram Streaming (Mic): ${error.message}`);
          setIsPopoverOpen(true);
        },
        onAudioActivity: () => {
          markStreamingAudioActivity("mic");
        },
      };
      const micManager = new DeepgramStreamManager(config, micCallbacks);
      deepgramManagerRef.current = micManager;
      console.log("[Streaming] Starting microphone stream...");
      await micManager.start(micMediaStream);
      startStreamingUsageReporting();
    }

    // 2. System Audio Deepgram Stream (via Rust — handles capture + WebSocket internally)
    const deviceId =
      selectedAudioDevices.output.id !== "default"
        ? selectedAudioDevices.output.id
        : null;

    try {
      await invoke("start_system_deepgram_stream", {
        apiKey: config.apiKey,
        model: config.model,
        language: config.language,
        deviceId,
      });
      startStreamingUsageReporting();
    } catch (err) {
      console.error("[Streaming] Failed to start system Deepgram stream:", err);
      setError(`Failed to start system stream: ${err}`);
      setIsPopoverOpen(true);
    }
  }, [
    queueStreamingPendingTranscript,
    markStreamingAudioActivity,
    selectedAudioDevices.output.id,
    startStreamingUsageReporting,
  ]);

  const handleMicSpeechDetected = useCallback((audioBlob: Blob) => {
    if (!capturingRef.current) return;

    if (isStreamingModeRef.current) {
      // In streaming mode, Deepgram handles utterance detection and dispatching.
      return;
    }

    let utterance = activeSpeechUtterancesRef.current.find(
      (u) => u.channel === "mic" && u.isRecording && !u.isDiscarded
    );

    if (!utterance) {
      console.warn("[Queue] Received handleMicSpeechDetected without handleMicSpeechStart");
      utterance = {
        id: `mic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startTime: Date.now() - 1000, // Estimate start time
        channel: "mic",
        isRecording: true,
        isProcessed: false,
        isDiscarded: false,
      };
      activeSpeechUtterancesRef.current.push(utterance);
    }

    utterance.isRecording = false;
    utterance.audioBlob = audioBlob;

    // Trigger the STT immediately in parallel!
    utterance.sttPromise = (async () => {
      const providerConfig = allSttProvidersRef.current.find(
        (p) => p.id === selectedSttProviderRef.current.provider
      );

      return fetchSTT({
        provider: providerConfig,
        selectedProvider: selectedSttProviderRef.current,
        audio: audioBlob,
        useInvisibleAIAPI: invisibleaiApiEnabledRef.current,
      });
    })();

    processSpeechQueue();
  }, [processSpeechQueue]);

  const transcribeManualMicAudio = useCallback(
    async (audioBlob: Blob) => {
      handleMicSpeechDetected(audioBlob);
    },
    [handleMicSpeechDetected]
  );

  useEffect(() => {
    let speechUnlisten: (() => void) | undefined;
    let startUnlisten: (() => void) | undefined;
    let discardedUnlisten: (() => void) | undefined;
    let debugUnlisten: (() => void) | undefined;
    let streamStateUnlisten: (() => void) | undefined;
    let streamTranscriptUnlisten: (() => void) | undefined;
    let streamUtteranceEndUnlisten: (() => void) | undefined;
    let streamAudioActivityUnlisten: (() => void) | undefined;
    let streamErrorUnlisten: (() => void) | undefined;
    let cancelled = false;

    const setupEventListeners = async () => {
      try {
        // Diagnostic listener for classic (non-streaming) system audio debug
        const uDebug = await listen<{
          sample_rate: number;
          raw_rms: number;
          raw_peak: number;
          is_speech: boolean;
          in_speech: boolean;
          speech_chunks: number;
          silence_chunks: number;
          emitted_event: string;
        }>("classic-system-audio-debug", (event) => {
          const d = event.payload;
          if (d.raw_rms > 0.001 || d.is_speech || d.in_speech) {
            console.log(
              `[ClassicSystemAudio] rms=${d.raw_rms.toFixed(4)} peak=${d.raw_peak.toFixed(4)} speech=${d.is_speech} in_speech=${d.in_speech} chunks=${d.speech_chunks} silence=${d.silence_chunks} event=${d.emitted_event}`
            );
          }
        });
        if (cancelled) { uDebug(); return; }
        debugUnlisten = uDebug;

        const uStart = await listen("speech-start", () => {
          if (isStreamingModeRef.current) return;
          console.log("[ClassicSystemAudio] speech-start received");
          handleSystemSpeechStartRef.current();
        });
        if (cancelled) { uStart(); return; }
        startUnlisten = uStart;

        const uDetected = await listen("speech-detected", async (event) => {
          if (isStreamingModeRef.current) return;
          if (!capturingRef.current) return;

          const base64Audio = event.payload as string;
          console.log(`[ClassicSystemAudio] speech-detected received, base64 length=${base64Audio.length}`);

          if (!vadConfigRef.current.enabled) {
            console.warn("Ignoring system loopback transcription in Manual mode");
            return;
          }

          let utterance = activeSpeechUtterancesRef.current.find(
            (u) => u.channel === "system" && u.isRecording && !u.isDiscarded
          );

          if (!utterance) {
            console.warn("[Queue] Received speech-detected without speech-start on system channel");
            utterance = {
              id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              startTime: Date.now() - 2000,
              channel: "system",
              isRecording: true,
              isProcessed: false,
              isDiscarded: false,
            };
            activeSpeechUtterancesRef.current.push(utterance);
          }

          utterance.isRecording = false;
          utterance.base64Audio = base64Audio;

          utterance.sttPromise = (async () => {
            let providerConfig = allSttProvidersRef.current.find(
              (p) => p.id === selectedSttProviderRef.current.provider
            );

            if (providerConfig?.id === "deepgram-streaming") {
              const vars = selectedSttProviderRef.current.variables || {};
              const apiKey = vars.api_key || vars.API_KEY || "";
              const model = vars.model || "nova-3";
              const language = vars.language || "es-419";
              providerConfig = {
                id: "deepgram-stt",
                name: "Deepgram Speech-to-Text",
                curl: `curl -X POST "https://api.deepgram.com/v1/listen?model=${model}&language=${language}" -H "Authorization: Token ${apiKey}" -H "Content-Type: audio/wav" --data-binary {{AUDIO}}`,
                responseContentPath: "results.channels[0].alternatives[0].transcript",
                streaming: false,
              };
            }

            const binaryStr = atob(base64Audio);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            const audioBlob = new Blob([bytes], { type: "audio/wav" });

            try {
              const result = await fetchSTT({
                provider: providerConfig,
                selectedProvider: selectedSttProviderRef.current,
                audio: audioBlob,
                useInvisibleAIAPI: invisibleaiApiEnabledRef.current,
              });
              console.log(`[ClassicSystemAudio] STT result: "${result?.substring(0, 100)}..."`);
              return result;
            } catch (sttErr) {
              console.error(`[ClassicSystemAudio] STT error:`, sttErr);
              throw sttErr;
            }
          })();

          processSpeechQueueRef.current();
        });
        if (cancelled) { uDetected(); return; }
        speechUnlisten = uDetected;

        const uDiscarded = await listen("speech-discarded", (event) => {
          if (isStreamingModeRef.current) return;
          if (!vadConfigRef.current.enabled) {
            console.warn("Ignoring system loopback speech-discarded in Manual mode");
            return;
          }

          console.log("[Queue] Speech discarded event:", event.payload);

          const utterance = activeSpeechUtterancesRef.current.find(
            (u) => u.channel === "system" && u.isRecording && !u.isDiscarded
          );

          if (utterance) {
            utterance.isDiscarded = true;
            utterance.isRecording = false;
          }

          processSpeechQueueRef.current();
        });
        if (cancelled) { uDiscarded(); return; }
        discardedUnlisten = uDiscarded;

        // Rust system Deepgram stream events
        const uStreamState = await listen<string>("system-stream-state", (event) => {
          console.log("[Streaming] System stream state changed:", event.payload);
        });
        if (cancelled) { uStreamState(); return; }
        streamStateUnlisten = uStreamState;

        const uStreamTranscript = await listen<{ text: string; is_final: boolean; accumulated: string }>(
          "system-stream-transcript",
          (event) => {
            if (!capturingRef.current || !isStreamingModeRef.current) {
              return;
            }
            setSystemInterimTranscription(event.payload.accumulated);
            markStreamingAudioActivity("system");
          }
        );
        if (cancelled) { uStreamTranscript(); return; }
        streamTranscriptUnlisten = uStreamTranscript;

        const uStreamUtteranceEnd = await listen<{ text: string }>(
          "system-stream-utterance-end",
          (event) => {
            if (!capturingRef.current || !isStreamingModeRef.current) {
              return;
            }
            const { text } = event.payload;
            if (!text.trim()) return;

            queueStreamingPendingTranscript("system", text);
          }
        );
        if (cancelled) { uStreamUtteranceEnd(); return; }
        streamUtteranceEndUnlisten = uStreamUtteranceEnd;

        const uStreamAudioActivity = await listen<{ rms: number; peak: number }>(
          "system-stream-audio-activity",
          () => {
            if (!capturingRef.current || !isStreamingModeRef.current) {
              return;
            }
            markStreamingAudioActivity("system");
          }
        );
        if (cancelled) { uStreamAudioActivity(); return; }
        streamAudioActivityUnlisten = uStreamAudioActivity;

        const uStreamError = await listen<string>("system-stream-error", (event) => {
          console.error("[Streaming] System Deepgram error from Rust:", event.payload);
          if (!capturingRef.current) return;
          setError(`Deepgram Streaming (System): ${event.payload}`);
          setIsPopoverOpen(true);
        });
        if (cancelled) { uStreamError(); return; }
        streamErrorUnlisten = uStreamError;

      } catch (err) {
        setError("Failed to setup speech listeners");
      }
    };

    setupEventListeners();

    return () => {
      cancelled = true;
      if (speechUnlisten) speechUnlisten();
      if (startUnlisten) startUnlisten();
      if (discardedUnlisten) discardedUnlisten();
      if (debugUnlisten) debugUnlisten();
      if (streamStateUnlisten) streamStateUnlisten();
      if (streamTranscriptUnlisten) streamTranscriptUnlisten();
      if (streamUtteranceEndUnlisten) streamUtteranceEndUnlisten();
      if (streamAudioActivityUnlisten) streamAudioActivityUnlisten();
      if (streamErrorUnlisten) streamErrorUnlisten();
      clearStreamingPendingTranscript("mic");
      clearStreamingPendingTranscript("system");
    };
  }, [
    clearStreamingPendingTranscript,
    queueStreamingPendingTranscript,
    markStreamingAudioActivity,
  ]);

  const startCapture = useCallback(async () => {
    try {
      setError("");
      vadConfigRef.current = vadConfig;
      resetSpeechQueue();
      clearStreamingPendingTranscript("mic");
      clearStreamingPendingTranscript("system");
      resetStreamingCopilotBuffers();

      const hasAccess = await invoke<boolean>("check_system_audio_access");
      if (!hasAccess) {
        setSetupRequired(true);
        setIsPopoverOpen(true);
        return;
      }

      const isContinuous = !vadConfig.enabled;

      const conversationId = generateConversationId("sysaudio");
      setConversation({
        id: conversationId,
        title: "",
        messages: [],
        createdAt: 0,
        updatedAt: 0,
      });

      setCapturing(true);
      capturingRef.current = true;
      setIsPopoverOpen(true);
      setIsContinuousMode(isContinuous);
      setRecordingProgress(0);

      const currentSttProvider = allSttProvidersRef.current.find(
        (p) => p.id === selectedSttProviderRef.current.provider
      );
      const streamingEnabled = invisibleaiApiEnabled || currentSttProvider?.streaming === true;
      setIsStreamingMode(streamingEnabled);
      isStreamingModeRef.current = streamingEnabled;
      setInterimTranscription("");
      setSystemInterimTranscription("");

      if (isContinuous && !streamingEnabled) {
        setIsRecordingInContinuousMode(false);
        return;
      }

      await stopFrontendMicRecording(false);
      await invoke<string>("stop_system_audio_capture");
      stopStreamingUsageReporting();
      try { await invoke("stop_system_deepgram_stream"); } catch {}

      if (streamingEnabled) {
        // Streaming mode: Rust handles system audio capture + Deepgram WebSocket directly
        if (isDualChannel) {
          const micStream = await getMicrophoneStream(selectedAudioDevices.input.id);
          setMicStream(micStream);
          streamingMicStreamRef.current = micStream;
          await initializeStreaming(micStream);
        } else {
          await initializeStreaming(null);
        }
      } else {
        // Non-streaming mode: classic VAD capture
        const deviceId =
          selectedAudioDevices.output.id !== "default"
            ? selectedAudioDevices.output.id
            : null;

        await invoke<string>("start_system_audio_capture", {
          vadConfig: vadConfig,
          deviceId: deviceId,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setIsPopoverOpen(true);
    }
  }, [
    resetSpeechQueue,
    clearStreamingPendingTranscript,
    resetStreamingCopilotBuffers,
    vadConfig,
    selectedAudioDevices.output.id,
    stopFrontendMicRecording,
    isDualChannel,
    initializeStreaming,
    stopStreamingUsageReporting,
  ]);

  const stopCapture = useCallback(async () => {
    try {
      stopStreamingUsageReporting();

      if (deepgramManagerRef.current) {
        deepgramManagerRef.current.destroy();
        deepgramManagerRef.current = null;
      }
      try { await invoke("stop_system_deepgram_stream"); } catch {}
      setIsStreamingMode(false);
      isStreamingModeRef.current = false;
      clearStreamingPendingTranscript("mic");
      clearStreamingPendingTranscript("system");
      resetStreamingCopilotBuffers();
      setInterimTranscription("");
      setSystemInterimTranscription("");
      streamingMicStreamRef.current = null;

      // Clear new states
      setAccumulatedSystemText("");
      accumulatedSystemTextRef.current = "";
      setScreenshotImage(null);

      resetSpeechQueue();

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      await stopFrontendMicRecording(false);
      await invoke<string>("stop_system_audio_capture");

      setCapturing(false);
      capturingRef.current = false;
      setIsProcessing(false);
      setIsAIProcessing(false);
      setIsContinuousMode(false);
      setIsRecordingInContinuousMode(false);
      setRecordingProgress(0);
      setLastTranscription("");
      setLastAIResponse("");
      setError("");
      setIsPopoverOpen(false);
      setMicStream(null);

      // Update streaming credits balance after session ends
      serverApi.refreshBalance();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to stop capture: ${errorMessage}`);
      console.error("Stop capture error:", err);
    }
  }, [
    clearStreamingPendingTranscript,
    resetSpeechQueue,
    resetStreamingCopilotBuffers,
    stopFrontendMicRecording,
    stopStreamingUsageReporting,
  ]);

  const manualStopAndSend = useCallback(async () => {
    try {
      if (!isContinuousMode) {
        console.warn("Not in continuous mode");
        return;
      }

      setIsProcessing(true);

      const micAudio = await stopFrontendMicRecording(true);
      await invoke("manual_stop_continuous");

      if (!micAudio) {
        setError("No microphone audio recorded. Please try again.");
        setIsProcessing(false);
        return;
      }

      await transcribeManualMicAudio(micAudio);
      setIsProcessing(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to manually stop: ${errorMessage}`);
      setIsProcessing(false);
      console.error("Manual stop error:", err);
    }
  }, [
    isContinuousMode,
    stopFrontendMicRecording,
    transcribeManualMicAudio,
  ]);

  const handleSetup = useCallback(async () => {
    try {
      const platform = navigator.platform.toLowerCase();

      if (platform.includes("mac") || platform.includes("win")) {
        await invoke("request_system_audio_access");
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const hasAccess = await invoke<boolean>("check_system_audio_access");
      if (hasAccess) {
        setSetupRequired(false);
        await startCapture();
      } else {
        setSetupRequired(true);
        setError("Permission not granted. Please try the manual steps.");
      }
    } catch (err) {
      setError("Failed to request access. Please try the manual steps below.");
      setSetupRequired(true);
    }
  }, [startCapture]);

  useEffect(() => {
    const shouldOpenPopover =
      capturing ||
      setupRequired ||
      isAIProcessing ||
      !!lastAIResponse ||
      !!error;
    setIsPopoverOpen(shouldOpenPopover);
    resizeWindow(shouldOpenPopover);
  }, [
    capturing,
    setupRequired,
    isAIProcessing,
    lastAIResponse,
    error,
    resizeWindow,
  ]);

  useEffect(() => {
    globalShortcuts.registerSystemAudioCallback(async () => {
      if (capturing) {
        await stopCapture();
      } else {
        await startCapture();
      }
    });
  }, [startCapture, stopCapture]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (mediaRecorderRef.current?.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore cleanup errors during unmount.
        }
      }
      manualMicStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      mediaRecorderRef.current = null;
      manualMicStreamRef.current = null;
      audioChunksRef.current = [];
      invoke("stop_system_audio_capture").catch(() => { });
    };
  }, []);

  useEffect(() => {

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (
      !conversation.id ||
      conversation.updatedAt === 0 ||
      conversation.messages.length === 0
    ) {
      return;
    }

    saveTimeoutRef.current = setTimeout(async () => {

      if (isSavingRef.current) {
        return;
      }

      try {
        isSavingRef.current = true;
        await saveConversation(conversation);

        const useMemory = safeLocalStorage.getItem("system_audio_use_memory") === "true";
        if (useMemory && conversation.messages.length > 0 && conversation.messages.length % 4 === 0) {
          const provider = allAiProviders.find((p) => p.id === selectedAIProvider.provider);
          extractAndStoreMemories(
            conversation.id,
            conversation.messages,
            provider,
            selectedAIProvider,
            invisibleaiApiEnabled
          ).catch(err => console.error("Background memory extraction failed:", err));
        }

      } catch (error) {
        console.error("Failed to save system audio conversation:", error);
      } finally {
        isSavingRef.current = false;
      }
    }, CONVERSATION_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    conversation.messages.length,
    conversation.title,
    conversation.id,
    conversation.updatedAt,
    allAiProviders,
    selectedAIProvider,
    invisibleaiApiEnabled,
  ]);

  const startNewConversation = useCallback(() => {
    setConversation({
      id: generateConversationId("sysaudio"),
      title: "",
      messages: [],
      createdAt: 0,
      updatedAt: 0,
    });
    setLastTranscription("");
    setLastAIResponse("");
    setError("");
    setSetupRequired(false);
    setIsProcessing(false);
    setIsAIProcessing(false);
    setIsPopoverOpen(false);
    setUseSystemPrompt(true);
    useSystemPromptRef.current = true;
    saveContextSettings(true, contextContentRef.current);
    isLastTranscriptionSavedRef.current = true;
    setAccumulatedSystemText("");
    accumulatedSystemTextRef.current = "";
    resetStreamingCopilotBuffers();
    setScreenshotImage(null);
  }, [resetStreamingCopilotBuffers, saveContextSettings]);

  const updateVadConfiguration = useCallback(async (config: VadConfig, overrideDualChannel?: boolean) => {
    // Clear any stuck utterances from the previous mode before switching
    resetSpeechQueue();

    const prevEnabled = vadConfig.enabled;
    vadConfigRef.current = config;
    setVadConfig(config);
    safeLocalStorage.setItem("vad_config", JSON.stringify(config));

    const activeDualChannel = overrideDualChannel !== undefined ? overrideDualChannel : isDualChannel;

    if (!activeDualChannel && discardQueuedSpeechUtterances("mic")) {
      processSpeechQueueRef.current();
    }

    // Determine if the current provider supports real-time streaming
    const currentSttProvider = allSttProvidersRef.current.find(
      (p) => p.id === selectedSttProviderRef.current.provider
    );
    const streamingEnabled = invisibleaiApiEnabled || currentSttProvider?.streaming === true;

    if (isStreamingModeRef.current) {
      // Case 1: Currently in streaming mode, but switching to Manual mode (vadConfig.enabled becomes false)
      if (!config.enabled) {
        try {
          stopStreamingUsageReporting();
          if (deepgramManagerRef.current) {
            deepgramManagerRef.current.destroy();
            deepgramManagerRef.current = null;
          }
          try { await invoke("stop_system_deepgram_stream"); } catch {}
          setIsStreamingMode(false);
          isStreamingModeRef.current = false;
          clearStreamingPendingTranscript("mic");
          clearStreamingPendingTranscript("system");
          resetStreamingCopilotBuffers();
          setInterimTranscription("");
          setSystemInterimTranscription("");
          if (streamingMicStreamRef.current) {
            try {
              streamingMicStreamRef.current.getTracks().forEach((track) => {
                track.stop();
                track.enabled = false;
              });
            } catch { }
            streamingMicStreamRef.current = null;
          }
          await invoke("stop_system_audio_capture");
        } catch (error) {
          console.error("Failed to stop streaming on mode switch to Manual:", error);
        }
      }
      return;
    }

    // Case 2: Currently in non-streaming mode, and switching modes
    try {
      if (capturingRef.current && prevEnabled !== config.enabled) {
        if (!config.enabled) {
          // Switched from VAD to Manual
          await invoke("stop_system_audio_capture");
        } else {
          // Switched from Manual to VAD (Auto/Multihilo)
          await invoke("stop_system_audio_capture");
          const deviceId =
            selectedAudioDevices.output.id !== "default"
              ? selectedAudioDevices.output.id
              : null;

          if (streamingEnabled) {
            setIsStreamingMode(true);
            isStreamingModeRef.current = true;
            clearStreamingPendingTranscript("mic");
            clearStreamingPendingTranscript("system");
            resetStreamingCopilotBuffers();
            setInterimTranscription("");
            setSystemInterimTranscription("");

            if (activeDualChannel) {
              const micStream = await getMicrophoneStream(selectedAudioDevices.input.id);
              setMicStream(micStream);
              streamingMicStreamRef.current = micStream;
              await initializeStreaming(micStream);
            } else {
              console.log("[Streaming] Switched to Auto mode, starting system stream via Rust");
              await initializeStreaming(null);
            }
          } else {
            await invoke("start_system_audio_capture", {
              vadConfig: config,
              deviceId: deviceId,
            });
          }
        }
      } else if (capturingRef.current && config.enabled && !streamingEnabled) {
        const isBackendCapturing = await invoke<boolean>("get_capture_status").catch(() => false);
        if (!isBackendCapturing) {
          const deviceId =
            selectedAudioDevices.output.id !== "default"
              ? selectedAudioDevices.output.id
              : null;

          await invoke("start_system_audio_capture", {
            vadConfig: config,
            deviceId,
          });
        }
      }
    } catch (error) {
      console.error("Failed to update VAD config:", error);
    }
  }, [
    clearStreamingPendingTranscript,
    discardQueuedSpeechUtterances,
    resetSpeechQueue,
    resetStreamingCopilotBuffers,
    vadConfig.enabled,
    selectedAudioDevices.output.id,
    selectedAudioDevices.input.id,
    isDualChannel,
    initializeStreaming,
    stopStreamingUsageReporting,
  ]);
  // Dynamically add/remove microphone stream when switching between Auto and Multihilo during active streaming
  useEffect(() => {
    if (!capturing || !isStreamingMode) return;

    let cancelled = false;

    if (isDualChannel) {
      // Switched to Multihilo: add mic stream (system stream stays in Rust)
      if (!deepgramManagerRef.current) {
        (async () => {
          try {
            const micStream = await getMicrophoneStream(selectedAudioDevices.input.id);
            if (cancelled) {
              micStream.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
              return;
            }
            setMicStream(micStream);
            streamingMicStreamRef.current = micStream;

            // Usar credenciales cacheadas (key local o token del servidor, ya obtenido en initializeStreaming)
            const cached = deepgramTokenCacheRef.current;
            if (!cached || cancelled) return;

            const config = {
              apiKey: cached.token.token,
              model: cached.token.model,
              language: cached.token.language,
              utteranceEndMs: 1000,
              endpointing: 10,
            };

            const micCallbacks = {
              onTranscript: (_text: string, _isFinal: boolean, fullAccumulated: string) => {
                setInterimTranscription(fullAccumulated);
                markStreamingAudioActivity("mic");
              },
              onUtteranceEnd: (finalText: string) => {
                if (finalText.trim() && capturingRef.current) {
                  queueStreamingPendingTranscript("mic", finalText);
                }
              },
              onError: (error: Error) => {
                console.error("[Streaming] Mic Deepgram error:", error);
                setError(`Deepgram Streaming (Mic): ${error.message}`);
              },
              onAudioActivity: () => {
                markStreamingAudioActivity("mic");
              },
            };

            if (cancelled) return;
            const micManager = new DeepgramStreamManager(config, micCallbacks);
            deepgramManagerRef.current = micManager;
            await micManager.start(micStream);
            if (cancelled) {
              micManager.destroy();
              deepgramManagerRef.current = null;
            }
          } catch (err) {
            if (!cancelled) console.error("Failed to add mic stream for Multihilo:", err);
          }
        })();
      }
    } else {
      // Switched to Auto: destroy mic manager (system stream stays in Rust)
      if (deepgramManagerRef.current) {
        deepgramManagerRef.current.destroy();
        deepgramManagerRef.current = null;
      }
      clearStreamingPendingTranscript("mic");
      setInterimTranscription("");
      setMicStream(null);
      if (streamingMicStreamRef.current) {
        try {
          streamingMicStreamRef.current.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
        } catch { }
        streamingMicStreamRef.current = null;
      }
    }

    return () => { cancelled = true; };
  }, [
    capturing,
    clearStreamingPendingTranscript,
    isDualChannel,
    isStreamingMode,
    markStreamingAudioActivity,
    queueStreamingPendingTranscript,
    selectedAudioDevices.input.id,
  ]);

  // React to STT provider changes during active capture:
  // Transition between streaming and non-streaming modes when the user switches providers.
  useEffect(() => {
    if (!capturing) return;
    // Only handle transitions during Auto/Multihilo mode (vadConfig.enabled === true)
    if (!vadConfig.enabled) return;

    const currentSttProvider = allSttProviders.find(
      (p) => p.id === selectedSttProvider.provider
    );
    const providerSupportsStreaming = invisibleaiApiEnabled || currentSttProvider?.streaming === true;

    // No transition needed if modes are already aligned
    if (providerSupportsStreaming === isStreamingMode) return;

    const transitionProvider = async () => {
      const deviceId =
        selectedAudioDevices.output.id !== "default"
          ? selectedAudioDevices.output.id
          : null;

      if (providerSupportsStreaming && !isStreamingMode) {
        // Transition: non-streaming → streaming
        console.log("[Provider Switch] Transitioning to streaming mode");
        try {
          resetSpeechQueue();
          await invoke("stop_system_audio_capture");

          let micStream: MediaStream | null = null;
          if (isDualChannel) {
            try {
              micStream = await getMicrophoneStream(selectedAudioDevices.input.id);
              streamingMicStreamRef.current = micStream;
              setMicStream(micStream);
            } catch (micError) {
              console.warn(
                "[Provider Switch] Could not acquire microphone stream; continuing with system audio streaming only:",
                micError
              );
              streamingMicStreamRef.current = null;
              setMicStream(null);
            }
          }

          setIsStreamingMode(true);
          isStreamingModeRef.current = true;
          clearStreamingPendingTranscript("mic");
          clearStreamingPendingTranscript("system");
          resetStreamingCopilotBuffers();
          setInterimTranscription("");
          setSystemInterimTranscription("");

          await initializeStreaming(micStream);
          setError("");
        } catch (err) {
          console.error("[Provider Switch] Failed to transition to streaming:", err);
          stopStreamingUsageReporting();
          if (streamingMicStreamRef.current) {
            try {
              streamingMicStreamRef.current.getTracks().forEach((track) => {
                track.stop();
                track.enabled = false;
              });
            } catch { }
            streamingMicStreamRef.current = null;
          }
          setIsStreamingMode(false);
          isStreamingModeRef.current = false;
          clearStreamingPendingTranscript("mic");
          clearStreamingPendingTranscript("system");
          resetStreamingCopilotBuffers();
          setInterimTranscription("");
          setSystemInterimTranscription("");
          setMicStream(null);
          try {
            await invoke("start_system_audio_capture", {
              vadConfig,
              deviceId,
            });
          } catch (fallbackError) {
            console.error("[Provider Switch] Failed to restore classic capture:", fallbackError);
          }
        }
      } else if (!providerSupportsStreaming && isStreamingMode) {
        // Transition: streaming → non-streaming (classic VAD)
        console.log("[Provider Switch] Transitioning to non-streaming (classic VAD) mode");
        try {
          resetSpeechQueue();
          stopStreamingUsageReporting();
          // Tear down mic Deepgram manager
          if (deepgramManagerRef.current) {
            deepgramManagerRef.current.destroy();
            deepgramManagerRef.current = null;
          }
          // Stop Rust-side system Deepgram stream
          await invoke("stop_system_deepgram_stream");

          setIsStreamingMode(false);
          isStreamingModeRef.current = false;
          resetStreamingCopilotBuffers();
          setInterimTranscription("");
          setSystemInterimTranscription("");

          // Stop mic stream if it was used for streaming
          if (streamingMicStreamRef.current) {
            try {
              streamingMicStreamRef.current.getTracks().forEach((track) => {
                track.stop();
                track.enabled = false;
              });
            } catch { }
            streamingMicStreamRef.current = null;
          }

          // Restart backend with classic VAD config
          await invoke("start_system_audio_capture", {
            vadConfig,
            deviceId,
          });
        } catch (err) {
          console.error("[Provider Switch] Failed to transition to non-streaming:", err);
          setError(`Failed to switch provider: ${err}`);
        }
      }
    };

    transitionProvider();
  }, [
    allSttProviders,
    capturing,
    clearStreamingPendingTranscript,
    initializeStreaming,
    isDualChannel,
    isStreamingMode,
    resetSpeechQueue,
    resetStreamingCopilotBuffers,
    stopStreamingUsageReporting,
    selectedAudioDevices.input.id,
    selectedAudioDevices.output.id,
    selectedSttProvider.provider,
    vadConfig,
  ]);

  useEffect(() => {
    if (capturing) {
      setIsContinuousMode(!vadConfig.enabled);

      if (!vadConfig.enabled) {
        setIsRecordingInContinuousMode(false);
      }
    }
  }, [vadConfig.enabled, capturing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPopoverOpen) return;

      const scrollElement = scrollAreaRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLElement;

      if (!scrollElement) return;

      const scrollAmount = 100;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        scrollElement.scrollBy({ top: scrollAmount, behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        scrollElement.scrollBy({ top: -scrollAmount, behavior: "smooth" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPopoverOpen]);

  useEffect(() => {
    const handleRecordingShortcuts = (e: KeyboardEvent) => {
      if (!isPopoverOpen || !isContinuousMode) return;
      if (isProcessing || isAIProcessing) return;

      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (!isRecordingInContinuousMode) {
          startContinuousRecording();
        } else {
          manualStopAndSend();
        }
      }

      if (e.key === "Escape" && isRecordingInContinuousMode) {
        e.preventDefault();
        ignoreContinuousRecording();
      }

      if (
        e.key === " " &&
        !isRecordingInContinuousMode &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        startContinuousRecording();
      }
    };

    window.addEventListener("keydown", handleRecordingShortcuts);
    return () =>
      window.removeEventListener("keydown", handleRecordingShortcuts);
  }, [
    isPopoverOpen,
    isContinuousMode,
    isRecordingInContinuousMode,
    isProcessing,
    isAIProcessing,
    startContinuousRecording,
    manualStopAndSend,
    ignoreContinuousRecording,
  ]);

  return {
    capturing,
    isProcessing,
    isAIProcessing,
    lastTranscription,
    lastAIResponse,
    error,
    setError,
    setupRequired,
    startCapture,
    stopCapture,
    handleSetup,
    isPopoverOpen,
    setIsPopoverOpen,

    conversation,
    setConversation,

    processWithAI,

    useSystemPrompt,
    setUseSystemPrompt: updateUseSystemPrompt,
    contextContent,
    setContextContent: updateContextContent,
    startNewConversation,

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

    isContinuousMode,
    isRecordingInContinuousMode,
    recordingProgress,
    manualStopAndSend,
    startContinuousRecording,
    ignoreContinuousRecording,

    scrollAreaRef,

    isDualChannel,
    setIsDualChannel: updateDualChannel,
    handleMicSpeechStart,
    handleMicSpeechDetected,
    micStream,
    setMicStream,

    useConversationalMemory,
    setUseConversationalMemory: updateConversationalMemory,

    isStreamingMode,
    streamingSmartMode,
    setStreamingSmartMode: updateStreamingSmartMode,
    interimTranscription,
    systemInterimTranscription,
    initializeStreaming,

    screenshotImage,
    isCapturingScreenshot,
    accumulatedSystemText,
    handleCaptureScreenshot,
    handleRemoveScreenshot,
  };
}

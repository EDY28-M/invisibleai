import { useEffect, useState, useCallback, useRef } from "react";
import { useWindowResize, useGlobalShortcuts } from ".";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useApp } from "@/contexts";
import { fetchSTT, fetchAIResponse, DeepgramStreamManager } from "@/lib/functions";
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
  sensitivity_rms: 0.012,
  peak_threshold: 0.035,
  silence_chunks: 25,
  min_speech_chunks: 7,
  pre_speech_chunks: 12,
  noise_gate_threshold: 0.003,
  max_recording_duration_secs: 180,
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
  const [screenshotImage, setScreenshotImage] = useState<string | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState<boolean>(false);
  const [accumulatedSystemText, setAccumulatedSystemText] = useState<string>("");

  const deepgramManagerRef = useRef<DeepgramStreamManager | null>(null);
  const systemDeepgramManagerRef = useRef<DeepgramStreamManager | null>(null);
  const isStreamingModeRef = useRef<boolean>(false);
  const streamingMicStreamRef = useRef<MediaStream | null>(null);
  const accumulatedSystemTextRef = useRef<string>("");

  useEffect(() => { isStreamingModeRef.current = isStreamingMode; }, [isStreamingMode]);
  useEffect(() => { accumulatedSystemTextRef.current = accumulatedSystemText; }, [accumulatedSystemText]);

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

  const conversationRef = useRef(conversation);
  const isDualChannelRef = useRef(isDualChannel);
  const isContinuousModeRef = useRef(isContinuousMode);
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
        await invoke("stop_system_audio_capture");

        if (cancelled || !capturingRef.current || (!vadConfig.enabled && !isStreamingModeRef.current)) {
          return;
        }

        const deviceId =
          selectedAudioDevices.output.id !== "default"
            ? selectedAudioDevices.output.id
            : null;

        const effectiveVadConfig = isStreamingModeRef.current
          ? { ...vadConfig, enabled: false, max_recording_duration_secs: 86400 }
          : vadConfig;

        await invoke("start_system_audio_capture", {
          vadConfig: effectiveVadConfig,
          deviceId,
        });
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
  }, [selectedAudioDevices.output.id, vadConfig]);

  const updateDualChannel = useCallback((value: boolean) => {
    setIsDualChannel(value);
    safeLocalStorage.setItem("system_audio_dual_channel", String(value));
  }, []);

  const updateConversationalMemory = useCallback((value: boolean) => {
    setUseConversationalMemory(value);
    safeLocalStorage.setItem("system_audio_use_memory", String(value));
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

      if (!selectedSttProviderRef.current.provider && !invisibleaiApiEnabledRef.current) {
        setError("No speech provider selected.");
        return;
      }

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

        if (isStreamingModeRef.current) {
          // In streaming mode, find the earliest utterance that has finished recording and has an STT promise
          readyUtterance = activeUtterances.find(
            (u) => !u.isRecording && u.sttPromise
          );
        } else {
          // In standard mode, enforce strict chronological ordering by blocking on the earliest utterance
          const firstUtterance = activeUtterances[0];
          if (!firstUtterance.isRecording && firstUtterance.sttPromise) {
            readyUtterance = firstUtterance;
          }
        }

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
              : (isDualChannelRef.current || isStreamingModeRef.current)
                ? `[Sistema]: ${trimmed}`
                : trimmed;

          await handleNewTranscriptionRef.current(formattedTranscription);
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
      shouldSaveToDb: boolean = true
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
        const isSystemStreamingMessage = !shouldSaveToDb && transcription.startsWith("[Sistema]:");
        const activeScreenshot = isSystemStreamingMessage ? null : screenshotImage;
        if (!isSystemStreamingMessage) {
          setScreenshotImage(null);
        }

        let fullResponse = "";

        const useInvisibleAIAPI = invisibleaiApiEnabled;
        if (!selectedAIProvider.provider && !useInvisibleAIAPI) {
          setError("No AI provider selected.");
          return;
        }

        const provider = allAiProviders.find(
          (p) => p.id === selectedAIProvider.provider
        );
        if (!provider && !useInvisibleAIAPI) {
          setError("AI provider config not found.");
          return;
        }

        let effectivePrompt = prompt;
        if (isDualChannel) {
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
            content: transcription,
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
            title: conversationRef.current.title || generateConversationTitle(transcription),
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
    [selectedAIProvider, allAiProviders, isDualChannel, screenshotImage]
  );

  const handleNewTranscription = useCallback(async (formattedText: string) => {
    if (!capturingRef.current) return;

    setError("");

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
  }, [processWithAI]);

  const handleNewTranscriptionRef = useRef(handleNewTranscription);
  useEffect(() => {
    handleNewTranscriptionRef.current = handleNewTranscription;
  }, [handleNewTranscription]);

  const processSpeechQueueRef = useRef(processSpeechQueue);
  useEffect(() => {
    processSpeechQueueRef.current = processSpeechQueue;
  }, [processSpeechQueue]);

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
    const manager = channel === "mic" ? deepgramManagerRef.current : systemDeepgramManagerRef.current;
    if (!manager) return;
    try {
      const finalText = customText ?? manager.getAccumulatedText();
      manager.reset();
      if (channel === "mic") {
        setInterimTranscription("");
      } else {
        setSystemInterimTranscription("");
      }

      if (isStreamingModeRef.current) {
        let utterance = activeSpeechUtterancesRef.current.find(
          (u) => u.channel === channel && u.isRecording && !u.isDiscarded
        );

        const trimmedText = finalText.trim();

        if (!utterance) {
          if (!trimmedText) {
            console.log(`[Streaming] Duplicate or empty trigger with no active ${channel} utterance, skipping.`);
            return;
          }
          utterance = {
            id: `${channel}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            startTime: Date.now() - 1000,
            channel: channel,
            isRecording: true,
            isProcessed: false,
            isDiscarded: false,
          };
          activeSpeechUtterancesRef.current.push(utterance);
        }

        utterance.isRecording = false;
        utterance.sttPromise = Promise.resolve(trimmedText);
        console.log(`[Queue] Streaming ${channel} utterance resolved with text: "${trimmedText}"`);
        processSpeechQueueRef.current();
      }
    } catch (err) {
      console.error(`[Streaming] Error dispatching ${channel} transcript:`, err);
      setError(`Streaming error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const initializeStreaming = useCallback(async (micMediaStream: MediaStream | null) => {
    streamingMicStreamRef.current = micMediaStream;
    if (deepgramManagerRef.current) {
      deepgramManagerRef.current.destroy();
      deepgramManagerRef.current = null;
    }
    if (systemDeepgramManagerRef.current) {
      systemDeepgramManagerRef.current.destroy();
      systemDeepgramManagerRef.current = null;
    }
    const vars = selectedSttProviderRef.current.variables || {};
    const apiKey = vars.api_key || vars.API_KEY || "";
    if (!apiKey) {
      setError("Deepgram Streaming requires an API Key.");
      setIsPopoverOpen(true);
      return;
    }
    const config = {
      apiKey,
      model: vars.model || vars.MODEL || "nova-3",
      language: vars.language || vars.LANGUAGE || "es-419",
    };

    // 1. Microphone Deepgram Stream (Only if micMediaStream is available and we are in Dual Channel / Multihilo mode)
    let micManager: DeepgramStreamManager | null = null;
    if (micMediaStream && isDualChannelRef.current) {
      const micCallbacks = {
        onTranscript: (_text: string, _isFinal: boolean, fullAccumulated: string) => {
          setInterimTranscription(fullAccumulated);
        },
        onUtteranceEnd: (finalText: string) => {
          if (finalText.trim() && capturingRef.current) {
            console.log("[Streaming] Deepgram mic utterance_end triggered:", finalText);
            dispatchStreamingTranscript("mic", finalText);
          }
        },
        onError: (error: Error) => {
          console.error("[Streaming] Mic Deepgram error:", error);
          setError(`Deepgram Streaming (Mic): ${error.message}`);
          setIsPopoverOpen(true);
        },
      };
      micManager = new DeepgramStreamManager(config, micCallbacks);
      deepgramManagerRef.current = micManager;
    }

    // 2. System Audio Deepgram Stream
    const systemCallbacks = {
      onTranscript: (_text: string, _isFinal: boolean, fullAccumulated: string) => {
        setSystemInterimTranscription(fullAccumulated);
      },
      onUtteranceEnd: (finalText: string) => {
        if (finalText.trim() && capturingRef.current) {
          console.log("[Streaming] Deepgram system utterance_end triggered:", finalText);
          dispatchStreamingTranscript("system", finalText);
        }
      },
      onError: (error: Error) => {
        console.error("[Streaming] System Deepgram error:", error);
        setError(`Deepgram Streaming (System): ${error.message}`);
        setIsPopoverOpen(true);
      },
    };
    const systemManager = new DeepgramStreamManager(config, systemCallbacks);
    systemDeepgramManagerRef.current = systemManager;

    try {
      const systemSampleRate = await invoke<number>("get_audio_sample_rate");
      console.log(`[Streaming] System audio sample rate queried from backend: ${systemSampleRate}Hz`);

      const startPromises: Promise<any>[] = [];
      if (micManager && micMediaStream) {
        console.log("[Streaming] Starting microphone stream...");
        startPromises.push(micManager.start(micMediaStream));
      }
      console.log("[Streaming] Starting system audio stream...");
      startPromises.push(systemManager.startManual(systemSampleRate));

      await Promise.all(startPromises);
    } catch (err) {
      setError(`Failed to start Deepgram streaming: ${err}`);
    }
  }, [dispatchStreamingTranscript]);

  const handleMicSpeechDetected = useCallback((audioBlob: Blob) => {
    if (!capturingRef.current) return;

    if (isStreamingModeRef.current && deepgramManagerRef.current) {
      dispatchStreamingTranscript("mic");
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
    let chunkUnlisten: (() => void) | undefined;
    let cancelled = false;

    const setupEventListeners = async () => {
      try {
        const uStart = await listen("speech-start", () => {
          if (isStreamingModeRef.current) return;
          handleSystemSpeechStartRef.current();
        });
        if (cancelled) { uStart(); return; }
        startUnlisten = uStart;

        const uDetected = await listen("speech-detected", async (event) => {
          if (isStreamingModeRef.current) return;
          if (!capturingRef.current) return;

          const base64Audio = event.payload as string;

          if (isContinuousModeRef.current) {
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

          // Trigger the STT immediately in parallel!
          utterance.sttPromise = (async () => {
            let providerConfig = allSttProvidersRef.current.find(
              (p) => p.id === selectedSttProviderRef.current.provider
            );

            // FALLBACK for system audio in deepgram-streaming mode
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

            const response = await fetch(`data:audio/wav;base64,${base64Audio}`);
            const audioBlob = await response.blob();

            return fetchSTT({
              provider: providerConfig,
              selectedProvider: selectedSttProviderRef.current,
              audio: audioBlob,
              useInvisibleAIAPI: invisibleaiApiEnabledRef.current,
            });
          })();

          processSpeechQueueRef.current();
        });
        if (cancelled) { uDetected(); return; }
        speechUnlisten = uDetected;

        const uDiscarded = await listen("speech-discarded", (event) => {
          if (isStreamingModeRef.current) return;
          if (isContinuousModeRef.current) {
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

        const uChunk = await listen<number[]>("system-audio-chunk", (event) => {
          if (!capturingRef.current || !isStreamingModeRef.current) return;
          if (systemDeepgramManagerRef.current) {
            systemDeepgramManagerRef.current.injectRawAudio(event.payload);
          }
        });
        if (cancelled) { uChunk(); return; }
        chunkUnlisten = uChunk;

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
      if (chunkUnlisten) chunkUnlisten();
    };
  }, []);

  const startCapture = useCallback(async () => {
    try {
      setError("");

      if (!selectedSttProviderRef.current.provider && !invisibleaiApiEnabledRef.current) {
        setError("No speech provider selected.");
        setIsPopoverOpen(true);
        return;
      }

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
      const streamingEnabled = currentSttProvider?.streaming === true;
      setIsStreamingMode(streamingEnabled);
      isStreamingModeRef.current = streamingEnabled;
      setInterimTranscription("");

      if (isContinuous && !streamingEnabled) {
        setIsRecordingInContinuousMode(false);
        return;
      }

      await stopFrontendMicRecording(false);
      await invoke<string>("stop_system_audio_capture");

      const deviceId =
        selectedAudioDevices.output.id !== "default"
          ? selectedAudioDevices.output.id
          : null;

      const effectiveVadConfig = streamingEnabled
        ? { ...vadConfig, enabled: false, max_recording_duration_secs: 86400 }
        : vadConfig;

      await invoke<string>("start_system_audio_capture", {
        vadConfig: effectiveVadConfig,
        deviceId: deviceId,
      });

      if (streamingEnabled && !isDualChannel) {
        console.log("[Streaming] Starting system audio stream immediately in Auto mode");
        await initializeStreaming(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setIsPopoverOpen(true);
    }
  }, [vadConfig, selectedAudioDevices.output.id, stopFrontendMicRecording, isDualChannel, initializeStreaming]);

  const stopCapture = useCallback(async () => {
    try {
      if (deepgramManagerRef.current) {
        deepgramManagerRef.current.destroy();
        deepgramManagerRef.current = null;
      }
      if (systemDeepgramManagerRef.current) {
        systemDeepgramManagerRef.current.destroy();
        systemDeepgramManagerRef.current = null;
      }
      setIsStreamingMode(false);
      isStreamingModeRef.current = false;
      setInterimTranscription("");
      setSystemInterimTranscription("");
      streamingMicStreamRef.current = null;

      // Clear new states
      setAccumulatedSystemText("");
      accumulatedSystemTextRef.current = "";
      setScreenshotImage(null);

      activeSpeechUtterancesRef.current = [];
      isProcessingQueueRef.current = false;

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to stop capture: ${errorMessage}`);
      console.error("Stop capture error:", err);
    }
  }, [stopFrontendMicRecording]);

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
    isLastTranscriptionSavedRef.current = true;
    setAccumulatedSystemText("");
    accumulatedSystemTextRef.current = "";
    setScreenshotImage(null);
  }, []);

  const updateVadConfiguration = useCallback(async (config: VadConfig, overrideDualChannel?: boolean) => {
    const prevEnabled = vadConfig.enabled;
    setVadConfig(config);
    safeLocalStorage.setItem("vad_config", JSON.stringify(config));

    const activeDualChannel = overrideDualChannel !== undefined ? overrideDualChannel : isDualChannel;

    // Determine if the current provider supports real-time streaming
    const currentSttProvider = allSttProvidersRef.current.find(
      (p) => p.id === selectedSttProviderRef.current.provider
    );
    const streamingEnabled = currentSttProvider?.streaming === true;

    if (isStreamingModeRef.current) {
      // Case 1: Currently in streaming mode, but switching to Manual mode (vadConfig.enabled becomes false)
      if (!config.enabled) {
        try {
          if (deepgramManagerRef.current) {
            deepgramManagerRef.current.destroy();
            deepgramManagerRef.current = null;
          }
          if (systemDeepgramManagerRef.current) {
            systemDeepgramManagerRef.current.destroy();
            systemDeepgramManagerRef.current = null;
          }
          setIsStreamingMode(false);
          isStreamingModeRef.current = false;
          setInterimTranscription("");
          setSystemInterimTranscription("");
          if (streamingMicStreamRef.current) {
            try {
              streamingMicStreamRef.current.getTracks().forEach((track) => {
                track.stop();
                track.enabled = false;
              });
            } catch {}
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
            setInterimTranscription("");

            const effectiveVadConfig = { ...config, enabled: false, max_recording_duration_secs: 86400 };
            await invoke("start_system_audio_capture", {
              vadConfig: effectiveVadConfig,
              deviceId: deviceId,
            });

            if (!activeDualChannel) {
              console.log("[Streaming] Switched to Auto mode, starting system audio stream immediately");
              await initializeStreaming(null);
            }
          } else {
            await invoke("start_system_audio_capture", {
              vadConfig: config,
              deviceId: deviceId,
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to update VAD config:", error);
    }
  }, [vadConfig.enabled, selectedAudioDevices.output.id, isDualChannel, initializeStreaming]);
  // Dynamically cleanup microphone stream if the user switches from Multihilo to Auto on-the-fly while streaming is active
  useEffect(() => {
    if (capturing && isStreamingMode) {
      if (!isDualChannel) {
        if (deepgramManagerRef.current) {
          console.log("[Streaming] Stopping microphone stream on-the-fly (switched to Auto mode)");
          deepgramManagerRef.current.destroy();
          deepgramManagerRef.current = null;
        }
        setInterimTranscription("");
        setMicStream(null);
        if (streamingMicStreamRef.current) {
          try {
            streamingMicStreamRef.current.getTracks().forEach((track) => {
              track.stop();
              track.enabled = false;
            });
          } catch {}
          streamingMicStreamRef.current = null;
        }
      }
    }
  }, [isDualChannel, isStreamingMode, capturing]);

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

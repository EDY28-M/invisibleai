import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { safeLocalStorage, getMicrophoneStream } from "@/lib";
import { STORAGE_KEYS } from "@/config";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceAgentStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "thinking"
  | "speaking"
  | "error"
  | "disconnected";

export interface TranscriptEntry {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

export interface VoiceAgentSettings {
  sttModel: string;
  llmProvider: string;
  llmModel: string;
  ttsVoice: string;
  systemPrompt: string;
  greeting: string;
  language: string;
}

export const DEFAULT_VOICE_AGENT_SETTINGS: VoiceAgentSettings = {
  sttModel: "nova-3",
  llmProvider: "open_ai",
  llmModel: "gpt-4o-mini",
  ttsVoice: "aura-2-celeste-es",
  systemPrompt:
    "Eres un asistente de inteligencia artificial amigable y servicial. Sé conciso y natural en tus respuestas.",
  greeting: "¡Hola! ¿En qué puedo ayudarte?",
  language: "es",
};

export interface VoiceAgentState {
  status: VoiceAgentStatus;
  transcript: TranscriptEntry[];
  error: string | null;
  agentSettings: VoiceAgentSettings;
  setAgentSettings: (s: VoiceAgentSettings) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  clearTranscript: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEEPGRAM_AGENT_URL = "wss://agent.deepgram.com/v1/agent/converse";
const INPUT_SAMPLE_RATE = 48000;
const KEEPALIVE_INTERVAL_MS = 5000;
const SCRIPT_PROCESSOR_BUFFER = 4096;

const VOICE_PROMPT_EXTENSION =
  "\n\n[REGLAS CRÍTICAS PARA EL MODO DE VOZ / VOICE AGENT]\n" +
  "- NUNCA uses formato Markdown en tus respuestas (como **, *, ###, _, `, etc.).\n" +
  "- NUNCA uses guiones (-), viñetas, listas con números ni asteriscos. Estructurá tus respuestas en párrafos de conversación naturales y fluidos.\n" +
  "- Hablá de forma conversacional, amigable y natural, como si estuvieras en una llamada telefónica o conversación en tiempo real. Evitá responder con textos estructurados de lectura visual.\n\n" +
  "[CRITICAL VOICE AGENT OUTPUT RULES]\n" +
  "- NEVER use Markdown formatting in your responses (such as **, *, ###, _, `, etc.).\n" +
  "- NEVER use bullet points, dashes (-), asterisks, or numbered lists. Structure all responses in natural, conversational paragraphs.\n" +
  "- Speak in a natural, friendly, conversational tone, as if you are in a real-time call. Avoid text structures designed for visual reading.";

// ─── PCM helpers ──────────────────────────────────────────────────────────────

function float32ToInt16(samples: Float32Array): ArrayBuffer {
  const buf = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return buf;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceAgent(micDeviceId?: string): VoiceAgentState {
  const [status, setStatus] = useState<VoiceAgentStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [agentSettings, setAgentSettingsState] = useState<VoiceAgentSettings>(
    () => {
      try {
        const saved = safeLocalStorage.getItem(STORAGE_KEYS.VOICE_AGENT_SETTINGS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.language === "multi") {
            parsed.language = "es";
          }
          // Enforce language/voice sync during initial load
          if (parsed.language === "es" && parsed.ttsVoice && !parsed.ttsVoice.endsWith("-es")) {
            parsed.ttsVoice = "aura-2-celeste-es";
          } else if (parsed.language === "en" && parsed.ttsVoice && !parsed.ttsVoice.endsWith("-en")) {
            parsed.ttsVoice = "aura-2-thalia-en";
          }
          return { ...DEFAULT_VOICE_AGENT_SETTINGS, ...parsed };
        }
      } catch { /* ignore */ }
      return DEFAULT_VOICE_AGENT_SETTINGS;
    },
  );

  const setAgentSettings = useCallback((s: VoiceAgentSettings) => {
    setAgentSettingsState(s);
    safeLocalStorage.setItem(STORAGE_KEYS.VOICE_AGENT_SETTINGS, JSON.stringify(s));
  }, []);

  const wsRef = useRef<WebSocket | null>(null);
  // SEPARATE AudioContexts: input (16kHz PCM capture) and output (default rate for playback)
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Streaming audio playback states
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlaybackTimeRef = useRef<number>(0);
  const serverAudioFinishedRef = useRef<boolean>(false);
  const activeSystemPromptRef = useRef<string>("");

  // ─── Playback ─────────────────────────────────────────────────────────────

  const stopPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch { /* ignore */ }
    });
    activeSourcesRef.current = [];
    nextPlaybackTimeRef.current = 0;
  }, []);

  const playAudioChunk = useCallback((pcmData: Uint8Array) => {
    const ctx = outputCtxRef.current;
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const numSamples = Math.floor(pcmData.length / 2);
    if (numSamples === 0) return;

    const OUTPUT_SR = 24000; // Deepgram TTS outputs at 24kHz
    const audioBuf = ctx.createBuffer(1, numSamples, OUTPUT_SR);
    const channel = audioBuf.getChannelData(0);
    const dataView = new DataView(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);
    for (let i = 0; i < numSamples; i++) {
      const int16 = dataView.getInt16(i * 2, true);
      channel[i] = int16 / (int16 < 0 ? 0x8000 : 0x7fff);
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuf;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    let startTime = nextPlaybackTimeRef.current;

    // If this is the first chunk or we fell behind, schedule with a small offset
    if (startTime < now) {
      startTime = now + 0.05; // 50ms buffer for seamless transitions
    }

    source.start(startTime);
    nextPlaybackTimeRef.current = startTime + audioBuf.duration;

    // Track active sources for barge-in / stopping
    activeSourcesRef.current.push(source);
    setStatus("speaking");

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      if (activeSourcesRef.current.length === 0 && serverAudioFinishedRef.current) {
        setStatus("listening");
      }
    };
  }, []);

  // ─── WebSocket message handler ────────────────────────────────────────────

  const agentSettingsRef = useRef(agentSettings);
  useEffect(() => {
    agentSettingsRef.current = agentSettings;
  }, [agentSettings]);

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      // ── Binary audio chunk ──
      if (event.data instanceof Blob) {
        const arrayBuf = await event.data.arrayBuffer();
        playAudioChunk(new Uint8Array(arrayBuf));
        return;
      }

      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      console.debug("[VoiceAgent]", msg.type, msg);

      switch (msg.type) {
        case "Welcome": {
          const ws = wsRef.current;
          if (!ws) break;
          const s = agentSettingsRef.current;

          // Build Settings payload conforming to the provided spec
          const agentConfig: Record<string, unknown> = {
            listen: {
              provider: {
                type: "deepgram",
                version: "v1",
                model: s.sttModel,
                language: s.language,
              },
            },
            think: {
              provider: {
                type: s.llmProvider,
                model: s.llmModel,
              },
              prompt: (activeSystemPromptRef.current || s.systemPrompt) + VOICE_PROMPT_EXTENSION,
            },
            speak: {
              provider: {
                type: "deepgram",
                model: s.ttsVoice,
              },
            },
            greeting: s.greeting || undefined,
          };

          const settings = {
            type: "Settings",
            audio: {
              input: {
                encoding: "linear16",
                sample_rate: INPUT_SAMPLE_RATE,
              },
              output: {
                encoding: "linear16",
                sample_rate: 24000,
                container: "none",
              },
            },
            agent: agentConfig,
          };

          console.log("[VoiceAgent] Sending settings to Deepgram:", JSON.stringify(settings, null, 2));
          ws.send(JSON.stringify(settings));
          break;
        }

        case "SettingsApplied": {
          setStatus("listening");
          break;
        }

        case "UserStartedSpeaking": {
          stopPlayback();
          setStatus("listening");
          break;
        }

        case "AgentThinking": {
          serverAudioFinishedRef.current = false;
          setStatus("thinking");
          break;
        }

        case "AgentAudioDone": {
          serverAudioFinishedRef.current = true;
          if (activeSourcesRef.current.length === 0) {
            setStatus("listening");
          }
          break;
        }

        case "ConversationText": {
          const role = (msg.role as string) === "user" ? "user" : "agent";
          const content = (msg.content as string) ?? "";
          if (!content.trim()) break;
          setTranscript((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              role,
              content,
              timestamp: Date.now(),
            },
          ]);
          break;
        }

        case "Error": {
          console.error("[VoiceAgent] Server error:", msg);
          setError(`Agent error: ${(msg.description as string) ?? String(msg.type)}`);
          setStatus("error");
          break;
        }

        default:
          break;
      }
    },
    [stopPlayback, playAudioChunk],
  );

  // ─── Connect ──────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (wsRef.current) return;

    setStatus("connecting");
    setError(null);
    activeSourcesRef.current = [];
    nextPlaybackTimeRef.current = 0;
    serverAudioFinishedRef.current = false;

    // Deepgram API key from secure storage
    let apiKey = "";
    try {
      const storage = await invoke<{ deepgram_api_key?: string }>("secure_storage_get");
      apiKey = storage.deepgram_api_key ?? "";
    } catch {
      setError("Failed to read Deepgram API key. Verify your license is active.");
      setStatus("error");
      return;
    }

    // Fetch active modular system prompt from backend
    try {
      activeSystemPromptRef.current = await invoke<string>("get_compiled_system_prompt");
      console.log("[VoiceAgent] Active system prompt loaded from backend profiles");
    } catch (err) {
      console.warn("[VoiceAgent] Failed to fetch compiled system prompt, falling back to static prompt:", err);
      activeSystemPromptRef.current = "";
    }

    if (!apiKey) {
      setError("No Deepgram API key found. Activate your license to unlock Voice Agent.");
      setStatus("error");
      return;
    }

    // Open microphone with progressive constraint fallback
    try {
      micStreamRef.current = await getMicrophoneStream(micDeviceId);
    } catch (err) {
      setError(`Microphone access denied: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
      return;
    }

    // ── Input AudioContext (16kHz) — for mic capture only ──
    const inputCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    inputCtxRef.current = inputCtx;
    await inputCtx.resume().catch(() => {});

    // ── Output AudioContext (default sample rate) — for TTS playback ──
    // Do NOT set sampleRate here: let the browser pick 44100/48000
    // so that decodeAudioData on WAV (24kHz) works without sample rate mismatch.
    const outputCtx = new AudioContext();
    outputCtxRef.current = outputCtx;
    await outputCtx.resume().catch(() => {});

    // WebSocket
    const ws = new WebSocket(DEEPGRAM_AGENT_URL, ["token", apiKey]);
    ws.binaryType = "blob";
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");

      // Mic → PCM → WebSocket pipeline (runs on input context)
      const source = inputCtx.createMediaStreamSource(micStreamRef.current!);
      sourceRef.current = source;

      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const processor = inputCtx.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const pcm = float32ToInt16(e.inputBuffer.getChannelData(0));
        ws.send(pcm);
      };

      source.connect(processor);
      // Must connect processor to destination or onaudioprocess won't fire
      processor.connect(inputCtx.destination);

      // KeepAlive
      keepAliveRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "KeepAlive" }));
        }
      }, KEEPALIVE_INTERVAL_MS);
    };

    ws.onmessage = handleMessage;

    ws.onerror = (e) => {
      console.error("[VoiceAgent] WebSocket error:", e);
      setError("WebSocket connection error. Check your network and Deepgram API key.");
      setStatus("error");
    };

    ws.onclose = (e) => {
      console.log("[VoiceAgent] closed:", e.code, e.reason);
      setStatus("disconnected");
    };
  }, [micDeviceId, handleMessage]);

  // ─── Disconnect ───────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }

    processorRef.current?.disconnect();
    processorRef.current = null;

    sourceRef.current?.disconnect();
    sourceRef.current = null;

    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;

    inputCtxRef.current?.close().catch(() => {});
    inputCtxRef.current = null;

    outputCtxRef.current?.close().catch(() => {});
    outputCtxRef.current = null;

    wsRef.current?.close();
    wsRef.current = null;

    stopPlayback();
    setStatus("disconnected");
  }, [stopPlayback]);

  useEffect(() => {
    return () => { disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTranscript = useCallback(() => setTranscript([]), []);

  return {
    status,
    transcript,
    error,
    agentSettings,
    setAgentSettings,
    connect,
    disconnect,
    clearTranscript,
  };
}

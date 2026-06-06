

import { getResponseSettings } from "../storage/response-settings.storage";

export type StreamState =
  | "idle"
  | "connecting"
  | "connected"
  | "streaming"
  | "draining"
  | "closed"
  | "error"
  | "reconnecting";

export interface DeepgramStreamConfig {
  apiKey: string;
  model?: string;
  language?: string;
  smartFormat?: boolean;
  interimResults?: boolean;
  endpointing?: number;
  utteranceEndMs?: number;
  numerals?: boolean;
  diarize?: boolean;
}

export interface DeepgramStreamCallbacks {
  
  onTranscript: (
    text: string,
    isFinal: boolean,
    fullAccumulated: string
  ) => void;
  
  onUtteranceEnd?: (finalText: string) => void;
  
  onError: (error: Error) => void;
  
  onClose?: (reason: string) => void;
  
  onStateChange?: (state: StreamState) => void;
  
  onAudioActivity?: (level: number) => void;
}

const DEEPGRAM_WS_BASE = "wss://api.deepgram.com/v1/listen";
const KEEPALIVE_INTERVAL_MS = 8000;
const DRAIN_TIMEOUT_MS = 2500;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 500;
const AUDIO_ACTIVITY_RMS_THRESHOLD = 0.006;
const AUDIO_ACTIVITY_PEAK_THRESHOLD = 0.02;
const AUDIO_ACTIVITY_NOTIFY_INTERVAL_MS = 100;

export class DeepgramStreamManager {
  private config: Required<DeepgramStreamConfig>;
  private callbacks: DeepgramStreamCallbacks;
  private state: StreamState = "idle";

  private socket: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;

  private finalSegments: string[] = [];
  private currentInterim: string = "";
  private lastFullAccumulated: string = "";

  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private drainTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private shouldReconnect: boolean = false;
  private lastAudioActivityNotificationAt: number = 0;

  private drainResolve: ((text: string) => void) | null = null;

  constructor(
    config: DeepgramStreamConfig,
    callbacks: DeepgramStreamCallbacks
  ) {
    const responseSettings = getResponseSettings();
    const mapLanguageToDeepgram = (lang: string): string => {
      switch (lang) {
        case "english": return "en";
        case "spanish": return "es-419";
        case "french": return "fr";
        case "german": return "de";
        case "italian": return "it";
        case "portuguese": return "pt";
        case "dutch": return "nl";
        case "russian": return "ru";
        case "chinese": return "zh";
        case "japanese": return "ja";
        case "korean": return "ko";
        case "arabic": return "ar";
        case "turkish": return "tr";
        case "polish": return "pl";
        case "swedish": return "sv";
        case "norwegian": return "no";
        case "danish": return "da";
        case "finnish": return "fi";
        case "greek": return "el";
        case "czech": return "cs";
        case "hungarian": return "hu";
        case "romanian": return "ro";
        case "ukrainian": return "uk";
        case "vietnamese": return "vi";
        case "thai": return "th";
        case "indonesian": return "id";
        case "malay": return "ms";
        case "hebrew": return "he";
        case "filipino": return "fil";
        default: return "es-419";
      }
    };
    const targetLanguage = mapLanguageToDeepgram(responseSettings.language);

    this.config = {
      apiKey: config.apiKey,
      model: config.model || "nova-3",
      language: targetLanguage,
      smartFormat: config.smartFormat ?? true,
      interimResults: config.interimResults ?? true,
      endpointing: config.endpointing ?? 200,
      utteranceEndMs: config.utteranceEndMs ?? 1000,
      numerals: config.numerals ?? true,
      diarize: config.diarize ?? false,
    };
    this.callbacks = callbacks;
  }

  
  async start(stream: MediaStream): Promise<void> {
    if (this.state !== "idle" && this.state !== "closed" && this.state !== "error") {
      console.warn(`[DeepgramStream] Cannot start from state: ${this.state}`);
      return;
    }

    this.mediaStream = stream;
    this.resetTranscripts();
    this.reconnectAttempts = 0;
    this.shouldReconnect = true;

    await this.connect();
  }

  
  async startManual(inputSampleRate: number): Promise<void> {
    if (this.state !== "idle" && this.state !== "closed" && this.state !== "error") {
      console.warn(`[DeepgramStream] Cannot start manual from state: ${this.state}`);
      return;
    }

    this.mediaStream = null;
    this.resetTranscripts();
    this.reconnectAttempts = 0;
    this.shouldReconnect = true;
    (this as any)._manualSampleRate = inputSampleRate;

    await this.connect();
  }

  
  async stop(): Promise<string> {
    this.shouldReconnect = false;

    this.stopMediaRecorder();

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      const text = this.getAccumulatedText();
      this.cleanup();
      return text;
    }

    this.setState("draining");

    return new Promise<string>((resolve) => {
      this.drainResolve = resolve;

      try {
        this.socket!.send(JSON.stringify({ type: "CloseStream" }));
      } catch {
        resolve(this.getAccumulatedText());
        this.cleanup();
        return;
      }

      this.drainTimeoutId = setTimeout(() => {
        console.warn("[DeepgramStream] Drain timeout reached, resolving with current text");
        const text = this.getAccumulatedText();
        if (this.drainResolve) {
          this.drainResolve(text);
          this.drainResolve = null;
        }
        this.cleanup();
      }, DRAIN_TIMEOUT_MS);
    });
  }

  
  destroy(): void {
    this.shouldReconnect = false;

    if (this.drainResolve) {
      this.drainResolve(this.getAccumulatedText());
      this.drainResolve = null;
    }

    this.cleanup();
  }

  
  getAccumulatedText(): string {
    return this.finalSegments.join(" ").trim();
  }

  
  getFullLiveText(): string {
    const finals = this.finalSegments.join(" ").trim();
    if (this.currentInterim) {
      return finals ? `${finals} ${this.currentInterim}` : this.currentInterim;
    }
    return finals;
  }

  
  getState(): StreamState {
    return this.state;
  }

  
  reset(): void {
    this.resetTranscripts();
  }

  private async connect(): Promise<void> {
    this.setState("connecting");

    const params = new URLSearchParams({
      model: this.config.model,
      language: this.config.language,
      smart_format: String(this.config.smartFormat),
      interim_results: String(this.config.interimResults),
      vad_events: "true",
      no_delay: "true",
      endpointing: String(this.config.endpointing),
      utterance_end_ms: String(this.config.utteranceEndMs),
      numerals: String(this.config.numerals),
      diarize: String(this.config.diarize),
      encoding: "linear16",
      sample_rate: "16000",
      channels: "1",
    });

    const url = `${DEEPGRAM_WS_BASE}?${params.toString()}`;

    try {
      this.socket = new WebSocket(url, ["token", this.config.apiKey]);
      this.socket.binaryType = "arraybuffer";

      this.socket.onopen = () => {
        this.setState("connected");
        this.reconnectAttempts = 0;
        this.startKeepAlive();
        if (this.mediaStream) {
          this.startMediaRecorder();
        } else {
          this.setState("streaming");
        }
      };

      this.socket.onmessage = (event: MessageEvent) => {
        this.handleMessage(event);
      };

      this.socket.onerror = (event: Event) => {
        console.error("[DeepgramStream] WebSocket error:", event);
        this.callbacks.onError(
          new Error("Deepgram WebSocket connection error")
        );
      };

      this.socket.onclose = (event: CloseEvent) => {
        this.stopKeepAlive();

        if (this.state === "draining") {
          const text = this.getAccumulatedText();
          if (this.drainResolve) {
            this.drainResolve(text);
            this.drainResolve = null;
          }
          if (this.drainTimeoutId) {
            clearTimeout(this.drainTimeoutId);
            this.drainTimeoutId = null;
          }
          this.setState("closed");
          this.callbacks.onClose?.("drain_complete");
        } else if (
          this.shouldReconnect &&
          this.state === "streaming" &&
          this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS
        ) {
          this.attemptReconnect();
        } else {
          this.setState("closed");
          this.callbacks.onClose?.(event.reason || "connection_closed");
        }
      };
    } catch (err) {
      this.setState("error");
      this.callbacks.onError(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay =
      RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1);

    this.setState("reconnecting");
    this.stopKeepAlive();

    setTimeout(async () => {
      if (!this.shouldReconnect) {
        this.setState("closed");
        return;
      }
      try {
        await this.connect();
      } catch {
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          this.setState("error");
          this.callbacks.onError(
            new Error("Max reconnection attempts exceeded")
          );
        }
      }
    }, delay);
  }

  
  injectRawAudio(inputData: Float32Array | number[]): void {
    if (
      this.socket?.readyState !== WebSocket.OPEN ||
      this.state !== "streaming"
    ) {
      return;
    }

    const fromSampleRate = (this as any)._manualSampleRate || 44100;
    const toSampleRate = 16000;

    const data = inputData instanceof Float32Array ? inputData : new Float32Array(inputData);
    this.notifyAudioActivity(data);
    let pcm16: Int16Array;

    if (fromSampleRate === toSampleRate) {
      pcm16 = new Int16Array(data.length);
      for (let i = 0; i < data.length; i++) {
        const s = Math.max(-1, Math.min(1, data[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
    } else {
      const ratio = fromSampleRate / toSampleRate;
      const newLength = Math.round(data.length / ratio);
      pcm16 = new Int16Array(newLength);
      for (let i = 0; i < newLength; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.floor((i + 1) * ratio);
        let sum = 0;
        let count = 0;
        for (let j = start; j < end && j < data.length; j++) {
          sum += data[j];
          count++;
        }
        let s = 0;
        if (count > 0) {
          s = sum / count;
        } else {
          const idx = Math.min(data.length - 1, Math.floor(i * ratio));
          s = data[idx];
        }
        s = Math.max(-1, Math.min(1, s));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
    }

    try {
      this.socket!.send(pcm16.buffer);
    } catch (err) {
      console.error("[DeepgramStream] Failed to send manual audio:", err);
    }
  }

  private startMediaRecorder(): void {
    if (!this.mediaStream) return;

    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(this.mediaStream);

      const bufferSize = 1024;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (
          this.socket?.readyState !== WebSocket.OPEN ||
          this.state === "draining"
        ) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        this.notifyAudioActivity(inputData);
        const fromSampleRate = audioContext.sampleRate;
        const toSampleRate = 16000;

        let pcm16: Int16Array;

        if (fromSampleRate === toSampleRate) {
          pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
        } else {
          const ratio = fromSampleRate / toSampleRate;
          const newLength = Math.round(inputData.length / ratio);
          pcm16 = new Int16Array(newLength);
          for (let i = 0; i < newLength; i++) {
            const start = Math.floor(i * ratio);
            const end = Math.floor((i + 1) * ratio);
            let sum = 0;
            let count = 0;
            for (let j = start; j < end && j < inputData.length; j++) {
              sum += inputData[j];
              count++;
            }
            let s = 0;
            if (count > 0) {
              s = sum / count;
            } else {
              const idx = Math.min(inputData.length - 1, Math.floor(i * ratio));
              s = inputData[idx];
            }
            s = Math.max(-1, Math.min(1, s));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
        }

        this.socket!.send(pcm16.buffer);
      };

      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0;

      source.connect(processor);
      processor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      (this as any)._audioContext = audioContext;
      (this as any)._processor = processor;
      (this as any)._source = source;
      (this as any)._gainNode = gainNode;

      this.setState("streaming");
    } catch (err) {
      console.error("[DeepgramStream] Failed to start audio capture:", err);
      this.callbacks.onError(
        err instanceof Error ? err : new Error("Failed to start audio capture")
      );
    }
  }

  private notifyAudioActivity(samples: Float32Array): void {
    let sumSquares = 0;
    let peak = 0;

    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      peak = Math.max(peak, abs);
      sumSquares += samples[i] * samples[i];
    }

    const rms = Math.sqrt(sumSquares / Math.max(samples.length, 1));
    if (rms < AUDIO_ACTIVITY_RMS_THRESHOLD && peak < AUDIO_ACTIVITY_PEAK_THRESHOLD) {
      return;
    }

    const now = Date.now();
    if (now - this.lastAudioActivityNotificationAt < AUDIO_ACTIVITY_NOTIFY_INTERVAL_MS) {
      return;
    }

    this.lastAudioActivityNotificationAt = now;
    this.callbacks.onAudioActivity?.(rms);
  }

  private stopMediaRecorder(): void {
    try {
      const processor = (this as any)._processor as ScriptProcessorNode | null;
      const source = (this as any)._source as MediaStreamAudioSourceNode | null;
      const audioContext = (this as any)._audioContext as AudioContext | null;
      const gainNode = (this as any)._gainNode as GainNode | null;

      if (processor) {
        processor.onaudioprocess = null;
        try {
          processor.disconnect();
        } catch { }
      }

      if (source) {
        try {
          source.disconnect();
        } catch { }
      }

      if (gainNode) {
        try {
          gainNode.disconnect();
        } catch { }
      }

      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => { });
      }

      (this as any)._processor = null;
      (this as any)._source = null;
      (this as any)._gainNode = null;
      (this as any)._audioContext = null;
    } catch { }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(
        typeof event.data === "string"
          ? event.data
          : new TextDecoder().decode(event.data)
      );

      if (data.type === "Results") {
        this.handleTranscriptResult(data);
      } else if (data.type === "UtteranceEnd") {
        const text = this.getAccumulatedText();
        if (text.trim()) {
          this.callbacks.onUtteranceEnd?.(text);
          this.resetTranscripts();
        }
      } else if (data.type === "Error") {
        console.error("[DeepgramStream] Deepgram error:", data);
        this.callbacks.onError(
          new Error(data.message || "Deepgram returned an error")
        );
      }
    } catch (err) {
      console.error("[DeepgramStream] Failed to parse message:", err);
    }
  }

  private handleTranscriptResult(data: any): void {
    const alternatives = data.channel?.alternatives;
    if (!alternatives || alternatives.length === 0) return;

    const transcript = (alternatives[0].transcript || "").trim();
    if (!transcript) return;

    const isFinal = data.is_final === true;
    const speechFinal = data.speech_final === true;

    if (isFinal) {
      this.finalSegments.push(transcript);
      this.currentInterim = "";
    } else {
      this.currentInterim = transcript;
    }

    this.lastFullAccumulated = this.getFullLiveText();
    this.callbacks.onTranscript(transcript, isFinal, this.lastFullAccumulated);

    if (isFinal && speechFinal) {
      const finalText = this.getAccumulatedText();
      if (finalText.trim()) {
        this.callbacks.onUtteranceEnd?.(finalText);
        this.resetTranscripts();
      }
    }
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: "KeepAlive" }));
        } catch { }
      }
    }, KEEPALIVE_INTERVAL_MS);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private setState(newState: StreamState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
  }

  private resetTranscripts(): void {
    this.finalSegments = [];
    this.currentInterim = "";
    this.lastFullAccumulated = "";
  }

  private cleanup(): void {
    this.stopMediaRecorder();
    this.stopKeepAlive();

    if (this.drainTimeoutId) {
      clearTimeout(this.drainTimeoutId);
      this.drainTimeoutId = null;
    }

    if (this.socket) {
      try {
        if (
          this.socket.readyState === WebSocket.OPEN ||
          this.socket.readyState === WebSocket.CONNECTING
        ) {
          this.socket.close(1000, "client_cleanup");
        }
      } catch { }
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket = null;
    }

    this.mediaStream = null;

    if (this.state !== "closed") {
      this.setState("closed");
    }
  }
}

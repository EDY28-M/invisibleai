import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";

const AUDIO_CONFIG = {
  FFT_SIZE: 512,
  SMOOTHING: 0.8,
  MIN_BAR_HEIGHT: 2,
  MIN_BAR_WIDTH: 2,
  BAR_SPACING: 4,
  COLOR: {
    MIN_INTENSITY: 100,
    MAX_INTENSITY: 255,
    INTENSITY_RANGE: 155,
  },
} as const;

interface AudioVisualizerProps {
  isRecording: boolean;
  stream?: MediaStream | null;
}

export function AudioVisualizer({ stream, isRecording }: AudioVisualizerProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const latestLevelRef = useRef<number>(0);

  useEffect(() => {
    if (!isRecording) {
      latestLevelRef.current = 0;
      return;
    }

    let unlistenFn: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unlistenFn = await listen<number>("audio-level", (event) => {
          latestLevelRef.current = event.payload;
        });
      } catch (err) {
        console.error("Failed to subscribe to audio-level event:", err);
      }
    };

    setupListener();

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [isRecording]);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    oscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
      } catch {

      }
    });
    oscillatorsRef.current = [];
    gainNodesRef.current = [];
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  useEffect(() => {
    if (isRecording) {
      startVisualization();
    } else {
      cleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, isRecording]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;

        const rect = container.getBoundingClientRect();

        canvas.width = (rect.width - 2) * dpr;
        canvas.height = (rect.height - 2) * dpr;

        canvas.style.width = `${rect.width - 2}px`;
        canvas.style.height = `${rect.height - 2}px`;
      }
    };

    window.addEventListener("resize", handleResize);

    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const startVisualization = async () => {
    try {
      if (stream) {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = AUDIO_CONFIG.FFT_SIZE;
        analyser.smoothingTimeConstant = AUDIO_CONFIG.SMOOTHING;
        analyserRef.current = analyser;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
      }

      draw();
    } catch (error) {
      console.error("Error starting visualization:", error);
    }
  };

  const getBarColor = (normalizedHeight: number) => {
    const intensity =
      Math.floor(normalizedHeight * AUDIO_CONFIG.COLOR.INTENSITY_RANGE) +
      AUDIO_CONFIG.COLOR.MIN_INTENSITY;
    return `rgb(${intensity}, ${intensity}, ${intensity})`;
  };

  const drawBar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    centerY: number,
    width: number,
    height: number,
    color: string
  ) => {
    ctx.fillStyle = color;

    ctx.fillRect(x, centerY - height, width, height);

    ctx.fillRect(x, centerY, width, height);
  };

  const draw = () => {
    if (!isRecording) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    if (stream && !analyserRef.current) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    const bufferLength = 32;
    const fftSize = stream && analyserRef.current ? analyserRef.current.frequencyBinCount : 0;
    const frequencyData = new Uint8Array(fftSize);

    const drawFrame = () => {
      animationFrameRef.current = requestAnimationFrame(drawFrame);

      if (stream && analyserRef.current) {

        analyserRef.current.getByteFrequencyData(frequencyData);
      }

      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      const barWidth = Math.max(
        AUDIO_CONFIG.MIN_BAR_WIDTH,
        canvas.width / dpr / bufferLength - AUDIO_CONFIG.BAR_SPACING
      );
      const centerY = canvas.height / dpr / 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        let normalizedHeight = 0;

        let micHeight = 0;
        if (stream && analyserRef.current && frequencyData.length > 0) {
          const sampleIndex = Math.floor((i / bufferLength) * frequencyData.length);
          micHeight = frequencyData[sampleIndex] / 255;
        }

        let systemHeight = 0;
        const currentLevel = latestLevelRef.current;

        if (currentLevel > 0.002) {

          const centerFactor = 1.0 - Math.abs(i - bufferLength / 3) / (bufferLength / 3);

          const wave = Math.sin(Date.now() / 120 + i * 0.5) * 0.4 + 0.6;

          const jitter = Math.random() * 0.15;

          const boost = Math.min(1.0, currentLevel * 8.0);

          systemHeight = Math.max(0, (wave * Math.max(0, centerFactor) + jitter) * boost);
        }

        normalizedHeight = Math.max(micHeight, systemHeight);

        const barHeight = Math.max(
          AUDIO_CONFIG.MIN_BAR_HEIGHT,
          normalizedHeight * centerY
        );

        drawBar(
          ctx,
          x,
          centerY,
          barWidth,
          barHeight,
          getBarColor(normalizedHeight)
        );

        x += barWidth + AUDIO_CONFIG.BAR_SPACING;
      }
    };

    drawFrame();
  };

  return (
    <div ref={containerRef} className="!h-[32px] !w-full pl-4 pt-2">
      <canvas ref={canvasRef} className="h-full !w-full" />
    </div>
  );
}

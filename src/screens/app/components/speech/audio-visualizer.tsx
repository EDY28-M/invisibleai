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
  const phasesRef = useRef<number[]>([0, 0, 0, 0]);
  const smoothLevel = useRef<number>(0);

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
    cleanup();
    try {
      if (stream) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = AUDIO_CONFIG.FFT_SIZE;
        analyser.smoothingTimeConstant = AUDIO_CONFIG.SMOOTHING;
        analyserRef.current = analyser;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        if (audioContext.state === "suspended") {
          await audioContext.resume().catch((e) => console.error("Failed to resume context in startVisualization:", e));
        }
      }

      draw();
    } catch (error) {
      console.error("Error starting visualization:", error);
    }
  };

  const drawWave = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    phase: number,
    amplitude: number,
    frequency: number,
    color: string,
    lineWidth: number
  ) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";

    const centerY = height / 2;
    
    for (let x = 0; x < width; x++) {
      // Gaussian-like tapering envelope to pinch the ends of the wave
      const envelope = Math.sin((x / width) * Math.PI);
      
      // Combine base frequency with a second harmonic for more visual detail
      const sineVal = Math.sin(x * frequency + phase) * 0.8 + Math.sin(x * frequency * 2.2 - phase) * 0.2;
      const y = centerY + sineVal * amplitude * envelope;
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  const draw = () => {
    if (!isRecording) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    if (stream && !analyserRef.current) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Dynamic, colorful translucent overlapping waves configuration
    const WAVES = [
      {
        frequency: 0.022,
        phaseSpeed: 0.045,
        amplitudeFactor: 1.0,
        color: "rgba(16, 185, 129, 0.45)", // Emerald
        lineWidth: 1.3,
      },
      {
        frequency: 0.015,
        phaseSpeed: -0.03,
        amplitudeFactor: 0.8,
        color: "rgba(245, 158, 11, 0.35)", // Amber
        lineWidth: 1.0,
      },
      {
        frequency: 0.032,
        phaseSpeed: 0.06,
        amplitudeFactor: 0.6,
        color: "rgba(6, 182, 212, 0.4)", // Cyan
        lineWidth: 1.0,
      },
      {
        frequency: 0.048,
        phaseSpeed: -0.045,
        amplitudeFactor: 0.4,
        color: "rgba(168, 85, 247, 0.3)", // Violet
        lineWidth: 0.8,
      },
    ];

    const drawFrame = () => {
      animationFrameRef.current = requestAnimationFrame(drawFrame);

      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }

      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      ctx.clearRect(0, 0, width, height);

      // Compute microphone input volume via Time Domain RMS
      let micLevel = 0;
      if (stream && analyserRef.current) {
        const timeData = new Uint8Array(analyserRef.current.fftSize);
        analyserRef.current.getByteTimeDomainData(timeData);

        let sumSquares = 0;
        for (let j = 0; j < timeData.length; j++) {
          const normalized = (timeData[j] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / timeData.length);
        
        // Hyper-responsive sensitivity and gate
        const gate = 0.0005;
        if (rms > gate) {
          micLevel = (rms - gate) * 25.0;
        } else {
          micLevel = 0;
        }
      }

      // Compute loopback system audio level
      const systemLevel = latestLevelRef.current;
      
      // Select the maximum active level between mic and loopback system audio
      const targetLevel = Math.max(micLevel, systemLevel);
      
      // Boost quiet audio using power compression (pow 0.5) and clamp to 1.0
      const boostedLevel = Math.min(1.0, Math.pow(targetLevel, 0.5) * 3.5);
      
      // Smooth linear interpolation for transitions (faster response to rise, gentle fall)
      const isRising = boostedLevel > smoothLevel.current;
      const smoothingFactor = isRising ? 0.22 : 0.12;
      smoothLevel.current += (boostedLevel - smoothLevel.current) * smoothingFactor;

      // Keep a very tiny breathing baseline so the console always feels alive and responsive
      const activeLevel = Math.max(0.06, smoothLevel.current);
      const centerY = height / 2;
      const baseAmplitude = activeLevel * (centerY - 2);

      // Render wave layers
      for (let i = 0; i < WAVES.length; i++) {
        if (phasesRef.current[i] === undefined) {
          phasesRef.current[i] = 0;
        }
        phasesRef.current[i] += WAVES[i].phaseSpeed;

        const wave = WAVES[i];
        const amplitude = baseAmplitude * wave.amplitudeFactor;
        
        drawWave(
          ctx,
          width,
          height,
          phasesRef.current[i],
          amplitude,
          wave.frequency,
          wave.color,
          wave.lineWidth
        );
      }
    };

    drawFrame();
  };

  return (
    <div ref={containerRef} className="!h-[32px] !w-full pl-4 pt-1">
      <canvas ref={canvasRef} className="h-full !w-full" />
    </div>
  );
}

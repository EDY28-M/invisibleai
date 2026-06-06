import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";

const NUM_BARS = 32;
const BAR_WIDTH = 2;
const BAR_GAP = 2;
const MIN_HEIGHT = 2;

// Per-bar variation seeds (deterministic, computed once)
const barVariants = Array.from({ length: NUM_BARS }, (_, i) => ({
  speed: 1.2 + Math.sin(i * 1.9) * 0.6,
  phase: (i / NUM_BARS) * Math.PI * 2 + Math.cos(i * 0.7),
  envelope: Math.pow(Math.sin((i / (NUM_BARS - 1)) * Math.PI), 0.6), // center taller
}));

interface AudioVisualizerProps {
  isRecording: boolean;
  stream?: MediaStream | null;
}

export function AudioVisualizer({ stream, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const systemLevelRef = useRef(0);
  const smoothLevelRef = useRef(0);
  const timeRef = useRef(0);

  // Listen to system audio level from Rust
  useEffect(() => {
    if (!isRecording) { systemLevelRef.current = 0; return; }
    let unlisten: (() => void) | undefined;
    listen<number>("audio-level", (e) => { systemLevelRef.current = e.payload; })
      .then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [isRecording]);

  // Resize canvas on container change
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Setup mic analyser
  useEffect(() => {
    if (!isRecording) { cleanup(); return; }
    startViz();
    return cleanup;
  }, [stream, isRecording]);

  const cleanup = () => {
    cancelAnimationFrame(animFrameRef.current);
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  const startViz = async () => {
    cleanup();
    if (stream) {
      try {
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;
        ctx.createMediaStreamSource(stream).connect(analyser);
        if (ctx.state === "suspended") await ctx.resume();
      } catch { /* mic not available */ }
    }
    drawLoop();
  };

  const drawLoop = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const frame = () => {
      animFrameRef.current = requestAnimationFrame(frame);
      if (!isRecording) return;
      // Skip canvas work while the overlay window is hidden — it keeps rendering
      // (mounted) during capture, so without this the loop burns 60fps unseen.
      if (document.hidden) return;

      timeRef.current += 0.016;
      const t = timeRef.current;

      const W = canvas.width / dpr;
      const H = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Mic level
      let micLevel = 0;
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.fftSize);
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        micLevel = rms > 0.001 ? Math.min(1, rms * 18) : 0;
      }

      const systemLevel = Math.min(1, Math.pow(systemLevelRef.current, 0.45) * 4.5);
      const target = Math.max(micLevel, systemLevel);

      // Smooth: fast attack, slow decay
      const alpha = target > smoothLevelRef.current ? 0.25 : 0.08;
      smoothLevelRef.current += (target - smoothLevelRef.current) * alpha;

      const level = smoothLevelRef.current;
      const idle = level < 0.04;

      const totalW = NUM_BARS * BAR_WIDTH + (NUM_BARS - 1) * BAR_GAP;
      const startX = (W - totalW) / 2;
      const maxH = H - 4;
      const centerY = H / 2;

      // Color is identical for every bar within a frame, so read the theme from
      // the DOM and build the fill style ONCE here — not 32× inside the loop
      // (which was ~1920 DOM reads/sec at 60fps).
      const isDark = document.documentElement.classList.contains("dark");
      const [cr, cg, cb] = isDark ? [230, 230, 235] : [30, 30, 35];
      const opacity = idle ? (isDark ? 0.18 : 0.20) : (isDark ? 0.55 + level * 0.40 : 0.60 + level * 0.35);
      ctx.fillStyle = idle
        ? isDark ? `rgba(120,120,128,0.22)` : `rgba(160,160,168,0.28)`
        : `rgba(${cr},${cg},${cb},${opacity})`;

      for (let i = 0; i < NUM_BARS; i++) {
        const v = barVariants[i];
        const wave = idle
          ? Math.sin(t * v.speed + v.phase) * 0.5 + 0.5  // gentle breathing idle
          : Math.abs(Math.sin(t * v.speed * 1.4 + v.phase));

        const activeH = idle
          ? MIN_HEIGHT + wave * 4 * v.envelope
          : MIN_HEIGHT + wave * level * maxH * v.envelope;

        const barH = Math.max(MIN_HEIGHT, activeH);
        const x = startX + i * (BAR_WIDTH + BAR_GAP);
        const y = centerY - barH / 2;

        // Rounded bar
        const r = Math.min(BAR_WIDTH / 2, barH / 2);
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_WIDTH, barH, r);
        ctx.fill();
      }
    };

    frame();
  };

  return (
    <div ref={containerRef} className="h-8 w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

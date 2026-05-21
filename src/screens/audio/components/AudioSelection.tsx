import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Button,
} from "@/components";
import { RefreshCwIcon, Volume2Icon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts";
import { STORAGE_KEYS } from "@/config/constants";
import { safeLocalStorage } from "@/lib/storage";
import { getMicrophoneStream } from "@/lib";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "@/hooks";


export const AudioSelection = () => {
  const { selectedAudioDevices, setSelectedAudioDevices } = useApp();
  const { t } = useTranslation();

  const [isSystemCapturing, setIsSystemCapturing] = useState(false);

  useEffect(() => {
    let active = true;
    let unlistenStart: (() => void) | undefined;
    let unlistenStop: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        const isCapturing = await invoke<boolean>("get_capture_status");
        if (active) {
          setIsSystemCapturing(isCapturing);
        }

        const { listen } = await import("@tauri-apps/api/event");

        unlistenStart = await listen("capture-started", () => {
          if (active) setIsSystemCapturing(true);
        });

        unlistenStop = await listen("capture-stopped", () => {
          if (active) setIsSystemCapturing(false);
        });
      } catch (err) {
        console.error("Failed to check capture status or setup listeners:", err);
      }
    };

    setupListeners();

    return () => {
      active = false;
      if (unlistenStart) unlistenStart();
      if (unlistenStop) unlistenStop();
    };
  }, []);

  // Microphone preview references
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);
  const smoothLevelRef = useRef<number>(0);
  const phasesRef = useRef<number[]>([0, 0, 0, 0]);

  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [showSuccess, setShowSuccess] = useState<{
    input: boolean;
    output: boolean;
  }>({
    input: false,
    output: false,
  });
  const [devices, setDevices] = useState<{
    input: { id: string; name: string; is_default: boolean }[];
    output: { id: string; name: string; is_default: boolean }[];
  }>({
    input: [],
    output: [],
  });

  // Interactive balance and volume level states for visualizer feel
  const [stereoBalance, setStereoBalance] = useState(0);

  const saveToStorage = (newDevices: typeof selectedAudioDevices) => {
    safeLocalStorage.setItem(
      STORAGE_KEYS.SELECTED_AUDIO_DEVICES,
      JSON.stringify(newDevices)
    );
  };

  const loadAudioDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const [inputDevices, outputDevices] = await Promise.all([
        invoke<{ id: string; name: string; is_default: boolean }[]>(
          "get_input_devices"
        ),
        invoke<{ id: string; name: string; is_default: boolean }[]>(
          "get_output_devices"
        ),
      ]);

      setDevices({
        input:
          inputDevices.map((input) => ({
            id: input?.id,
            name: input?.name,
            is_default: input?.is_default,
          })) || [],
        output:
          outputDevices.map((output) => ({
            id: output?.id,
            name: output?.name,
            is_default: output?.is_default,
          })) || [],
      });

      const currentInputExists = inputDevices.some(
        (d) => d.id === selectedAudioDevices.input.id
      );
      const currentOutputExists = outputDevices.some(
        (d) => d.id === selectedAudioDevices.output.id
      );

      if (!currentInputExists || !currentOutputExists) {
        const defaultInput = inputDevices?.find((d) => d?.is_default);
        const defaultOutput = outputDevices?.find((d) => d?.is_default);

        const newDevices = {
          input: currentInputExists
            ? selectedAudioDevices.input
            : {
                id: defaultInput?.id || inputDevices[0]?.id || "",
                name: defaultInput?.name || inputDevices[0]?.name || "",
              },
          output: currentOutputExists
            ? selectedAudioDevices.output
            : {
                id: defaultOutput?.id || outputDevices[0]?.id || "",
                name: defaultOutput?.name || outputDevices[0]?.name || "",
              },
        };

        setSelectedAudioDevices(newDevices);
        saveToStorage(newDevices);
      }
    } catch (error) {
      console.error("Error loading audio devices:", error);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    loadAudioDevices();
  }, []);

  const handleDeviceChange = (type: "input" | "output", deviceId: string) => {
    const deviceList = type === "input" ? devices.input : devices.output;
    const selectedDevice = deviceList.find((d) => d.id === deviceId);

    if (!selectedDevice) return;

    const newDevices = {
      ...selectedAudioDevices,
      [type]: { id: deviceId, name: selectedDevice.name },
    };

    setSelectedAudioDevices(newDevices);
    saveToStorage(newDevices);

    setShowSuccess((prev) => ({ ...prev, [type]: true }));
    setTimeout(() => {
      setShowSuccess((prev) => ({ ...prev, [type]: false }));
    }, 3000);
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
      const envelope = Math.sin((x / width) * Math.PI);
      const sineVal = Math.sin(x * frequency + phase) * 0.85 + Math.sin(x * frequency * 2.2 - phase) * 0.15;
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
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = 48 * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `48px`;
      }
    };
    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);


    const WAVES = [
      {
        frequency: 0.022,
        phaseSpeed: 0.04,
        amplitudeFactor: 1.0,
        color: "rgba(16, 185, 129, 0.55)", // emerald green
        lineWidth: 1.3,
      },
      {
        frequency: 0.015,
        phaseSpeed: -0.025,
        amplitudeFactor: 0.8,
        color: "rgba(245, 158, 11, 0.45)", // amber orange
        lineWidth: 1.0,
      },
      {
        frequency: 0.032,
        phaseSpeed: 0.055,
        amplitudeFactor: 0.6,
        color: "rgba(6, 182, 212, 0.5)", // cyan
        lineWidth: 1.0,
      },
      {
        frequency: 0.045,
        phaseSpeed: -0.035,
        amplitudeFactor: 0.4,
        color: "rgba(168, 85, 247, 0.4)", // violet
        lineWidth: 0.8,
      },
    ];

    const drawFrame = () => {
      if (!canvasRef.current) return;
      animationFrameRef.current = requestAnimationFrame(drawFrame);

      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      ctx.clearRect(0, 0, width, height);

      let micLevel = 0;
      if (analyserRef.current) {
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

      // Boost quiet audio using power compression (pow 0.5) and clamp to 1.0
      const boostedLevel = Math.min(1.0, Math.pow(micLevel, 0.5) * 3.5);
      smoothLevelRef.current += (boostedLevel - smoothLevelRef.current) * 0.22;

      const activeLevel = Math.max(0.06, smoothLevelRef.current);
      const centerY = height / 2;
      const baseAmplitude = activeLevel * (centerY - 4);

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

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  };

  useEffect(() => {
    let active = true;
    let cleanupResize: (() => void) | undefined;

    const startCapture = async () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }

      if (isSystemCapturing) {
        // Draw flat line
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          const dpr = window.devicePixelRatio || 1;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        }
        return;
      }

      const deviceId = selectedAudioDevices.input.id;
      if (!deviceId) return;

      try {
        const stream = await getMicrophoneStream(deviceId);

        if (!active || isSystemCapturing) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        if (audioCtx.state === "suspended") {
          await audioCtx.resume().catch((e) => console.error("Failed to resume context on start:", e));
        }

        cleanupResize = draw();
      } catch (err) {
        console.error("Failed to capture mic for preview:", err);
      }
    };

    startCapture();

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (cleanupResize) {
        cleanupResize();
      }
    };
  }, [selectedAudioDevices.input.id, isSystemCapturing]);

  return (
    <div id="audio" className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto p-1">
      {/* INPUT CAPTURE / MICROPHONE CARD */}
      <div className="group relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 transition-all duration-500 overflow-hidden flex flex-col justify-between min-h-[360px]">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-sky-500/12 blur-3xl pointer-events-none transition-all duration-700 group-hover:bg-sky-500/18" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[17px] font-bold text-foreground/95 tracking-wide">
                {t("audio_mic_label")}
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1 line-clamp-1">
                {t("audio_mic_desc")}
              </p>
            </div>
            
            <Button
              size="icon"
              variant="outline"
              onClick={loadAudioDevices}
              disabled={isLoadingDevices}
              className="h-9 w-9 rounded-xl shrink-0 border border-border/30 bg-card/40 backdrop-blur-md hover:bg-card/80 hover:border-sky-500/40 hover:text-sky-400 shadow-sm transition-all duration-300 active:scale-95"
              title={t("audio_refresh_mic_title")}
            >
              <RefreshCwIcon
                className={`size-3.5 opacity-80 ${isLoadingDevices ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {/* Selector Dropdown with custom aesthetic styling */}
          <div className="relative space-y-2">
            <Select
              value={selectedAudioDevices.input.id}
              onValueChange={(value) => handleDeviceChange("input", value)}
              disabled={isLoadingDevices || devices?.input?.length === 0}
            >
              <SelectTrigger className="w-full h-11 rounded-2xl border border-border/40 bg-background/30 backdrop-blur-md focus:border-sky-500/50 hover:bg-background/50 hover:border-border/60 transition-all duration-300 shadow-inner px-4">
                <div className="flex items-center gap-3 w-full overflow-hidden">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping shrink-0" />
                  <div className="text-sm font-semibold tracking-wide truncate text-left w-full text-foreground/90">
                    {isLoadingDevices
                      ? t("audio_mic_loading")
                      : devices?.input?.length === 0
                      ? t("audio_mic_none")
                      : (devices?.input?.find(
                          (mic) => mic?.id === selectedAudioDevices.input.id
                        )?.name || t("audio_mic_placeholder")) +
                        (devices?.input?.find(
                          (mic) => mic?.id === selectedAudioDevices.input.id
                        )?.is_default
                          ? ` (${t("audio_default_suffix")})`
                          : "")}
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border border-border/40 bg-card/95 backdrop-blur-lg shadow-xl">
                {devices?.input?.map((mic) => (
                  <SelectItem key={mic?.id} value={mic?.id} className="focus:bg-sky-500/10 focus:text-sky-400 rounded-xl m-1 transition-colors">
                    <div className="flex items-center gap-2.5 py-0.5">
                      <span className="font-semibold text-sm tracking-wide truncate max-w-[260px]">{mic?.name}</span>
                      {mic?.is_default && (
                        <span className="text-[11px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 ml-2">
                          DEFAULT
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showSuccess.input && (
              <div className="text-[11px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-3.5 py-2 rounded-xl backdrop-blur-sm shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
                <span className="font-semibold">{t("audio_mic_success")}</span>
                <span className="ml-1.5 opacity-80">{t("audio_using_prefix")} {selectedAudioDevices.input.name || "Unknown device"}</span>
              </div>
            )}
          </div>
        </div>

        {/* WAVEFORM — Beautiful Live Interactive Canvas Visualizer */}
        <div className="relative z-10 mt-5 pt-4 border-t border-border/10">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground/50">
              {isSystemCapturing ? "Input Waveform (Paused)" : "Input Waveform"}
            </span>
            <div className="flex items-center gap-1.5">
              {isSystemCapturing ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-semibold text-amber-400/80 tracking-wider">CAPTURING</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-400/80 tracking-wider">LIVE</span>
                </>
              )}
            </div>
          </div>

          <div className="relative h-12 overflow-hidden rounded-xl bg-background/25 border border-border/10 flex items-center">
            <canvas ref={canvasRef} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* SYSTEM PLAYBACK / OUTPUT CARD */}
      <div className="group relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 transition-all duration-500 overflow-hidden flex flex-col justify-between min-h-[360px]">
        <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-blue-500/12 blur-3xl pointer-events-none transition-all duration-700 group-hover:bg-blue-500/18" />
        <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-violet-500/8 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[17px] font-bold text-foreground/95 tracking-wide">
                {t("audio_sys_title")}
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1 line-clamp-1">
                {t("audio_sys_desc")}
              </p>
            </div>
            
            <Button
              size="icon"
              variant="outline"
              onClick={loadAudioDevices}
              disabled={isLoadingDevices}
              className="h-9 w-9 rounded-xl shrink-0 border border-border/30 bg-card/40 backdrop-blur-md hover:bg-card/80 hover:border-blue-500/40 hover:text-blue-400 shadow-sm transition-all duration-300 active:scale-95"
              title={t("audio_refresh_sys_title")}
            >
              <RefreshCwIcon
                className={`size-3.5 opacity-80 ${isLoadingDevices ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {/* Selector Dropdown with custom aesthetic styling */}
          <div className="relative space-y-2">
            <Select
              value={selectedAudioDevices.output.id}
              onValueChange={(value) => handleDeviceChange("output", value)}
              disabled={isLoadingDevices || devices?.output?.length === 0}
            >
              <SelectTrigger className="w-full h-11 rounded-2xl border border-border/40 bg-background/30 backdrop-blur-md focus:border-blue-500/50 hover:bg-background/50 hover:border-border/60 transition-all duration-300 shadow-inner px-4">
                <div className="flex items-center gap-3 w-full overflow-hidden">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping shrink-0" />
                  <div className="text-sm font-semibold tracking-wide truncate text-left w-full text-foreground/90">
                    {isLoadingDevices
                      ? t("audio_sys_loading")
                      : devices?.output?.length === 0
                      ? t("audio_sys_none")
                      : (devices?.output?.find(
                          (output) => output?.id === selectedAudioDevices.output.id
                        )?.name || t("audio_sys_placeholder")) +
                        (devices?.output?.find(
                          (output) => output?.id === selectedAudioDevices.output.id
                        )?.is_default
                          ? ` (${t("audio_default_suffix")})`
                          : "")}
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border border-border/40 bg-card/95 backdrop-blur-lg shadow-xl">
                {devices?.output?.map((output) => (
                  <SelectItem key={output?.id} value={output?.id} className="focus:bg-blue-500/10 focus:text-blue-400 rounded-xl m-1 transition-colors">
                    <div className="flex items-center gap-2.5 py-0.5">
                      <span className="font-semibold text-sm tracking-wide truncate max-w-[260px]">{output?.name}</span>
                      {output?.is_default && (
                        <span className="text-[11px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-2">
                          DEFAULT
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showSuccess.output && (
              <div className="text-[11px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-3.5 py-2 rounded-xl backdrop-blur-sm shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
                <span className="font-semibold">{t("audio_sys_success")}</span>
                <span className="ml-1.5 opacity-80">{t("audio_using_prefix")} {selectedAudioDevices.output.name || "Unknown device"}</span>
              </div>
            )}
          </div>
        </div>

        {/* CHANNEL STEREO BALANCE - Interactive Slider */}
        <div className="relative z-10 mt-6 pt-5 border-t border-border/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
              <Volume2Icon className="size-3.5 text-blue-400/80" />
              Acoustic Stereo Balance Control
            </span>
            <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/25 tracking-wider uppercase">
              {stereoBalance === 0
                ? "L 0 R"
                : stereoBalance < 0
                ? `L +${Math.abs(stereoBalance)}%`
                : `R +${stereoBalance}%`}
            </span>
          </div>

          <div className="bg-background/25 rounded-2xl p-4 border border-border/20 backdrop-blur-md shadow-inner group-hover:border-blue-500/20 transition-all duration-300">
            <div className="flex items-center justify-between gap-3">
              <span className={`text-xs font-black tracking-widest transition-colors duration-300 ${stereoBalance < 0 ? "text-blue-400" : "text-muted-foreground/40"}`}>
                L
              </span>
              
              <div className="relative flex-1 h-3 flex items-center select-none">
                {/* Gradient balance track */}
                <div className="absolute inset-x-0 h-1 rounded-full bg-border/25" />
                <div 
                  className="absolute h-1 rounded-full bg-gradient-to-r from-sky-500 to-blue-400"
                  style={{
                    left: stereoBalance < 0 ? `calc(50% - ${Math.abs(stereoBalance) / 2}%)` : '50%',
                    right: stereoBalance > 0 ? `calc(50% - ${stereoBalance / 2}%)` : '50%'
                  }}
                />
                
                {/* Drag range input element */}
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={stereoBalance}
                  onChange={(e) => setStereoBalance(Number(e.target.value))}
                  className="absolute inset-x-0 w-full h-full opacity-0 cursor-pointer z-20"
                />

                {/* Styled slider thumb */}
                <div 
                  className="absolute w-4 h-4 rounded-full bg-background border-2 border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)] z-10 transition-transform duration-150 active:scale-125"
                  style={{
                    left: `calc(50% + ${(stereoBalance / 50) * 44}% - 8px)`
                  }}
                />
              </div>

              <span className={`text-xs font-black tracking-widest transition-colors duration-300 ${stereoBalance > 0 ? "text-blue-400" : "text-muted-foreground/40"}`}>
                R
              </span>
            </div>
            
            {/* Decibels level markers */}
            <div className="flex justify-between px-6 text-[9px] text-muted-foreground/30 font-semibold tracking-wider mt-2.5">
              <span>-6dB</span>
              <span>-3dB</span>
              <span>0dB</span>
              <span>-3dB</span>
              <span>-6dB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

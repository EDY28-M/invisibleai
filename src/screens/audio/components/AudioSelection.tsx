import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Button,
} from "@/components";
import { RefreshCwIcon, Volume2Icon } from "lucide-react";
import { useState, useEffect } from "react";
import { useApp } from "@/contexts";
import { STORAGE_KEYS } from "@/config/constants";
import { safeLocalStorage } from "@/lib/storage";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "@/hooks";


export const AudioSelection = () => {
  const { selectedAudioDevices, setSelectedAudioDevices } = useApp();
  const { t } = useTranslation();

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

        {/* WAVEFORM — SVG sine wave animation */}
        <div className="relative z-10 mt-5 pt-4 border-t border-border/10">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground/50">
              Input Waveform
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400/80 tracking-wider">LIVE</span>
            </div>
          </div>

          <style>{`
            @keyframes wave-scroll {
              from { transform: translateX(0); }
              to   { transform: translateX(-50%); }
            }
            @keyframes wave-scroll-slow {
              from { transform: translateX(-25%); }
              to   { transform: translateX(-75%); }
            }
            .wave-anim   { animation: wave-scroll 3s linear infinite; }
            .wave-anim-2 { animation: wave-scroll-slow 4.5s linear infinite; }
          `}</style>

          <div className="relative h-12 overflow-hidden rounded-lg">
            {/* Primary wave */}
            <svg
              viewBox="0 0 800 48"
              preserveAspectRatio="none"
              className="absolute inset-0 w-[200%] h-full wave-anim"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,24 C25,8 50,40 75,24 C100,8 125,40 150,24 C175,8 200,40 225,24 C250,8 275,40 300,24 C325,8 350,40 375,24 C400,8 425,40 450,24 C475,8 500,40 525,24 C550,8 575,40 600,24 C625,8 650,40 675,24 C700,8 725,40 750,24 C775,8 800,40 800,24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-foreground/40"
              />
            </svg>
            {/* Ghost secondary wave (offset + slower) */}
            <svg
              viewBox="0 0 800 48"
              preserveAspectRatio="none"
              className="absolute inset-0 w-[200%] h-full wave-anim-2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,24 C20,6 55,42 80,24 C105,6 140,42 165,24 C190,6 225,42 250,24 C275,6 310,42 335,24 C360,6 395,42 420,24 C445,6 480,42 505,24 C530,6 565,42 590,24 C615,6 650,42 675,24 C700,6 735,42 760,24 C785,6 800,38 800,24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-foreground/20"
              />
            </svg>
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


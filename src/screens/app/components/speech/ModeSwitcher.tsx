import { cn } from "@/lib/utils";
import { AudioWaveformIcon, MicIcon, RadioIcon } from "lucide-react";

interface ModeSwitcherProps {
  isVadMode: boolean;
  isDualChannel: boolean;
  onModeChange: (vadEnabled: boolean, dualChannelEnabled: boolean) => void;
  disabled?: boolean;
}

export const ModeSwitcher = ({
  isVadMode,
  isDualChannel,
  onModeChange,
  disabled = false,
}: ModeSwitcherProps) => {

  const currentMode = !isVadMode
    ? "manual"
    : isDualChannel
    ? "both"
    : "auto";

  return (
    <div
      className={cn(
        "flex bg-neutral-100/60 dark:bg-neutral-900/40 backdrop-blur-xl rounded-[18px] p-1.5 gap-1.5 border border-black/5 dark:border-white/10 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03),_0_8px_32px_rgba(0,0,0,0.05)] w-full items-stretch transition-all duration-300",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {/* 1. AUTO MODE BUTTON */}
      <button
        type="button"
        onClick={() => onModeChange(true, false)}
        disabled={disabled}
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1.5 py-2 px-3 rounded-[12px] transition-all duration-300 relative overflow-hidden select-none active:scale-[0.98]",
          currentMode === "auto"
            ? "bg-gradient-to-b from-sky-500/10 to-sky-500/[0.02] border border-sky-500/20 shadow-[0_4px_16px_rgba(14,165,233,0.06),_inset_0_1px_1px_rgba(255,255,255,0.4)] text-sky-600 dark:text-sky-400 scale-[1.01]"
            : "text-muted-foreground/70 hover:text-foreground/90 hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40"
        )}
      >
        {currentMode === "auto" && (
          <span className="absolute inset-0 bg-radial from-sky-400/10 to-transparent pointer-events-none" />
        )}
        
        {/* Glow-enhanced Icon Container */}
        <div className={cn(
          "p-1.5 rounded-lg transition-all duration-300",
          currentMode === "auto" ? "bg-sky-500/15" : "bg-transparent"
        )}>
          <AudioWaveformIcon 
            className={cn(
              "w-4 h-4 transition-transform duration-300",
              currentMode === "auto" ? "scale-110" : "opacity-80"
            )} 
          />
        </div>

        {/* Labels with bespoke high-end typography */}
        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] font-black tracking-widest uppercase font-sans">
            Auto
          </span>
          <span className="text-[8px] font-semibold opacity-65 tracking-wider mt-0.5">
            Sistema VAD
          </span>
        </div>
      </button>

      {/* 2. DUAL CHANNEL (MULTIHILO) MODE BUTTON */}
      <button
        type="button"
        onClick={() => onModeChange(true, true)}
        disabled={disabled}
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1.5 py-2 px-3 rounded-[12px] transition-all duration-300 relative overflow-hidden select-none active:scale-[0.98]",
          currentMode === "both"
            ? "bg-gradient-to-b from-emerald-500/10 to-emerald-500/[0.02] border border-emerald-500/25 shadow-[0_4px_16px_rgba(16,185,129,0.06),_inset_0_1px_1px_rgba(255,255,255,0.4)] text-emerald-600 dark:text-emerald-400 scale-[1.01]"
            : "text-muted-foreground/70 hover:text-foreground/90 hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40"
        )}
      >
        {currentMode === "both" && (
          <span className="absolute inset-0 bg-radial from-emerald-400/10 to-transparent pointer-events-none" />
        )}
        
        {/* Glow-enhanced Icon Container with subtle active rotation */}
        <div className={cn(
          "p-1.5 rounded-lg transition-all duration-300",
          currentMode === "both" ? "bg-emerald-500/15" : "bg-transparent"
        )}>
          <RadioIcon
            className={cn(
              "w-4 h-4 transition-all duration-[6s] linear",
              currentMode === "both" ? "scale-110 animate-spin" : "opacity-80"
            )}
          />
        </div>

        {/* Labels with bespoke high-end typography */}
        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] font-black tracking-widest uppercase font-sans">
            Multihilo
          </span>
          <span className="text-[8px] font-semibold opacity-65 tracking-wider mt-0.5">
            Sistema + Mic
          </span>
        </div>
      </button>

      {/* 3. MANUAL (PTT) MODE BUTTON */}
      <button
        type="button"
        onClick={() => onModeChange(false, false)}
        disabled={disabled}
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1.5 py-2 px-3 rounded-[12px] transition-all duration-300 relative overflow-hidden select-none active:scale-[0.98]",
          currentMode === "manual"
            ? "bg-gradient-to-b from-amber-500/10 to-amber-500/[0.02] border border-amber-500/20 shadow-[0_4px_16px_rgba(245,158,11,0.06),_inset_0_1px_1px_rgba(255,255,255,0.4)] text-amber-600 dark:text-amber-400 scale-[1.01]"
            : "text-muted-foreground/70 hover:text-foreground/90 hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40"
        )}
      >
        {currentMode === "manual" && (
          <span className="absolute inset-0 bg-radial from-amber-400/10 to-transparent pointer-events-none" />
        )}
        
        {/* Glow-enhanced Icon Container */}
        <div className={cn(
          "p-1.5 rounded-lg transition-all duration-300",
          currentMode === "manual" ? "bg-amber-500/15" : "bg-transparent"
        )}>
          <MicIcon 
            className={cn(
              "w-4 h-4 transition-transform duration-300",
              currentMode === "manual" ? "scale-110" : "opacity-80"
            )} 
          />
        </div>

        {/* Labels with bespoke high-end typography */}
        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] font-black tracking-widest uppercase font-sans">
            Manual
          </span>
          <span className="text-[8px] font-semibold opacity-65 tracking-wider mt-0.5">
            Sistema PTT
          </span>
        </div>
      </button>
    </div>
  );
};

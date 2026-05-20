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
        "h-11 flex bg-neutral-200/40 dark:bg-neutral-900/30 backdrop-blur-xl rounded-2xl p-1 gap-1 border border-black/5 dark:border-white/5 shadow-inner items-center transition-all duration-300 shrink-0",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {/* 1. AUTO MODE BUTTON */}
      <button
        type="button"
        onClick={() => onModeChange(true, false)}
        disabled={disabled}
        className={cn(
          "h-9 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer active:scale-95 text-xs font-semibold",
          currentMode === "auto"
            ? "bg-amber-500/[0.08] dark:bg-amber-400/[0.08] border border-amber-500/20 dark:border-amber-400/15 text-amber-800 dark:text-amber-300 shadow-xs"
            : "text-muted-foreground/80 hover:text-foreground hover:bg-neutral-200/30 dark:hover:bg-neutral-800/30"
        )}
      >
        <AudioWaveformIcon
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-300",
            currentMode === "auto" ? "text-amber-500 dark:text-amber-400 scale-105" : "opacity-70"
          )}
        />
        <span className="font-semibold tracking-wide">Auto</span>
      </button>

      {/* 2. DUAL CHANNEL (MULTIHILO) MODE BUTTON */}
      <button
        type="button"
        onClick={() => onModeChange(true, true)}
        disabled={disabled}
        className={cn(
          "h-9 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer active:scale-95 text-xs font-semibold",
          currentMode === "both"
            ? "bg-amber-500/[0.08] dark:bg-amber-400/[0.08] border border-amber-500/20 dark:border-amber-400/15 text-amber-800 dark:text-amber-300 shadow-xs"
            : "text-muted-foreground/80 hover:text-foreground hover:bg-neutral-200/30 dark:hover:bg-neutral-800/30"
        )}
      >
        <RadioIcon
          className={cn(
            "w-3.5 h-3.5 transition-all duration-300",
            currentMode === "both" ? "text-amber-500 dark:text-amber-400 scale-105" : "opacity-70"
          )}
        />
        <span className="font-semibold tracking-wide">Multihilo</span>
      </button>

      {/* 3. MANUAL (PTT) MODE BUTTON */}
      <button
        type="button"
        onClick={() => onModeChange(false, false)}
        disabled={disabled}
        className={cn(
          "h-9 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer active:scale-95 text-xs font-semibold",
          currentMode === "manual"
            ? "bg-amber-500/[0.08] dark:bg-amber-400/[0.08] border border-amber-500/20 dark:border-amber-400/15 text-amber-800 dark:text-amber-300 shadow-xs"
            : "text-muted-foreground/80 hover:text-foreground hover:bg-neutral-200/30 dark:hover:bg-neutral-800/30"
        )}
      >
        <MicIcon
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-300",
            currentMode === "manual" ? "text-amber-500 dark:text-amber-400 scale-105" : "opacity-70"
          )}
        />
        <span className="font-semibold tracking-wide">Manual</span>
      </button>
    </div>
  );
};


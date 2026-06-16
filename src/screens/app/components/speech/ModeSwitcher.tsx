import { Switch } from "@/components";
import { cn } from "@/lib/utils";
import { AppIcons } from "../icons/AppIcons";

interface ModeSwitcherProps {
  isVadMode: boolean;
  isDualChannel: boolean;
  isStreamingMode?: boolean;
  streamingSmartMode?: boolean;
  onModeChange: (vadEnabled: boolean, dualChannelEnabled: boolean) => void;
  onStreamingSmartModeChange?: (enabled: boolean) => void;
  disabled?: boolean;
}

export const ModeSwitcher = ({
  isVadMode,
  isDualChannel,
  isStreamingMode = false,
  streamingSmartMode = false,
  onModeChange,
  onStreamingSmartModeChange,
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
        "h-11 max-w-full flex flex-nowrap bg-neutral-200/40 dark:bg-neutral-900/30 backdrop-blur-xl rounded-2xl p-1 gap-1 border border-black/5 dark:border-white/5 shadow-inner items-center transition-all duration-300 shrink-0",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {/* 1. AUTO MODE BUTTON */}
      <button
        type="button"
        onClick={() => onModeChange(true, false)}
        disabled={disabled}
        className={cn(
          "h-9 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer active:scale-95 text-xs font-semibold",
          currentMode === "auto"
            ? "seg-active"
            : "text-muted-foreground/80 hover:text-foreground hover:bg-neutral-200/30 dark:hover:bg-neutral-800/30"
        )}
      >
        <AppIcons.Auto
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-300",
            currentMode === "auto" ? "text-zinc-800 dark:text-zinc-200 scale-105" : "opacity-50"
          )}
          strokeWidth={1.7}
        />
        <span className="font-semibold tracking-wide">Auto</span>
      </button>

      {/* 2. DUAL CHANNEL (MULTIHILO) MODE BUTTON */}
      <button
        type="button"
        onClick={() => onModeChange(true, true)}
        disabled={disabled}
        className={cn(
          "h-9 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer active:scale-95 text-xs font-semibold",
          currentMode === "both"
            ? "seg-active"
            : "text-muted-foreground/80 hover:text-foreground hover:bg-neutral-200/30 dark:hover:bg-neutral-800/30"
        )}
      >
        <AppIcons.Multi
          className={cn(
            "w-3.5 h-3.5 transition-all duration-300",
            currentMode === "both" ? "text-zinc-800 dark:text-zinc-200 scale-105" : "opacity-50"
          )}
          strokeWidth={1.7}
        />
        <span className="font-semibold tracking-wide">Multihilo</span>
      </button>

      {!isStreamingMode && (
        <button
          type="button"
          onClick={() => onModeChange(false, false)}
          disabled={disabled}
          className={cn(
            "h-9 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer active:scale-95 text-xs font-semibold",
            currentMode === "manual"
              ? "seg-active"
              : "text-muted-foreground/80 hover:text-foreground hover:bg-neutral-200/30 dark:hover:bg-neutral-800/30"
          )}
        >
          <AppIcons.Mic
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-300",
              currentMode === "manual" ? "text-zinc-800 dark:text-zinc-200 scale-105" : "opacity-50"
            )}
            strokeWidth={1.7}
          />
          <span className="font-semibold tracking-wide">Manual</span>
        </button>
      )}

      {isStreamingMode && onStreamingSmartModeChange && (
        <label
          className={cn(
            "h-9 px-3 max-[640px]:px-2 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 text-xs font-semibold whitespace-nowrap",
            streamingSmartMode
              ? "seg-active"
              : "text-muted-foreground/80 hover:text-foreground hover:bg-neutral-200/30 dark:hover:bg-neutral-800/30"
          )}
          title="Activa detección avanzada para preguntas, debates, opiniones y objeciones del audio del sistema"
        >
          <AppIcons.Smart
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-300",
              streamingSmartMode ? "text-zinc-800 dark:text-zinc-200 scale-105" : "opacity-50"
            )}
            strokeWidth={1.7}
          />
          <span className="font-semibold tracking-wide">inteligente</span>
          <Switch
            checked={streamingSmartMode}
            onCheckedChange={onStreamingSmartModeChange}
            disabled={disabled}
            className="scale-75"
          />
        </label>
      )}
    </div>
  );
};

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
        "flex bg-muted/60 backdrop-blur-md rounded-xl w-full p-1 gap-1 border border-border/20 shadow-inner",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {}
      <button
        type="button"
        onClick={() => onModeChange(true, false)}
        disabled={disabled}
        className={cn(
          "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-300",
          currentMode === "auto"
            ? "bg-background shadow-md text-foreground font-semibold scale-[1.02]"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
        )}
      >
        <AudioWaveformIcon className="w-3.5 h-3.5 flex-shrink-0 text-primary/80" />
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <span className="text-[10px] font-medium leading-none">Auto</span>
          <span className="text-[8px] font-normal opacity-50 leading-none mt-0.5">
            (Sistema VAD)
          </span>
        </div>
      </button>

      {}
      <button
        type="button"
        onClick={() => onModeChange(true, true)}
        disabled={disabled}
        className={cn(
          "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-300 relative overflow-hidden",
          currentMode === "both"
            ? "bg-background shadow-md text-foreground font-semibold scale-[1.02] border border-green-500/20"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
        )}
      >
        {currentMode === "both" && (
          <span className="absolute inset-0 bg-green-500/5 animate-pulse pointer-events-none" />
        )}
        <RadioIcon
          className={cn(
            "w-3.5 h-3.5 flex-shrink-0 transition-transform duration-700",
            currentMode === "both" ? "text-green-500 animate-spin" : "text-muted-foreground/80"
          )}
          style={currentMode === "both" ? { animationDuration: "6s" } : undefined}
        />
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <span className="text-[10px] font-medium leading-none">Multihilo</span>
          <span className="text-[8px] font-normal opacity-50 leading-none mt-0.5">
            (Sistema + Mic)
          </span>
        </div>
      </button>

      {}
      <button
        type="button"
        onClick={() => onModeChange(false, false)}
        disabled={disabled}
        className={cn(
          "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-300",
          currentMode === "manual"
            ? "bg-background shadow-md text-foreground font-semibold scale-[1.02]"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
        )}
      >
        <MicIcon className="w-3.5 h-3.5 flex-shrink-0 text-orange-500/80" />
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <span className="text-[10px] font-medium leading-none">Manual</span>
          <span className="text-[8px] font-normal opacity-50 leading-none mt-0.5">
            (Sistema PTT)
          </span>
        </div>
      </button>
    </div>
  );
};

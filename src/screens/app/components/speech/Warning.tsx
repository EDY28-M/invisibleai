import { useState } from "react";
import {
  InfoIcon,
  ChevronDownIcon,
  KeyboardIcon,
  AudioWaveformIcon,
  MicIcon,
  CameraIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WarningProps {
  isVadMode: boolean;
}

export const Warning = ({ isVadMode }: WarningProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isMac = navigator.platform.toLowerCase().includes("mac");
  const modKey = isMac ? "⌘" : "Ctrl"; return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] backdrop-blur-md overflow-hidden transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.03)] hover:border-black/15 dark:hover:border-white/20">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <InfoIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-500 group-hover:text-foreground transition-colors" />
          <span className="text-xs font-bold tracking-tight text-foreground/90 font-sans">
            Help & Keyboard Shortcuts
          </span>
        </div>
        <ChevronDownIcon
          className={cn(
            "w-4 h-4 text-muted-foreground/60 transition-transform duration-300",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div
            className={cn(
              "flex items-start gap-3 p-3 rounded-xl border transition-all duration-300",
              isVadMode
                ? "bg-zinc-500/5 dark:bg-zinc-500/10 border-zinc-500/20 text-foreground"
                : "bg-zinc-500/5 dark:bg-zinc-500/10 border-zinc-500/20 text-foreground"
            )}
          >
            {isVadMode ? (
              <div className="p-1 rounded-lg bg-zinc-500/10 dark:bg-zinc-500/20 text-zinc-500">
                <AudioWaveformIcon className="w-4 h-4 animate-pulse" />
              </div>
            ) : (
              <div className="p-1 rounded-lg bg-zinc-500/10 dark:bg-zinc-500/20 text-zinc-500">
                <MicIcon className="w-4 h-4" />
              </div>
            )}
            <div>
              <p className="text-xs font-extrabold tracking-tight">
                {isVadMode ? "Auto-detect Mode (VAD)" : "Manual Mode (Push-to-Talk)"}
              </p>
              <p className="text-[10px] opacity-80 leading-relaxed mt-0.5">
                {isVadMode
                  ? "Speech is automatically detected from system audio. When someone speaks, it will be captured and transcribed."
                  : "Press the record button or use keyboard shortcuts to manually control recording."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 pl-0.5">
              <KeyboardIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
              <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Keyboard Shortcuts
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center justify-between p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 font-medium hover:border-black/10 dark:hover:border-white/10 transition-colors">
                <span className="text-muted-foreground/90">Scroll down</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border-b-2 border-neutral-300 dark:border-neutral-700 shadow-sm font-mono text-[9px] font-bold text-foreground/80">
                  ↓
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 font-medium hover:border-black/10 dark:hover:border-white/10 transition-colors">
                <span className="text-muted-foreground/90">Scroll up</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border-b-2 border-neutral-300 dark:border-neutral-700 shadow-sm font-mono text-[9px] font-bold text-foreground/80">
                  ↑
                </kbd>
              </div>
              {!isVadMode && (
                <>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 font-medium hover:border-black/10 dark:hover:border-white/10 transition-colors">
                    <span className="text-muted-foreground/90">Start/Stop</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border-b-2 border-neutral-300 dark:border-neutral-700 shadow-sm font-mono text-[9px] font-bold text-foreground/80">
                      Enter
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 font-medium hover:border-black/10 dark:hover:border-white/10 transition-colors">
                    <span className="text-muted-foreground/90">Start record</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border-b-2 border-neutral-300 dark:border-neutral-700 shadow-sm font-mono text-[9px] font-bold text-foreground/80">
                      Space
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 font-medium hover:border-black/10 dark:hover:border-white/10 transition-colors">
                    <span className="text-muted-foreground/90">Discard</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border-b-2 border-neutral-300 dark:border-neutral-700 shadow-sm font-mono text-[9px] font-bold text-foreground/80">
                      Esc
                    </kbd>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 font-medium hover:border-black/10 dark:hover:border-white/10 transition-colors">
                <span className="text-muted-foreground/90">Toggle view</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border-b-2 border-neutral-300 dark:border-neutral-700 shadow-sm font-mono text-[9px] font-bold text-foreground/80">
                  {modKey}+K
                </kbd>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 pl-0.5">
              <CameraIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
              <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Screenshot Feature
              </span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/[0.02] dark:bg-indigo-500/[0.04] border border-indigo-500/10 dark:border-indigo-500/15 text-[10px] text-muted-foreground space-y-1.5 leading-relaxed">
              <p>
                <strong className="text-foreground/90">Visual Context Link:</strong> Captures your current screen and attaches it to your next transcription automatically.
              </p>
              <p>
                The AI receives both the transcription and the screenshot image, allowing it to provide highly context-aware responses based on what you're working on.
              </p>
              <p className="text-[9px] opacity-75 italic">
                * The screenshot is cleared automatically after each sent message to preserve your privacy.
              </p>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground/80 space-y-2 pt-3 border-t border-black/5 dark:border-white/5 leading-normal">
            <div className="flex items-start gap-1.5">
              <span className="text-primary font-bold">•</span>
              <p><strong>Tip:</strong> Use Auto-detect for hands-free operation during interviews.</p>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-primary font-bold">•</span>
              <p><strong>Tip:</strong> Use Manual mode when you need precise control over what gets transcribed.</p>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-primary font-bold">•</span>
              <p><strong>Tip:</strong> Quick Actions let you send follow-up prompts with one click.</p>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-primary font-bold">•</span>
              <p><strong>Tip:</strong> Use Screenshot to share your screen context with the AI for more relevant responses.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

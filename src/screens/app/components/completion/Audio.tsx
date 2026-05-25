import { Popover, PopoverContent, PopoverTrigger, Button } from "@/components";
import { AutoSpeechVAD } from "./AutoSpeechVad";
import { UseCompletionReturn } from "@/types";
import { useApp } from "@/contexts";
import { AppIcons } from "../icons/AppIcons";

export const Audio = ({
  micOpen,
  setMicOpen,
  enableVAD,
  setEnableVAD,
  submit,
  setState,
}: UseCompletionReturn) => {
  const { selectedAudioDevices } = useApp();

  return (
    <Popover open={micOpen} onOpenChange={setMicOpen}>
      <PopoverTrigger asChild>
        {enableVAD ? (
          // VAD active — server handles STT when no custom provider is configured
          <AutoSpeechVAD
            key={selectedAudioDevices.input.id}
            submit={submit}
            setState={setState}
            setEnableVAD={setEnableVAD}
            microphoneDeviceId={selectedAudioDevices.input.id}
          />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEnableVAD(!enableVAD);
            }}
            className="cursor-pointer h-9 w-9 rounded-[14px] transition-all duration-300 border border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/5 dark:hover:border-white/5 text-foreground/80 hover:text-foreground hover:scale-105 active:scale-95 shrink-0"
            title="Toggle voice input"
          >
            <AppIcons.Mic className="h-4.5 w-4.5" strokeWidth={1.7} />
          </Button>
        )}
      </PopoverTrigger>

      {/* PopoverContent kept for Popover API completeness; hidden since server is always available as fallback */}
      <PopoverContent
        align="end"
        side="bottom"
        className="hidden"
        sideOffset={8}
      />
    </Popover>
  );
};

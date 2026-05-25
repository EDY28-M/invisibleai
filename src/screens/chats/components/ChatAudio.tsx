import { MicIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, Button } from "@/components";

interface ChatAudioProps {
  micOpen: boolean;
  setMicOpen: (open: boolean) => void;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  disabled: boolean;
}

export const ChatAudio = ({
  micOpen,
  setMicOpen,
  isRecording,
  setIsRecording,
  disabled,
}: ChatAudioProps) => {
  // Server is always the fallback — mic is always available
  const handleMicClick = () => {
    setIsRecording(!isRecording);
  };

  return (
    <Popover open={micOpen} onOpenChange={setMicOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          onClick={handleMicClick}
          className="size-7 lg:size-9 rounded-lg lg:rounded-xl"
          title={isRecording ? "Recording..." : "Voice input"}
          disabled={disabled}
        >
          <MicIcon
            className={`size-3 lg:size-4 ${
              isRecording ? "text-red-500 animate-pulse" : ""
            }`}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="top"
        className="hidden"
        sideOffset={8}
      />
    </Popover>
  );
};

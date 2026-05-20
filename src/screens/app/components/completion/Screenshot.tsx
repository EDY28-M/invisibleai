import { Button } from "@/components";
import { LaptopMinimalIcon, Loader2, MousePointer2Icon } from "lucide-react";
import { UseCompletionReturn } from "@/types";
import { MAX_FILES } from "@/config";
import { useApp } from "@/contexts";

export const Screenshot = ({
  screenshotConfiguration,
  attachedFiles,
  isLoading,
  captureScreenshot,
  isScreenshotLoading,
}: UseCompletionReturn) => {
  const { supportsImages } = useApp();
  const captureMode = screenshotConfiguration.enabled
    ? "Screenshot"
    : "Selection";
  const processingMode = screenshotConfiguration.mode;

  const isDisabled =
    attachedFiles.length >= MAX_FILES ||
    isLoading ||
    isScreenshotLoading ||
    !supportsImages;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="cursor-pointer h-9 w-9 rounded-[14px] transition-all duration-300 border border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/5 dark:hover:border-white/5 text-foreground/80 hover:text-foreground hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
      title={
        !supportsImages
          ? "Screenshot not supported by current AI provider"
          : `${captureMode} mode (${processingMode}) - ${attachedFiles.length}/${MAX_FILES} files`
      }
      onClick={captureScreenshot}
      disabled={isDisabled}
    >
      {isScreenshotLoading ? (
        <Loader2 className="h-4.5 w-4.5 animate-spin text-foreground/70" />
      ) : screenshotConfiguration.enabled ? (
        <LaptopMinimalIcon className="h-4.5 w-4.5" />
      ) : (
        <MousePointer2Icon className="h-4.5 w-4.5" />
      )}
    </Button>
  );
};

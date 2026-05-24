import { Button } from "@/components";
import { UseCompletionReturn } from "@/types";
import { MAX_FILES } from "@/config";
import { useApp } from "@/contexts";
import { AppIcons } from "../icons/AppIcons";

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
        <AppIcons.Loader className="h-4.5 w-4.5 animate-spin text-foreground/70" strokeWidth={1.7} />
      ) : screenshotConfiguration.enabled ? (
        <AppIcons.Screen className="h-4.5 w-4.5" strokeWidth={1.7} />
      ) : (
        <AppIcons.Cursor className="h-4.5 w-4.5" strokeWidth={1.7} />
      )}
    </Button>
  );
};

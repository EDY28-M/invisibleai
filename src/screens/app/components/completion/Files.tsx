import { useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button, ScrollArea } from "@/components";
import { UseCompletionReturn } from "@/types";
import { MAX_FILES } from "@/config";
import { useApp } from "@/contexts";
import { AppIcons } from "../icons/AppIcons";

export const Files = ({
  attachedFiles,
  handleFileSelect,
  removeFile,
  onRemoveAllFiles,
  isLoading,
  isFilesPopoverOpen,
  setIsFilesPopoverOpen,
}: UseCompletionReturn) => {
  const { supportsImages } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddMoreClick = () => {
    fileInputRef.current?.click();
  };

  const canAddMore = attachedFiles.length < MAX_FILES;

  return (
    <div className="relative">
      <Popover open={isFilesPopoverOpen} onOpenChange={setIsFilesPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (attachedFiles.length === 0) {
                fileInputRef.current?.click();
              } else {
                setIsFilesPopoverOpen(true);
              }
            }}
            disabled={isLoading || !supportsImages}
            className={`cursor-pointer h-9 w-9 rounded-[14px] transition-all duration-300 border border-transparent hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0 ${
              attachedFiles.length > 0
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/5 dark:hover:border-white/5 text-foreground/80 hover:text-foreground"
            }`}
            title={
              supportsImages
                ? "Attach images"
                : "Image upload not supported by current AI provider"
            }
          >
            <AppIcons.Attachment className="h-4.5 w-4.5" strokeWidth={1.7} />
          </Button>
        </PopoverTrigger>

        {attachedFiles.length > 0 && (
          <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-[9px] font-bold shadow-sm pointer-events-none">
            {attachedFiles.length}
          </div>
        )}

        {attachedFiles.length > 0 && (
          <PopoverContent
            align="end"
            side="bottom"
            className="w-screen p-0 border shadow-lg overflow-hidden"
            sideOffset={8}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <h3 className="font-semibold text-sm select-none">
                Attached Images ({attachedFiles.length}/{MAX_FILES})
              </h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsFilesPopoverOpen(false)}
                className="cursor-pointer"
                title="Close"
              >
                <AppIcons.Close className="h-4 w-4" strokeWidth={1.8} />
              </Button>
            </div>

            <ScrollArea className="p-4 h-[calc(100vh-11rem)]">
              {}
              <div
                className={`gap-3 ${
                  attachedFiles.length <= 2
                    ? "flex flex-col"
                    : "grid grid-cols-2"
                }`}
              >
                {attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="relative group border rounded-lg overflow-hidden bg-muted/20"
                  >
                    <img
                      src={`data:${file.type};base64,${file.base64}`}
                      alt={file.name}
                      className={`w-full object-cover h-full`}
                    />

                    {}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs">
                      <div className="truncate font-medium">{file.name}</div>
                      <div className="text-gray-300">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>

                    {}
                    <Button
                      size="icon"
                      variant="default"
                      className="absolute top-2 right-2 h-6 w-6 cursor-pointer"
                      onClick={() => removeFile(file.id)}
                      title="Remove image"
                    >
                      <AppIcons.Close className="h-3 w-3" strokeWidth={1.8} />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {}
            <div className="sticky bottom-0 border-t bg-background p-3 flex flex-row gap-2">
              <Button
                onClick={handleAddMoreClick}
                disabled={!canAddMore || isLoading}
                className="w-2/4"
                variant="outline"
              >
                <AppIcons.New className="h-4 w-4 mr-2" strokeWidth={1.8} />
                Add More Images {!canAddMore && `(${MAX_FILES} max)`}
              </Button>
              <Button
                className="w-2/4"
                variant="destructive"
                onClick={onRemoveAllFiles}
              >
                <AppIcons.Trash className="h-4 w-4 mr-2" strokeWidth={1.8} />
                Remove All Images
              </Button>
            </div>
          </PopoverContent>
        )}
      </Popover>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

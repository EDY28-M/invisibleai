import { Loader2, XIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
  ScrollArea,
  Input as InputComponent,
  Markdown,
  Switch,
  CopyButton,
} from "@/components";
import { UseCompletionReturn } from "@/types";
import { MessageHistory } from "./MessageHistory";
import { useTranslation } from "@/hooks";

export const Input = ({
  isPopoverOpen,
  isLoading,
  reset,
  input,
  setInput,
  handleKeyPress,
  handlePaste,
  currentConversationId,
  conversationHistory,
  startNewConversation,
  messageHistoryOpen,
  setMessageHistoryOpen,
  error,
  response,
  cancel,
  scrollAreaRef,
  inputRef,
  isHidden,
  keepEngaged,
  setKeepEngaged,
}: UseCompletionReturn & { isHidden: boolean }) => {
  const { t } = useTranslation();

  return (
    <div className="relative flex-1">
      <Popover
        open={isPopoverOpen}
        onOpenChange={(open) => {
          if (!open && !isLoading && !keepEngaged) {
            reset();
          }
        }}
      >
        <PopoverTrigger asChild className="!border-none !bg-transparent">
          <div className="relative select-none">
            <InputComponent
              ref={inputRef}
              placeholder={t("chat_ask_placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              onPaste={handlePaste}
              disabled={isLoading || isHidden}
              className={`border-none! bg-black/5! dark:bg-white/5! focus-visible:bg-black/[0.08]! dark:focus-visible:bg-white/[0.08]! focus-visible:ring-2! focus-visible:ring-zinc-500/20! dark:focus-visible:ring-zinc-400/20! h-9 rounded-[14px] px-3.5 shadow-inner! transition-all duration-300 ${
                currentConversationId && conversationHistory.length > 0
                  ? "pr-14"
                  : "pr-2"
              }`}
            />

            {currentConversationId &&
              conversationHistory.length > 0 &&
              !isLoading && (
                <div className="absolute select-none right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <MessageHistory
                    conversationHistory={conversationHistory}
                    currentConversationId={currentConversationId}
                    onStartNewConversation={startNewConversation}
                    messageHistoryOpen={messageHistoryOpen}
                    setMessageHistoryOpen={setMessageHistoryOpen}
                  />
                </div>
              )}

            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          side="bottom"
          className="w-screen p-0 border border-black/5 dark:border-white/10 bg-card/85 dark:bg-card/75 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden"
          sideOffset={8}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5 bg-transparent">
            <div className="flex flex-row gap-1.5 items-center">
              <h3 className="font-semibold text-xs select-none text-foreground/90">
                {keepEngaged ? t("chat_mode_conversation") : t("chat_mode_ai_response")}
              </h3>
              <div className="text-[10px] text-muted-foreground/60">
                {t("chat_scroll_hint")}
              </div>
            </div>
            <div className="flex items-center gap-2 select-none">
              <div className="flex flex-row items-center gap-2 mr-2">
                <p className="text-[10px] text-muted-foreground/80">
                  {t("chat_toggle_prefix")}{keepEngaged ? t("chat_mode_ai_response") : t("chat_mode_conversation")}
                </p>
                <span className="text-[9px] text-muted-foreground/60 bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded border border-black/5 dark:border-white/5 font-mono">
                  {navigator.platform.toLowerCase().includes("mac")
                    ? "⌘"
                    : "Ctrl"}{" "}
                  + K
                </span>
                <Switch
                  checked={keepEngaged}
                  onCheckedChange={(checked) => {
                    setKeepEngaged(checked);

                    setTimeout(() => {
                      inputRef?.current?.focus();
                    }, 100);
                  }}
                  className="scale-75"
                />
              </div>
              <CopyButton content={response} />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (isLoading) {
                    cancel();
                  } else if (keepEngaged) {
                    setKeepEngaged(false);
                    startNewConversation();
                  } else {
                    reset();
                  }
                }}
                className="cursor-pointer h-7 w-7 rounded-lg text-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                title={
                  isLoading
                    ? t("chat_cancel_title")
                    : keepEngaged
                    ? t("chat_close_new_title")
                    : t("chat_clear_title")
                }
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-7rem)]">
            <div className="p-4">
              {error && (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400">
                  <strong>{t("chat_error_prefix")}</strong> {error}
                </div>
              )}
              {isLoading && (
                <div className="flex items-center gap-2 my-4 text-muted-foreground/80 animate-pulse select-none">
                  <Loader2 className="h-4 w-4 animate-spin text-primary/80" />
                  <span className="text-xs">{t("chat_generating")}</span>
                </div>
              )}
              {response && (
                <div className="prose prose-sm max-w-none dark:prose-invert text-foreground/90 leading-relaxed bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-4 rounded-2xl">
                  <Markdown>{response}</Markdown>
                </div>
              )}

              {keepEngaged && conversationHistory.length > 1 && (
                <div className="space-y-3 pt-4 border-t border-black/5 dark:border-white/5 mt-4">
                  {conversationHistory
                    .sort((a, b) => b?.timestamp - a?.timestamp)
                    .map((message, index) => {
                      if (!isLoading && index === 0) {
                        return null;
                      }
                      const isUser = message.role === "user";
                      return (
                        <div
                          key={message.id}
                          className={`p-3.5 text-sm transition-all border ${
                            isUser
                              ? "bg-zinc-500/5 border-zinc-500/10 rounded-[18px] rounded-br-[4px] ml-6"
                              : "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 rounded-[18px] rounded-bl-[4px] mr-6"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5 opacity-60">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isUser ? "text-zinc-600 dark:text-zinc-400" : "text-foreground/80"}`}>
                              {isUser ? t("chat_role_user") : t("chat_role_ai")}
                            </span>
                            <span className="text-[9px] font-mono">
                              {new Date(message.timestamp).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                          <div className="prose prose-sm max-w-none dark:prose-invert text-foreground/95">
                            <Markdown>{message.content}</Markdown>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};

import { ChatConversation } from "@/types";
import { Markdown, Switch, CopyButton } from "@/components";
import { BotIcon, HeadphonesIcon, Loader2, SparklesIcon, MicIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  lastTranscription: string;
  lastAIResponse: string;
  isAIProcessing: boolean;
  conversation: ChatConversation;
  conversationMode: boolean;
  setConversationMode: (mode: boolean) => void;
};

const parseMessage = (content: string) => {
  if (content.startsWith("[Tú]: ")) {
    return {
      roleLabel: "Tú",
      roleType: "user-mic" as const,
      text: content.slice(6),
    };
  }
  if (content.startsWith("[Sistema]: ")) {
    return {
      roleLabel: "Sistema",
      roleType: "system-loopback" as const,
      text: content.slice(11),
    };
  }
  return {
    roleLabel: "System",
    roleType: "standard" as const,
    text: content,
  };
};

export const ResultsSection = ({
  lastTranscription,
  lastAIResponse,
  isAIProcessing,
  conversation,
  conversationMode,
  setConversationMode,
}: Props) => {
  const hasResponse = lastAIResponse || isAIProcessing;
  const hasHistory = conversation.messages.length > 2;

  if (!hasResponse && !lastTranscription) {
    return null;
  }

  const isMac = navigator.platform.toLowerCase().includes("mac");
  const modKey = isMac ? "⌘" : "Ctrl";

  return (
    <div className="rounded-[18px] border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 p-4 space-y-4 shadow-inner">
      {}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
          <h4 className="text-xs font-semibold text-foreground/90">
            {conversationMode ? "Conversation" : "AI Response"}
          </h4>
        </div>
        <div className="flex items-center gap-2 select-none">
          <span className="text-[9px] text-muted-foreground/60 bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded font-mono">
            {modKey}+K
          </span>
          <Switch
            checked={conversationMode}
            onCheckedChange={setConversationMode}
            className="scale-75"
          />
          {lastAIResponse && <CopyButton content={lastAIResponse} />}
        </div>
      </div>

      {}
      {!conversationMode && (
        <div className="space-y-3">
          {}
          {lastTranscription && (() => {
            const { roleLabel, text, roleType } = parseMessage(lastTranscription);
            return (
              <p className="text-[11px] text-muted-foreground bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg border border-black/5 dark:border-white/5">
                <span className={cn(
                  "font-bold uppercase tracking-wider text-[9px] mr-1.5",
                  roleType === "user-mic" && "text-emerald-500 dark:text-emerald-400",
                  roleType === "system-loopback" && "text-primary"
                )}>
                  {roleLabel}:
                </span>{" "}
                {text}
              </p>
            );
          })()}

          {}
          {hasResponse && (
            <div>
              {isAIProcessing && !lastAIResponse ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary/80" />
                  <span className="text-xs text-muted-foreground">
                    Generating response...
                  </span>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert text-foreground/90 leading-relaxed bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-3.5 rounded-xl">
                  <Markdown>{lastAIResponse}</Markdown>
                  {isAIProcessing && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 align-middle" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {}
      {conversationMode && (
        <div className="space-y-3">
          {}
          {hasResponse && (
            <div className="rounded-[18px] rounded-bl-[4px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-3.5 mr-6 shadow-xs transition-all">
              <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                <BotIcon className="h-3 w-3 text-foreground" />
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  AI
                </span>
              </div>
              {isAIProcessing && !lastAIResponse ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    Generating...
                  </span>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed">
                  <Markdown>{lastAIResponse}</Markdown>
                  {isAIProcessing && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 align-middle" />
                  )}
                </div>
              )}
            </div>
          )}

          {}
          {lastTranscription && (() => {
            const { roleLabel, text, roleType } = parseMessage(lastTranscription);
            const isUserMic = roleType === "user-mic";
            return (
              <div className={cn(
                "rounded-[18px] rounded-br-[4px] border p-3.5 shadow-xs ml-6 transition-all",
                isUserMic
                  ? "border-emerald-500/10 bg-emerald-500/5 text-foreground"
                  : "border-primary/10 bg-primary/5 text-foreground"
              )}>
                <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                  {isUserMic ? (
                    <MicIcon className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <HeadphonesIcon className="h-3 w-3 text-primary" />
                  )}
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-wide",
                    isUserMic ? "text-emerald-500" : "text-primary"
                  )}>
                    {roleLabel}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{text}</p>
              </div>
            );
          })()}

          {}
          {hasHistory && (
            <div className="space-y-3 pt-3 border-t border-black/5 dark:border-white/5">
              <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-wider">
                Previous
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {conversation.messages
                  .slice(2)
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((message, index) => {
                    const isUserRole = message.role === "user";
                    const { roleLabel, text, roleType } = isUserRole
                      ? parseMessage(message.content)
                      : { roleLabel: "AI", text: message.content, roleType: "assistant" as const };

                    const isUserMic = roleType === "user-mic";
                    const isSystemLoopback = roleType === "system-loopback";

                    return (
                      <div
                        key={message.id || index}
                        className={cn(
                          "p-2.5 text-[11px] transition-all border",
                          isUserRole
                            ? isUserMic
                              ? "bg-emerald-500/5 border-emerald-500/10 rounded-[12px] rounded-br-[2px] ml-4"
                              : "bg-primary/5 border-primary/10 rounded-[12px] rounded-br-[2px] ml-4"
                            : "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 rounded-[12px] rounded-bl-[2px] mr-4"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1 opacity-60">
                          <span className={cn(
                            "text-[8px] font-bold uppercase tracking-wider",
                            isUserMic && "text-emerald-500",
                            isSystemLoopback && "text-primary",
                            (!isUserMic && !isSystemLoopback) && "text-muted-foreground"
                          )}>
                            {roleLabel}
                          </span>
                        </div>
                        <div className="text-muted-foreground leading-relaxed mt-0.5">
                          <Markdown>{text}</Markdown>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-3">
      {}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <SparklesIcon className="w-3.5 h-3.5 text-primary" />
          <h4 className="text-xs font-medium">
            {conversationMode ? "Conversation" : "AI Response"}
          </h4>
        </div>
        <div className="flex items-center gap-2 select-none">
          <span className="text-[9px] text-muted-foreground/50 bg-muted/50 px-1 rounded">
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
        <div className="space-y-2">
          {}
          {lastTranscription && (() => {
            const { roleLabel, text, roleType } = parseMessage(lastTranscription);
            return (
              <p className="text-[11px] text-muted-foreground">
                <span className={cn(
                  "font-semibold",
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
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Generating response...
                  </span>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
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
        <div className="space-y-2">
          {}
          {hasResponse && (
            <div className="rounded-md bg-background/50 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <BotIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
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
                <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
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
                "rounded-md border-l-2 p-2.5 transition-all",
                isUserMic
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-primary/50 bg-primary/5"
              )}>
                <div className="flex items-center gap-1.5 mb-1">
                  {isUserMic ? (
                    <MicIcon className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <HeadphonesIcon className="h-3 w-3 text-primary" />
                  )}
                  <span className={cn(
                    "text-[9px] font-medium uppercase tracking-wide",
                    isUserMic ? "text-emerald-500" : "text-primary"
                  )}>
                    {roleLabel}
                  </span>
                </div>
                <p className="text-sm">{text}</p>
              </div>
            );
          })()}

          {}
          {hasHistory && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">
                Previous
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
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
                          "p-2 rounded-md text-[11px] transition-all",
                          isUserRole
                            ? isUserMic
                              ? "bg-emerald-500/5 border-l-2 border-emerald-500/30"
                              : "bg-primary/5 border-l-2 border-primary/30"
                            : "bg-background/50"
                        )}
                      >
                        <span className={cn(
                          "text-[8px] font-semibold uppercase tracking-wider",
                          isUserMic && "text-emerald-500",
                          isSystemLoopback && "text-primary",
                          (!isUserMic && !isSystemLoopback) && "text-muted-foreground"
                        )}>
                          {roleLabel}
                        </span>
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

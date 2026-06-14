import type { TranscriptEntry } from "@/hooks/useVoiceAgent";
import { useEffect, useRef } from "react";
import { BotIcon, UserIcon } from "lucide-react";

interface TranscriptFeedProps {
  entries: TranscriptEntry[];
}

export function TranscriptFeed({ entries }: TranscriptFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="flex flex-col gap-3 p-5 max-h-80 overflow-y-auto">
      {entries.map((entry) => (
        <TranscriptMessage key={entry.id} entry={entry} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

interface TranscriptMessageProps {
  entry: TranscriptEntry;
}

function TranscriptMessage({ entry }: TranscriptMessageProps) {
  const isUser = entry.role === "user";

  return (
    <div
      className={`flex gap-3 items-start ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`flex shrink-0 items-center justify-center w-7 h-7 rounded-xl ${
          isUser
            ? "bg-primary/15 text-primary"
            : "bg-violet-500/15 text-violet-400"
        }`}
      >
        {isUser ? (
          <UserIcon className="w-3.5 h-3.5" />
        ) : (
          <BotIcon className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary/10 text-foreground rounded-tr-sm"
            : "bg-muted/50 text-foreground rounded-tl-sm"
        }`}
      >
        {entry.content}
      </div>
    </div>
  );
}

import type { VoiceAgentState, VoiceAgentStatus } from "@/hooks/useVoiceAgent";
import type { TranslationKey } from "@/contexts/language.context";
import { useTranslation } from "@/hooks";
import { VoiceOrb } from "./VoiceOrb";
import { TranscriptFeed } from "./TranscriptFeed";
import { VoiceAgentSettingsPanel } from "./VoiceAgentSettingsPanel";
import { Button } from "@/components/ui/button";
import { MicIcon, MicOffIcon, Loader2Icon } from "lucide-react";

interface VoiceAgentPanelProps {
  agent: VoiceAgentState;
}

function getStatusLabel(
  status: VoiceAgentStatus,
  t: (key: TranslationKey) => string,
): string {
  switch (status) {
    case "connecting":
      return t("voice_agent_connecting");
    case "connected":
    case "listening":
      return t("voice_agent_listening");
    case "thinking":
      return t("voice_agent_thinking");
    case "speaking":
      return t("voice_agent_speaking");
    case "error":
      return t("error");
    case "disconnected":
      return t("voice_agent_disconnected");
    default:
      return t("voice_agent_idle");
  }
}

const isActive = (s: VoiceAgentStatus) =>
  s === "connected" ||
  s === "listening" ||
  s === "thinking" ||
  s === "speaking";

export function VoiceAgentPanel({ agent }: VoiceAgentPanelProps) {
  const {
    status,
    transcript,
    error,
    agentSettings,
    setAgentSettings,
    connect,
    disconnect,
    clearTranscript,
  } = agent;
  const { t } = useTranslation();
  const active = isActive(status);

  return (
    <div className="flex flex-col gap-5 w-full max-w-3xl mx-auto p-1">
      {/* ── Orb card ── */}
      <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-5 py-10 px-6">
          <VoiceOrb status={status} />

          {/* Status */}
          <span
            className={`text-sm font-semibold tracking-wide transition-colors duration-300 ${
              status === "error"
                ? "text-destructive"
                : active
                  ? "text-primary"
                  : "text-muted-foreground"
            }`}
          >
            {getStatusLabel(status, t)}
          </span>

          {/* Error message */}
          {error && (
            <p className="text-xs text-destructive/80 bg-destructive/8 rounded-xl px-4 py-2 text-center max-w-sm leading-relaxed">
              {error}
            </p>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            {!active ? (
              <Button
                id="voice-agent-connect-btn"
                onClick={connect}
                disabled={status === "connecting"}
                className="rounded-2xl gap-2 px-6 h-11 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                {status === "connecting" ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <MicIcon className="h-4 w-4" />
                )}
                {status === "connecting"
                  ? t("voice_agent_connecting")
                  : t("voice_agent_connect")}
              </Button>
            ) : (
              <Button
                id="voice-agent-disconnect-btn"
                variant="destructive"
                onClick={disconnect}
                className="rounded-2xl gap-2 px-6 h-11 font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <MicOffIcon className="h-4 w-4" />
                {t("voice_agent_disconnect")}
              </Button>
            )}

            {transcript.length > 0 && (
              <Button
                id="voice-agent-clear-btn"
                variant="ghost"
                onClick={clearTranscript}
                className="rounded-2xl h-11 px-4 text-muted-foreground hover:text-foreground transition-all duration-300"
              >
                {t("voice_agent_clear")}
              </Button>
            )}
          </div>

          {/* Live indicator when active */}
          {active && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary/80" />
              </span>
              {t("voice_agent_live")}
            </div>
          )}
        </div>
      </div>

      {/* ── Settings panel ── */}
      <VoiceAgentSettingsPanel
        settings={agentSettings}
        onSave={setAgentSettings}
        disabled={active}
      />

      {/* ── Transcript card ── */}
      {transcript.length > 0 && (
        <div className="rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl overflow-hidden">
          <div className="px-6 pt-5 pb-1 border-b border-border/10">
            <span className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground/35">
              {t("voice_agent_transcript")}
            </span>
          </div>
          <TranscriptFeed entries={transcript} />
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import type { VoiceAgentSettings } from "@/hooks/useVoiceAgent";
import { useTranslation } from "@/hooks";
import {
  Settings2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";

// ── LLM Providers & Models ───────────────────────────────────────────────────
const LLM_PROVIDERS = [
  { value: "open_ai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "groq", label: "Groq" },
  { value: "nvidia", label: "NVIDIA" },
  { value: "other", label: "Other" },
];

const LLM_MODELS: Record<string, { value: string; label: string }[]> = {
  open_ai: [
    { value: "gpt-5.5", label: "GPT-5.5" },
    { value: "gpt-5.4", label: "GPT 5.4" },
    { value: "gpt-5.2", label: "GPT 5.2" },
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    { value: "gpt-4.1-nano", label: "GPT-4.1 nano" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o mini" },
    { value: "gpt-5", label: "GPT-5" },
    { value: "gpt-5-mini", label: "GPT-5 mini" },
    { value: "gpt-5-nano", label: "GPT-5 nano" },
    { value: "gpt-5.1-instant", label: "GPT-5.1 Instant" },
    { value: "gpt-5.1-thinking", label: "GPT-5.1 Thinking" },
    { value: "gpt-5.2-instant", label: "GPT-5.2 Instant" },
    { value: "gpt-5.3-instant", label: "GPT-5.3 Instant" },
    { value: "gpt-5.4-mini", label: "GPT-5.4 mini" },
    { value: "gpt-5.4-nano", label: "GPT-5.4 nano" },
  ],
  anthropic: [
    { value: "claude-haiku-4.5", label: "Claude Haiku 4.5" },
    { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
    { value: "claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
    { value: "claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
  ],
  google: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
    { value: "gemini-3.0-flash-preview", label: "Gemini 3.0 Flash Preview" },
    { value: "gemini-3.0-pro-preview", label: "Gemini 3.0 Pro Preview" },
    { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
    { value: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite Preview" },
    { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  ],
  groq: [
    { value: "gpt-oss-20b", label: "GPT OSS 20B" },
  ],
  nvidia: [
    { value: "nemotron-3-nano-30b-a3b", label: "Nemotron 3 Nano 30B A3B" },
  ],
  other: [
    { value: "custom", label: "Custom model" },
  ],
};

// ── Deepgram Aura-2 Spanish Voices ───────────────────────────────────────────
const TTS_VOICES_ES = [
  { value: "aura-2-celeste-es", label: "Aura 2 - Celeste (Colombian, feminine)" },
  { value: "aura-2-alvaro-es", label: "Aura 2 - Álvaro (Peninsular, masculine)" },
  { value: "aura-2-agustina-es", label: "Aura 2 - Agustina (Peninsular, feminine)" },
  { value: "aura-2-antonia-es", label: "Aura 2 - Antonia (Argentine, feminine)" },
  { value: "aura-2-aquila-es", label: "Aura 2 - Aquila (Latin American, masculine)" },
  { value: "aura-2-carina-es", label: "Aura 2 - Carina (Peninsular, feminine)" },
  { value: "aura-2-diana-es", label: "Aura 2 - Diana (Peninsular, feminine)" },
  { value: "aura-2-estrella-es", label: "Aura 2 - Estrella (Mexican, feminine)" },
  { value: "aura-2-gloria-es", label: "Aura 2 - Gloria (Colombian, feminine)" },
  { value: "aura-2-javier-es", label: "Aura 2 - Javier (Latin American, masculine)" },
  { value: "aura-2-luciano-es", label: "Aura 2 - Luciano (Mexican, masculine)" },
  { value: "aura-2-nestor-es", label: "Aura 2 - Néstor (Peninsular, masculine)" },
  { value: "aura-2-olivia-es", label: "Aura 2 - Olivia (Mexican, feminine)" },
  { value: "aura-2-selena-es", label: "Aura 2 - Selena (Latin American, feminine)" },
  { value: "aura-2-silvia-es", label: "Aura 2 - Silvia (Peninsular, feminine)" },
  { value: "aura-2-sirio-es", label: "Aura 2 - Sirio (Mexican, masculine)" },
  { value: "aura-2-valerio-es", label: "Aura 2 - Valerio (Mexican, masculine)" },
];

// ── Deepgram Aura-2 English Voices ───────────────────────────────────────────
const TTS_VOICES_EN = [
  { value: "aura-2-thalia-en", label: "Aura 2 - Thalia (American, feminine)" },
  { value: "aura-2-asteria-en", label: "Aura 2 - Asteria (American, feminine)" },
  { value: "aura-2-odysseus-en", label: "Aura 2 - Odysseus (American, masculine)" },
  { value: "aura-2-orpheus-en", label: "Aura 2 - Orpheus (American, masculine)" },
  { value: "aura-2-amalthea-en", label: "Aura 2 - Amalthea (Filipino, feminine)" },
  { value: "aura-2-andromeda-en", label: "Aura 2 - Andromeda (American, feminine)" },
  { value: "aura-2-apollo-en", label: "Aura 2 - Apollo (American, masculine)" },
  { value: "aura-2-arcas-en", label: "Aura 2 - Arcas (American, masculine)" },
  { value: "aura-2-aries-en", label: "Aura 2 - Aries (American, masculine)" },
  { value: "aura-2-athena-en", label: "Aura 2 - Athena (American, feminine)" },
  { value: "aura-2-atlas-en", label: "Aura 2 - Atlas (American, masculine)" },
  { value: "aura-2-aurora-en", label: "Aura 2 - Aurora (American, feminine)" },
  { value: "aura-2-callista-en", label: "Aura 2 - Callista (American, feminine)" },
  { value: "aura-2-cora-en", label: "Aura 2 - Cora (American, feminine)" },
  { value: "aura-2-cordelia-en", label: "Aura 2 - Cordelia (American, feminine)" },
  { value: "aura-2-delia-en", label: "Aura 2 - Delia (American, feminine)" },
  { value: "aura-2-draco-en", label: "Aura 2 - Draco (British, masculine)" },
  { value: "aura-2-electra-en", label: "Aura 2 - Electra (American, feminine)" },
  { value: "aura-2-harmonia-en", label: "Aura 2 - Harmonia (American, feminine)" },
  { value: "aura-2-helena-en", label: "Aura 2 - Helena (American, feminine)" },
  { value: "aura-2-hera-en", label: "Aura 2 - Hera (American, feminine)" },
  { value: "aura-2-hermes-en", label: "Aura 2 - Hermes (American, masculine)" },
  { value: "aura-2-hyperion-en", label: "Aura 2 - Hyperion (Australian, masculine)" },
  { value: "aura-2-iris-en", label: "Aura 2 - Iris (American, feminine)" },
  { value: "aura-2-janus-en", label: "Aura 2 - Janus (American, feminine)" },
  { value: "aura-2-juno-en", label: "Aura 2 - Juno (American, feminine)" },
];

const ALL_TTS_VOICES = [...TTS_VOICES_ES, ...TTS_VOICES_EN];

// ── Languages ─────────────────────────────────────────────────────────────────
const AGENT_LANGUAGES = [
  { value: "es", label: "Spanish" },
  { value: "en", label: "English" },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface VoiceAgentSettingsPanelProps {
  settings: VoiceAgentSettings;
  onSave: (s: VoiceAgentSettings) => void;
  disabled?: boolean;
}

export function VoiceAgentSettingsPanel({
  settings,
  onSave,
  disabled,
}: VoiceAgentSettingsPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VoiceAgentSettings>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const set = <K extends keyof VoiceAgentSettings>(
    key: K,
    value: VoiceAgentSettings[K],
  ) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "llmProvider") {
        const models = LLM_MODELS[value as string] ?? [];
        next.llmModel = models[0]?.value ?? "";
      } else if (key === "language") {
        next.ttsVoice = value === "es" ? "aura-2-celeste-es" : "aura-2-thalia-en";
      }
      onSave(next);
      return next;
    });
  };

  const modelsForProvider = LLM_MODELS[draft.llmProvider] ?? [];

  return (
    <div className="rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        id="voice-agent-settings-toggle"
        onClick={() => {
          if (!open) setDraft(settings);
          setOpen((v) => !v);
        }}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-white/[0.02] transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-500/10">
            <Settings2Icon className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("voice_agent_settings_title")}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5 truncate max-w-xs">
              {ALL_TTS_VOICES.find((v) => v.value === settings.ttsVoice)?.label.replace("Aura 2 - ", "").split(" (")[0] ?? settings.ttsVoice}
              {" · "}
              {settings.llmModel}
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUpIcon className="w-4 h-4 text-muted-foreground/60 shrink-0" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-muted-foreground/60 shrink-0" />
        )}
      </button>

      {/* Collapsible body */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pt-2 space-y-5 border-t border-border/10">
            {disabled && (
              <p className="text-xs text-amber-400/80 bg-amber-500/8 rounded-xl px-3 py-2">
                {t("voice_agent_settings_session_active")}
              </p>
            )}

            {/* Language */}
            <FieldGroup label={t("voice_agent_settings_language")}>
              <Select
                id="va-language"
                value={draft.language}
                disabled={disabled}
                options={AGENT_LANGUAGES}
                onChange={(v) => set("language", v)}
              />
            </FieldGroup>

            {/* LLM Provider + Model */}
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label={t("voice_agent_settings_llm_provider")}>
                <Select
                  id="va-llm-provider"
                  value={draft.llmProvider}
                  disabled={disabled}
                  options={LLM_PROVIDERS}
                  onChange={(v) => set("llmProvider", v)}
                />
              </FieldGroup>
              <FieldGroup label={t("voice_agent_settings_llm_model")}>
                <Select
                  id="va-llm-model"
                  value={draft.llmModel}
                  disabled={disabled}
                  options={modelsForProvider}
                  onChange={(v) => set("llmModel", v)}
                />
              </FieldGroup>
            </div>

            {/* TTS Voice */}
            <FieldGroup label={t("voice_agent_settings_tts_voice")}>
              <Select
                id="va-tts-voice"
                value={draft.ttsVoice}
                disabled={disabled}
                options={draft.language === "es" ? TTS_VOICES_ES : TTS_VOICES_EN}
                onChange={(v) => set("ttsVoice", v)}
              />
            </FieldGroup>

            {/* Greeting */}
            <FieldGroup label={t("voice_agent_settings_greeting")}>
              <input
                id="va-greeting"
                type="text"
                value={draft.greeting}
                disabled={disabled}
                onChange={(e) => setDraft((prev) => ({ ...prev, greeting: e.target.value }))}
                onBlur={() => onSave(draft)}
                placeholder="Hello! How can I help you today?"
                className="w-full rounded-xl border border-border/25 bg-background/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
              />
            </FieldGroup>

            {/* System Prompt */}
            <FieldGroup label={t("voice_agent_settings_system_prompt")}>
              <textarea
                id="va-system-prompt"
                value={draft.systemPrompt}
                disabled={disabled}
                onChange={(e) => setDraft((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                onBlur={() => onSave(draft)}
                rows={3}
                placeholder="You are a helpful AI assistant..."
                className="w-full rounded-xl border border-border/25 bg-background/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed resize-none transition"
              />
            </FieldGroup>

            <p className="text-[10px] text-muted-foreground/40 text-right mt-1 italic">
              * Cambios guardados automáticamente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({
  id,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-border/25 bg-background/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition appearance-none cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

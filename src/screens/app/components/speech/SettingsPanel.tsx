import { useState } from "react";
import {
  Label,
  Slider,
  Switch,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components";
import {
  ChevronDownIcon,
  SlidersHorizontalIcon,
  LifeBuoyIcon,
  WandIcon,
  RotateCcwIcon,
  KeyboardIcon,
  AudioWaveformIcon,
  MicIcon,
  CameraIcon,
  LockIcon,
} from "lucide-react";
import { VadConfig } from "@/hooks/useSystemAudio";
import {
  PROMPT_TEMPLATES,
  getPromptTemplateById,
} from "@/lib/platform-instructions";
import { cn } from "@/lib/utils";
import "./aurora-panel.css";

const SENSITIVITY_PRESETS = {
  low: {
    sensitivity_rms: 0.015,
    noise_gate_threshold: 0.005,
    label: "Low",
    description: "Only picks up clear, loud speech",
  },
  normal: {
    sensitivity_rms: 0.012,
    noise_gate_threshold: 0.003,
    label: "Normal",
    description: "Balanced for typical conversations",
  },
  high: {
    sensitivity_rms: 0.008,
    noise_gate_threshold: 0.002,
    label: "High",
    description: "Picks up quieter speech",
  },
} as const;

type SensitivityPreset = keyof typeof SENSITIVITY_PRESETS;

interface SettingsPanelProps {
  vadConfig: VadConfig;
  onUpdateVadConfig: (config: VadConfig) => void;

  useSystemPrompt: boolean;
  setUseSystemPrompt: (value: boolean) => void;
  contextContent: string;
  setContextContent: (content: string) => void;

  useConversationalMemory: boolean;
  setUseConversationalMemory: (value: boolean) => void;

  isStreamingMode?: boolean;
  hasActiveLicense?: boolean;
}

/** Section eyebrow with the aurora accent bar. */
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="aurora-eyebrow pl-0.5">
    <span className="aurora-bar" />
    {children}
  </div>
);

/** Single keyboard-shortcut chip. */
const Shortcut = ({ label, keys }: { label: string; keys: string }) => (
  <div className="aurora-shortcut">
    <span className="text-[10px] font-medium text-foreground/70">{label}</span>
    <kbd className="aurora-kbd">{keys}</kbd>
  </div>
);

export const SettingsPanel = ({
  vadConfig,
  onUpdateVadConfig,
  useSystemPrompt,
  setUseSystemPrompt,
  contextContent,
  setContextContent,
  useConversationalMemory,
  setUseConversationalMemory,
  isStreamingMode = false,
  hasActiveLicense = true,
}: SettingsPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const isVadMode = vadConfig.enabled;
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const modKey = isMac ? "⌘" : "Ctrl";

  const getCurrentPreset = (): SensitivityPreset | "custom" => {
    for (const [key, preset] of Object.entries(SENSITIVITY_PRESETS)) {
      if (
        Math.abs(vadConfig.sensitivity_rms - preset.sensitivity_rms) < 0.001 &&
        Math.abs(vadConfig.noise_gate_threshold - preset.noise_gate_threshold) <
          0.001
      ) {
        return key as SensitivityPreset;
      }
    }
    return "custom";
  };

  const currentPreset = getCurrentPreset();

  const handlePresetChange = (preset: SensitivityPreset) => {
    const presetValues = SENSITIVITY_PRESETS[preset];
    onUpdateVadConfig({
      ...vadConfig,
      sensitivity_rms: presetValues.sensitivity_rms,
      noise_gate_threshold: presetValues.noise_gate_threshold,
    });
  };

  const handleTemplateSelection = (templateId: string) => {
    const template = getPromptTemplateById(templateId);
    if (template) {
      setContextContent(template.prompt);
      setSelectedTemplate("");
    }
  };

  const handleResetDefaults = () => {
    const defaultConfig: VadConfig = {
      enabled: vadConfig.enabled,
      hop_size: 1024,
      sensitivity_rms: 0.012,
      peak_threshold: 0.035,
      silence_chunks: 25,
      min_speech_chunks: 7,
      pre_speech_chunks: 12,
      noise_gate_threshold: 0.003,
      max_recording_duration_secs: 180,
    };
    onUpdateVadConfig(defaultConfig);
  };

  return (
    <div className="aurora rounded-xl border border-black/6 dark:border-white/6 bg-black/[0.03] dark:bg-white/[0.03] overflow-hidden">
      {/* Compact trigger row */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all select-none"
      >
        <SlidersHorizontalIcon
          className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0"
          strokeWidth={2}
        />
        <span className="text-xs font-semibold text-foreground/60 flex-1 text-left">
          Settings
        </span>
        {!hasActiveLicense && (
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-500/70 mr-1">
            <LockIcon className="w-2.5 h-2.5" strokeWidth={2.5} />
            Pro
          </span>
        )}
        <ChevronDownIcon
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground/40 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Collapsible body */}
      {isOpen && (
        <div className="border-t border-black/5 dark:border-white/5 p-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <Tabs defaultValue="settings" className="gap-3.5">
            <TabsList className="aurora-tabs">
              <TabsTrigger value="settings" className="aurora-tab">
                <SlidersHorizontalIcon className="w-3.5 h-3.5" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="help" className="aurora-tab">
                <LifeBuoyIcon className="w-3.5 h-3.5" />
                Help
              </TabsTrigger>
            </TabsList>

            {/* ---------------------------- SETTINGS TAB ---------------------------- */}
            <TabsContent value="settings" className="space-y-5 pt-1">
              {!isStreamingMode && (
                <div className="space-y-3">
                  <Eyebrow>Recording</Eyebrow>

                  {vadConfig.enabled && (
                    <div className="space-y-2.5">
                      <Label className="text-[11px] font-bold text-foreground/80">
                        Voice Activity Detection (VAD) Sensitivity
                      </Label>
                      <div className="aurora-seg">
                        {(
                          Object.entries(SENSITIVITY_PRESETS) as [
                            SensitivityPreset,
                            (typeof SENSITIVITY_PRESETS)[SensitivityPreset]
                          ][]
                        ).map(([key, preset]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handlePresetChange(key)}
                            data-active={currentPreset === key}
                            className="aurora-seg-btn"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-foreground/55 pl-0.5 leading-relaxed">
                        {currentPreset === "custom"
                          ? "Custom sensitivity values"
                          : SENSITIVITY_PRESETS[
                              currentPreset as SensitivityPreset
                            ].description}
                      </p>
                    </div>
                  )}

                  {!vadConfig.enabled && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-foreground/80 flex items-center justify-between">
                        <span>Max Recording Duration</span>
                        <span className="text-foreground/55 font-normal">
                          {Math.round(
                            vadConfig.max_recording_duration_secs / 60
                          )}{" "}
                          min
                        </span>
                      </Label>
                      <Slider
                        value={[vadConfig.max_recording_duration_secs / 60]}
                        onValueChange={([value]) =>
                          onUpdateVadConfig({
                            ...vadConfig,
                            max_recording_duration_secs: Math.round(value * 60),
                          })
                        }
                        min={1}
                        max={3}
                        step={0.5}
                        className="w-full py-2"
                      />
                    </div>
                  )}
                </div>
              )}

              {!isStreamingMode && <hr className="aurora-divider" />}

              <div className="space-y-3">
                <Eyebrow>AI Context</Eyebrow>

                <div className="aurora-row flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-xs font-bold text-foreground/90">
                      Use System Prompt
                    </Label>
                    <p className="text-[10px] text-foreground/55 mt-0.5">
                      {useSystemPrompt
                        ? "Using default prompt from settings"
                        : "Using custom context below"}
                    </p>
                  </div>
                  <Switch
                    checked={useSystemPrompt}
                    onCheckedChange={setUseSystemPrompt}
                  />
                </div>

                <div className="aurora-row flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
                      <span>Chat Memory</span>
                      <span className="aurora-pill">Context</span>
                    </Label>
                    <p className="text-[10px] text-foreground/55 mt-0.5">
                      {useConversationalMemory
                        ? "Remembers past discussions to stay context-aware"
                        : "Starts each session with a clean state"}
                    </p>
                  </div>
                  <Switch
                    checked={useConversationalMemory}
                    onCheckedChange={setUseConversationalMemory}
                  />
                </div>

                {!useSystemPrompt && (
                  <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex justify-end">
                      <Select
                        value={selectedTemplate}
                        onValueChange={handleTemplateSelection}
                      >
                        <SelectTrigger className="w-auto h-7 text-xs bg-white/70 dark:bg-white/5 border border-[rgba(139,92,246,0.25)] rounded-lg shadow-sm">
                          <WandIcon className="w-3 h-3 mr-1.5 text-violet-500" />
                          <SelectValue placeholder="Templates" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-black/10 dark:border-white/10 shadow-lg">
                          <SelectGroup>
                            <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1">
                              Quick-fill a template
                            </SelectLabel>
                            {PROMPT_TEMPLATES.map((template) => (
                              <SelectItem
                                key={template.id}
                                value={template.id}
                                className="text-xs rounded-lg cursor-pointer"
                              >
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      placeholder="Enter custom system prompt and context..."
                      value={contextContent}
                      onChange={(e) => setContextContent(e.target.value)}
                      className="min-h-24 resize-none text-xs rounded-xl bg-white/40 dark:bg-white/[0.03] border border-[rgba(99,102,241,0.2)] p-3 transition-all"
                    />
                  </div>
                )}
              </div>

              {!isStreamingMode && (
                <>
                  <hr className="aurora-divider" />

                  <div>
                    <button
                      type="button"
                      className="aurora-adv pl-0.5"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      <span>Advanced Config</span>
                      <ChevronDownIcon
                        className={cn(
                          "w-3.5 h-3.5 transition-transform duration-200",
                          showAdvanced && "rotate-180"
                        )}
                      />
                    </button>

                    {showAdvanced && (
                      <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        {vadConfig.enabled && (
                          <>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-foreground/80 flex items-center justify-between">
                                <span>Speech Sensitivity (Raw)</span>
                                <span className="text-foreground/60 font-semibold">
                                  {(vadConfig.sensitivity_rms * 1000).toFixed(
                                    1
                                  )}
                                </span>
                              </Label>
                              <Slider
                                value={[vadConfig.sensitivity_rms * 1000]}
                                onValueChange={([value]) =>
                                  onUpdateVadConfig({
                                    ...vadConfig,
                                    sensitivity_rms: value / 1000,
                                  })
                                }
                                min={1}
                                max={20}
                                step={0.5}
                                className="w-full py-2"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-foreground/80 flex items-center justify-between">
                                <span>Silence Duration</span>
                                <span className="text-foreground/60 font-semibold">
                                  {(
                                    (vadConfig.silence_chunks *
                                      vadConfig.hop_size) /
                                    44100
                                  ).toFixed(1)}
                                  s
                                </span>
                              </Label>
                              <Slider
                                value={[vadConfig.silence_chunks]}
                                onValueChange={([value]) =>
                                  onUpdateVadConfig({
                                    ...vadConfig,
                                    silence_chunks: Math.round(value),
                                  })
                                }
                                min={20}
                                max={180}
                                step={5}
                                className="w-full py-2"
                              />
                              <p className="text-[10px] text-foreground/55 pl-0.5 leading-normal">
                                How long to wait after speech stops
                              </p>
                            </div>
                          </>
                        )}

                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-foreground/80 flex items-center justify-between">
                            <span>Noise Gate Threshold</span>
                            <span className="text-foreground/60 font-semibold">
                              {(
                                vadConfig.noise_gate_threshold * 1000
                              ).toFixed(1)}
                            </span>
                          </Label>
                          <Slider
                            value={[vadConfig.noise_gate_threshold * 1000]}
                            onValueChange={([value]) =>
                              onUpdateVadConfig({
                                ...vadConfig,
                                noise_gate_threshold: value / 1000,
                              })
                            }
                            min={0}
                            max={10}
                            step={0.1}
                            className="w-full py-2"
                          />
                          <p className="text-[10px] text-foreground/55 pl-0.5 leading-normal">
                            Filters low-level background noise
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleResetDefaults}
                          className="aurora-reset"
                        >
                          <RotateCcwIcon className="w-3.5 h-3.5" />
                          Reset to Defaults
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ------------------------------ HELP TAB ------------------------------ */}
            <TabsContent value="help" className="space-y-4 pt-1">
              <div className="aurora-mode">
                <div className="aurora-mode-icon">
                  {isVadMode ? (
                    <AudioWaveformIcon className="w-4 h-4 animate-pulse" />
                  ) : (
                    <MicIcon className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-extrabold tracking-tight text-foreground">
                    {isVadMode
                      ? "Auto-detect Mode (VAD)"
                      : "Manual Mode (Push-to-Talk)"}
                  </p>
                  <p className="text-[10px] text-foreground/65 leading-relaxed mt-0.5">
                    {isVadMode
                      ? "Speech is automatically detected from system audio. When someone speaks, it will be captured and transcribed."
                      : "Press the record button or use keyboard shortcuts to manually control recording."}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Eyebrow>
                  <KeyboardIcon className="w-3 h-3" />
                  Keyboard Shortcuts
                </Eyebrow>
                <div className="grid grid-cols-2 gap-2">
                  <Shortcut label="Scroll down" keys="↓" />
                  <Shortcut label="Scroll up" keys="↑" />
                  {!isVadMode && (
                    <>
                      <Shortcut label="Start/Stop" keys="Enter" />
                      <Shortcut label="Start record" keys="Space" />
                      <Shortcut label="Discard" keys="Esc" />
                    </>
                  )}
                  <Shortcut label="Toggle view" keys={`${modKey}+K`} />
                </div>
              </div>

              <div className="space-y-2">
                <Eyebrow>
                  <CameraIcon className="w-3 h-3" />
                  Screenshot Feature
                </Eyebrow>
                <div className="aurora-note text-[10px] text-foreground/65 space-y-1.5 leading-relaxed">
                  <p>
                    <strong className="text-foreground/90">
                      Visual Context Link:
                    </strong>{" "}
                    Captures your current screen and attaches it to your next
                    transcription automatically.
                  </p>
                  <p>
                    The AI receives both the transcription and the screenshot
                    image, allowing it to provide highly context-aware responses
                    based on what you're working on.
                  </p>
                  <p className="text-[9px] opacity-75 italic">
                    * The screenshot is cleared automatically after each sent
                    message to preserve your privacy.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {[
                  ["Auto-detect", "Hands-free operation during interviews."],
                  ["Manual mode", "Precise control over what gets transcribed."],
                  ["Quick Actions", "Send follow-up prompts with one click."],
                  ["Screenshot", "Share your screen context with the AI."],
                ].map(([title, body]) => (
                  <div
                    key={title}
                    className="flex items-start gap-2 text-[10px] text-foreground/65 leading-normal"
                  >
                    <span className="aurora-bar !w-1 !h-1 !rounded-full mt-1.5 shrink-0" />
                    <p>
                      <strong className="text-foreground/85">{title}:</strong>{" "}
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

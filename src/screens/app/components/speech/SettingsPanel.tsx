import { useState } from "react";
import {
  Button,
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
} from "@/components";
import {
  ChevronDownIcon,
  SettingsIcon,
  WandIcon,
  RotateCcwIcon,
  ChevronUpIcon,
} from "lucide-react";
import { VadConfig } from "@/hooks/useSystemAudio";
import {
  PROMPT_TEMPLATES,
  getPromptTemplateById,
} from "@/lib/platform-instructions";
import { cn } from "@/lib/utils";

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
}

export const SettingsPanel = ({
  vadConfig,
  onUpdateVadConfig,
  useSystemPrompt,
  setUseSystemPrompt,
  contextContent,
  setContextContent,
  useConversationalMemory,
  setUseConversationalMemory,
}: SettingsPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

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
      silence_chunks: 220,
      min_speech_chunks: 7,
      pre_speech_chunks: 12,
      noise_gate_threshold: 0.003,
      max_recording_duration_secs: 180,
    };
    onUpdateVadConfig(defaultConfig);
  };

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] backdrop-blur-md overflow-hidden transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.03)] hover:border-black/15 dark:hover:border-white/20">

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <SettingsIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-500 group-hover:text-foreground transition-colors" />
          <span className="text-xs font-bold tracking-tight text-foreground/90 font-sans">Settings</span>
        </div>
        <ChevronDownIcon
          className={cn(
            "w-4 h-4 text-muted-foreground/60 transition-transform duration-300",
            isOpen && "rotate-180"
          )}
        />
      </button>


      {isOpen && (
        <div className="px-4 pb-4 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">

          <div className="space-y-3">
            <div className="flex items-center gap-1.5 pl-0.5">
              <span className="w-1.5 h-3 rounded-full bg-emerald-500" />
              <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Recording Settings
              </h4>
            </div>


            {vadConfig.enabled && (
              <div className="space-y-2.5">
                <Label className="text-[11px] font-bold text-foreground/80">
                  Voice Activity Detection (VAD) Sensitivity
                </Label>
                <div className="flex gap-2 p-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 shadow-inner">
                  {(
                    Object.entries(SENSITIVITY_PRESETS) as [
                      SensitivityPreset,
                      (typeof SENSITIVITY_PRESETS)[SensitivityPreset]
                    ][]
                  ).map(([key, preset]) => {
                    const isActive = currentPreset === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handlePresetChange(key)}
                        className={cn(
                          "flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer text-center",
                          isActive
                            ? "bg-white dark:bg-neutral-800 text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/5 dark:border-white/10 scale-[1.02] active:scale-[0.98]"
                            : "text-muted-foreground hover:text-foreground hover:bg-black/[0.02] dark:hover:bg-white/[0.02] active:scale-95"
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground pl-0.5 leading-relaxed">
                  {currentPreset === "custom"
                    ? "Custom sensitivity values"
                    : SENSITIVITY_PRESETS[currentPreset as SensitivityPreset]
                      .description}
                </p>
              </div>
            )}


            {!vadConfig.enabled && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground/80 flex items-center justify-between">
                  <span>Max Recording Duration</span>
                  <span className="text-muted-foreground font-normal">
                    {Math.round(vadConfig.max_recording_duration_secs / 60)} min
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


          <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center gap-1.5 pl-0.5">
              <span className="w-1.5 h-3 rounded-full bg-indigo-500" />
              <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                AI Context
              </h4>
            </div>

            <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-black/[0.01] dark:bg-white/[0.01] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
              <div className="flex-1">
                <Label className="text-xs font-bold text-foreground/90">Use System Prompt</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
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


            <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-black/[0.01] dark:bg-white/[0.01] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors border-t border-black/5 dark:border-white/5 pt-3">
              <div className="flex-1">
                <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
                  <span>Chat Memory</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-primary/10 text-primary border border-primary/20 select-none uppercase tracking-wider">
                    Context
                  </span>
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
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
              <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex justify-end">
                  <Select
                    value={selectedTemplate}
                    onValueChange={handleTemplateSelection}
                  >
                    <SelectTrigger className="w-auto h-7 text-xs bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 rounded-lg shadow-sm">
                      <WandIcon className="w-3 h-3 mr-1.5 text-muted-foreground" />
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
                  className="min-h-24 resize-none text-xs rounded-xl bg-black/[0.01] dark:bg-white/[0.01] border border-black/10 dark:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary p-3 transition-all"
                />
              </div>
            )}
          </div>


          <div className="pt-4 border-t border-black/5 dark:border-white/5">
            <button
              type="button"
              className="w-full flex items-center justify-between text-[10px] font-extrabold tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-foreground uppercase transition-colors pl-0.5"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span>Advanced Config</span>
              {showAdvanced ? (
                <ChevronUpIcon className="w-3.5 h-3.5" />
              ) : (
                <ChevronDownIcon className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                {vadConfig.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-foreground/80 flex items-center justify-between">
                        <span>Speech Sensitivity (Raw)</span>
                        <span className="text-muted-foreground font-semibold">
                          {(vadConfig.sensitivity_rms * 1000).toFixed(1)}
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
                        <span className="text-muted-foreground font-semibold">
                          {(
                            (vadConfig.silence_chunks * vadConfig.hop_size) /
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
                        max={250}
                        step={5}
                        className="w-full py-2"
                      />
                      <p className="text-[10px] text-muted-foreground pl-0.5 leading-normal">
                        How long to wait after speech stops
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground/80 flex items-center justify-between">
                    <span>Noise Gate Threshold</span>
                    <span className="text-muted-foreground font-semibold">
                      {(vadConfig.noise_gate_threshold * 1000).toFixed(1)}
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
                  <p className="text-[10px] text-muted-foreground pl-0.5 leading-normal">
                    Filters low-level background noise
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetDefaults}
                  className="w-full text-xs font-bold py-2 rounded-xl bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 shadow-sm cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] active:scale-95 transition-all"
                >
                  <RotateCcwIcon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  Reset to Defaults
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

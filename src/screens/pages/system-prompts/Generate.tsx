import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
  GetLicense,
  Textarea,
} from "@/components";
import { SparklesIcon } from "lucide-react";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useApp } from "@/contexts";
import { useTranslation } from "@/hooks";

interface GenerateSystemPromptProps {
  onGenerate: (prompt: string, promptName: string) => void;
}

interface SystemPromptResponse {
  prompt_name: string;
  system_prompt: string;
}

export const GenerateSystemPrompt = ({
  onGenerate,
}: GenerateSystemPromptProps) => {
  const { t } = useTranslation();
  const { hasActiveLicense } = useApp();
  const [userPrompt, setUserPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleGenerate = async () => {
    if (!userPrompt.trim()) {
      setError(t("prompts_generate_error_empty"));
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const response = await invoke<SystemPromptResponse>(
        "create_system_prompt",
        {
          userPrompt: userPrompt.trim(),
        }
      );

      if (response.system_prompt && response.prompt_name) {
        onGenerate(response.system_prompt, response.prompt_name);
        setIsOpen(false);
        setUserPrompt("");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t("prompts_generate_error_fail");
      setError(errorMessage);
      console.error("Error generating system prompt:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label={t("prompts_generate_with_ai")}
          size="sm"
          variant="outline"
          className="w-fit"
        >
          <SparklesIcon className="h-4 w-4" /> {t("prompts_generate_with_ai")}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        className="w-96 p-4 border shadow-lg"
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">{t("prompts_generate_title")}</p>
            <p className="text-xs text-muted-foreground">
              {t("prompts_generate_desc")}
            </p>
          </div>

          <Textarea
            placeholder={t("prompts_generate_placeholder")}
            className="min-h-[100px] resize-none border-1 border-input/50 focus:border-primary/50 transition-colors"
            value={userPrompt}
            onChange={(e) => {
              setUserPrompt(e.target.value);
              setError(null);
            }}
            disabled={isGenerating}
          />

          {error && <p className="text-xs text-destructive">{error}</p>}

          {hasActiveLicense ? (
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={!userPrompt.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <SparklesIcon className="h-4 w-4 animate-pulse" />
                  {t("prompts_generating")}
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  {t("prompts_generate_btn")}
                </>
              )}
            </Button>
          ) : (
            <div className="w-full flex flex-col gap-3">
              <p className="text-sm font-medium text-muted-foreground">
                {t("prompts_license_required")}
              </p>
              <GetLicense
                buttonText={t("dashboard_get_license")}
                buttonClassName="w-full"
                setState={setIsOpen}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

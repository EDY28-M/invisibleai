import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Empty,
  GetLicense,
} from "@/components";
import {
  Sparkles,
  LockIcon,
} from "lucide-react";
import { useApp } from "@/contexts";
import { safeLocalStorage } from "@/lib";
import { STORAGE_KEYS } from "@/config";
import moment from "moment";
import { useTranslation } from "@/hooks";

interface InvisibleAIPrompt {
  title: string;
  prompt: string;
  modelId: string;
  modelName: string;
}

interface InvisibleAIPromptsResponse {
  prompts: InvisibleAIPrompt[];
  total: number;
  last_updated?: string;
}

interface Model {
  provider: string;
  name: string;
  id: string;
  model: string;
  description: string;
  modality: string;
  isAvailable: boolean;
}

const SELECTED_INVISIBLEAI_MODEL_STORAGE_KEY = "selected_invisibleai_model";
const SELECTED_INVISIBLEAI_PROMPT_STORAGE_KEY = "selected_invisibleai_prompt";

const LOCAL_FALLBACK_PROMPTS: Record<"en" | "es", InvisibleAIPrompt[]> = {
  en: [
    { title: "Software Engineer", prompt: "You are an elite software developer. Write clean, highly-optimized code. Explain concepts clearly and concisely.", modelId: "gpt-4o", modelName: "GPT-4o" },
    { title: "Meeting Summarizer", prompt: "You are an executive assistant. Summarize meetings with bullet points, capturing decisions, key arguments, and action items.", modelId: "gpt-4o", modelName: "GPT-4o" },
    { title: "Copywriter Pro", prompt: "You are a senior copywriter. Create highly engaging, persuasive, and crisp content for any medium.", modelId: "gpt-4o", modelName: "GPT-4o" },
    { title: "Instant Answer", prompt: "You are a hyper-efficient assistant. Answer immediately and directly without any introductory filler or pleasantries.", modelId: "gpt-4o", modelName: "GPT-4o" },
  ],
  es: [
    { title: "Ingeniero de Software", prompt: "Eres un desarrollador de software de élite. Escribe código limpio y optimizado. Explica conceptos de forma clara y concisa.", modelId: "gpt-4o", modelName: "GPT-4o" },
    { title: "Resumidor de Reuniones", prompt: "Eres un asistente ejecutivo. Resume reuniones con viñetas, capturando decisiones, argumentos clave y tareas pendientes.", modelId: "gpt-4o", modelName: "GPT-4o" },
    { title: "Redactor Creativo Pro", prompt: "Eres un redactor creativo senior. Crea contenido persuasivo, atractivo y pulido para cualquier medio.", modelId: "gpt-4o", modelName: "GPT-4o" },
    { title: "Respuesta Directa", prompt: "Eres un asistente hiper-eficiente. Responde de inmediato y de forma directa, sin introducciones ni rodeos innecesarios.", modelId: "gpt-4o", modelName: "GPT-4o" },
  ],
};

export const InvisibleAIPrompts = () => {
  const { t, language } = useTranslation();
  const { setSystemPrompt, hasActiveLicense, setSupportsImages, invisibleaiApiEnabled } = useApp();
  const [prompts, setPrompts] = useState<InvisibleAIPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedInvisibleAIPrompt, setSelectedInvisibleAIPrompt] = useState<InvisibleAIPrompt | null>(() => {
    const stored = safeLocalStorage.getItem(SELECTED_INVISIBLEAI_PROMPT_STORAGE_KEY);
    if (stored) { try { return JSON.parse(stored); } catch { return null; } }
    return null;
  });
  const [models, setModels] = useState<Model[]>([]);
  const fetchInitiated = useRef(false);

  useEffect(() => {
    if (!fetchInitiated.current) {
      fetchInitiated.current = true;
      fetchInvisibleAIPrompts();
      fetchModels();
    }
  }, []);

  useEffect(() => {
    const checkUserPromptSelection = () => {
      const userSelectedPromptId = safeLocalStorage.getItem(STORAGE_KEYS.SELECTED_SYSTEM_PROMPT_ID);
      if (userSelectedPromptId) setSelectedInvisibleAIPrompt(null);
    };
    checkUserPromptSelection();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.SELECTED_SYSTEM_PROMPT_ID) checkUserPromptSelection();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    moment.locale(language === "spanish" ? "es" : "en");
  }, [language]);

  const fetchInvisibleAIPrompts = async () => {
    setIsLoading(true);
    try {
      const response = await invoke<InvisibleAIPromptsResponse>("fetch_prompts");
      setPrompts(response.prompts);
      if (response.last_updated) setLastUpdated(response.last_updated);
    } catch {
      const fallbackList = LOCAL_FALLBACK_PROMPTS[language === "spanish" ? "es" : "en"];
      setPrompts(fallbackList);
      setLastUpdated(new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      const fetchedModels = await invoke<Model[]>("fetch_models");
      setModels(fetchedModels);
    } catch (error) {
      console.error("Failed to fetch models:", error);
    }
  };

  const handleSelectInvisibleAIPrompt = async (prompt: InvisibleAIPrompt) => {
    if (!hasActiveLicense) return;
    try {
      setSystemPrompt(prompt.prompt);
      setSelectedInvisibleAIPrompt(prompt);
      safeLocalStorage.removeItem(STORAGE_KEYS.SELECTED_SYSTEM_PROMPT_ID);
      safeLocalStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, prompt.prompt);
      safeLocalStorage.setItem(SELECTED_INVISIBLEAI_PROMPT_STORAGE_KEY, JSON.stringify(prompt));

      const matchingModel = models.find((model) => model.model === prompt.modelId || model.id === prompt.modelId);
      if (matchingModel) {
        if (invisibleaiApiEnabled) {
          setSupportsImages((matchingModel.modality?.includes("image") || matchingModel.modality?.includes("vision")) ?? false);
        }
        await invoke("secure_storage_save", {
          items: [{ key: SELECTED_INVISIBLEAI_MODEL_STORAGE_KEY, value: JSON.stringify(matchingModel) }],
        });
      }
    } catch (error) {
      console.error("Failed to select InvisibleAI prompt:", error);
    }
  };

  const isPromptSelected = (prompt: InvisibleAIPrompt) =>
    selectedInvisibleAIPrompt?.title === prompt.title && selectedInvisibleAIPrompt?.modelId === prompt.modelId;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Empty isLoading={true} icon={Sparkles} title={t("prompts_default_loading_title")} description={t("prompts_default_loading_desc")} />
      </div>
    );
  }

  if (prompts.length === 0) return null;

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/10">
        <div>
          <h3 className="text-base font-bold text-foreground/90 tracking-wide">
            {t("prompts_default_title")}
          </h3>
          <p className="text-sm text-muted-foreground/55 mt-1">
            {t("prompts_default_desc")}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {lastUpdated && (
            <span className="hidden sm:block text-[11px] text-muted-foreground/40 select-none">
              {moment(lastUpdated).fromNow()}
            </span>
          )}
          {!hasActiveLicense && (
            <GetLicense buttonText={t("prompts_unlock_btn")} buttonClassName="h-9 px-4 text-xs rounded-2xl shrink-0" />
          )}
        </div>
      </div>

      {/* Prompt cards grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-300 ${!hasActiveLicense ? "opacity-50" : ""}`}>
        {prompts.map((prompt, index) => {
          const isSelected = isPromptSelected(prompt);
          return (
            <div
              key={`${prompt.title}-${index}`}
              onClick={() => handleSelectInvisibleAIPrompt(prompt)}
              className={`relative group cursor-pointer rounded-2xl border p-4 transition-all duration-200 overflow-hidden ${
                hasActiveLicense ? "cursor-pointer" : "cursor-not-allowed"
              } ${
                isSelected
                  ? "border-border/30 bg-card/60 shadow-sm"
                  : "border-border/15 bg-card/20 hover:bg-card/40 hover:border-border/25"
              }`}
            >
              {/* Orb gradient on selected */}
              {isSelected && (
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
              )}

              {/* Lock / selected indicator */}
              {!hasActiveLicense ? (
                <div className="absolute top-3 right-3 flex size-4 items-center justify-center rounded-full bg-foreground/5 text-foreground/30">
                  <LockIcon className="size-2.5" />
                </div>
              ) : isSelected ? (
                <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" />
              ) : null}

              <div className="relative z-10 space-y-2">
                <p className={`text-[15px] font-semibold tracking-wide ${isSelected ? "text-foreground/90" : "text-foreground/60"}`}>
                  {prompt.title}
                </p>
                <p className={`text-xs leading-relaxed line-clamp-3 ${isSelected ? "text-muted-foreground/75" : "text-muted-foreground/50"}`}>
                  {prompt.prompt}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

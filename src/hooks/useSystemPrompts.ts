import { useCallback, useEffect, useState } from "react";
import {
  createSystemPrompt,
  getAllSystemPrompts,
  updateSystemPrompt,
  deleteSystemPrompt,
} from "@/lib/database";
import type {
  SystemPrompt,
  SystemPromptInput,
  UpdateSystemPromptInput,
} from "@/types";
import { DEFAULT_SYSTEM_PROMPT, STORAGE_KEYS } from "@/config";
import { safeLocalStorage } from "@/lib";
import { useApp } from "@/contexts";

export const useSystemPrompts = () => {
  const { systemPrompt, setSystemPrompt } = useApp();
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(
    () => {
      const stored = safeLocalStorage.getItem(
        STORAGE_KEYS.SELECTED_SYSTEM_PROMPT_ID
      );
      return stored ? Number(stored) : null;
    }
  );

  const fetchPrompts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getAllSystemPrompts();
      setPrompts(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch system prompts";
      setError(errorMessage);
      console.error("Error fetching system prompts:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPrompt = useCallback(
    async (input: SystemPromptInput): Promise<SystemPrompt> => {
      try {
        setError(null);
        const result = await createSystemPrompt(input);
        await fetchPrompts();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create system prompt";
        setError(errorMessage);
        console.error("Error creating system prompt:", err);
        throw err;
      }
    },
    [fetchPrompts]
  );

  const updatePrompt = useCallback(
    async (
      id: number,
      input: UpdateSystemPromptInput
    ): Promise<SystemPrompt> => {
      try {
        setError(null);
        const result = await updateSystemPrompt(id, input);
        await fetchPrompts();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update system prompt";
        setError(errorMessage);
        console.error("Error updating system prompt:", err);
        throw err;
      }
    },
    [fetchPrompts]
  );

  const deletePrompt = useCallback(
    async (id: number): Promise<void> => {
      try {
        setError(null);
        const deletedPrompt = prompts.find((prompt) => prompt.id === id);
        await deleteSystemPrompt(id);
        const currentStoredPrompt = safeLocalStorage.getItem(
          STORAGE_KEYS.SYSTEM_PROMPT
        );
        const deletedPromptWasActive =
          selectedPromptId === id ||
          (!!deletedPrompt?.prompt &&
            (currentStoredPrompt === deletedPrompt.prompt ||
              systemPrompt === deletedPrompt.prompt));

        if (deletedPromptWasActive) {
          setSelectedPromptId(null);
          setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
          safeLocalStorage.setItem(
            STORAGE_KEYS.SYSTEM_PROMPT,
            DEFAULT_SYSTEM_PROMPT
          );
          safeLocalStorage.removeItem(STORAGE_KEYS.SELECTED_SYSTEM_PROMPT_ID);
          safeLocalStorage.removeItem(STORAGE_KEYS.SELECTED_INVISIBLEAI_PROMPT);
        }

        if (deletedPrompt?.prompt) {
          const savedAudioContext = safeLocalStorage.getItem(
            STORAGE_KEYS.SYSTEM_AUDIO_CONTEXT
          );
          if (savedAudioContext) {
            try {
              const parsed = JSON.parse(savedAudioContext);
              if (parsed?.contextContent === deletedPrompt.prompt) {
                safeLocalStorage.setItem(
                  STORAGE_KEYS.SYSTEM_AUDIO_CONTEXT,
                  JSON.stringify({ useSystemPrompt: true, contextContent: "" })
                );
              }
            } catch {
              safeLocalStorage.removeItem(STORAGE_KEYS.SYSTEM_AUDIO_CONTEXT);
            }
          }
        }

        await fetchPrompts();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete system prompt";
        setError(errorMessage);
        console.error("Error deleting system prompt:", err);
        throw err;
      }
    },
    [fetchPrompts, prompts, selectedPromptId, setSystemPrompt, systemPrompt]
  );

  const refreshPrompts = useCallback(async () => {
    await fetchPrompts();
  }, [fetchPrompts]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  useEffect(() => {
    if (selectedPromptId && prompts.length > 0) {
      const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);
      if (selectedPrompt) {
        setSystemPrompt(selectedPrompt.prompt);
        safeLocalStorage.setItem(
          STORAGE_KEYS.SYSTEM_PROMPT,
          selectedPrompt.prompt
        );
      } else {

        setSelectedPromptId(null);
        safeLocalStorage.removeItem(STORAGE_KEYS.SELECTED_SYSTEM_PROMPT_ID);
        safeLocalStorage.removeItem(STORAGE_KEYS.SELECTED_INVISIBLEAI_PROMPT);
        setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        safeLocalStorage.setItem(
          STORAGE_KEYS.SYSTEM_PROMPT,
          DEFAULT_SYSTEM_PROMPT
        );
      }
    }
  }, [prompts, selectedPromptId, setSystemPrompt]);

  const handleSelectPrompt = useCallback(
    (promptId: number) => {
      const selectedPrompt = prompts.find((p) => p.id === promptId);
      if (selectedPrompt) {
        setSystemPrompt(selectedPrompt.prompt);
        setSelectedPromptId(promptId);
        safeLocalStorage.setItem(
          STORAGE_KEYS.SYSTEM_PROMPT,
          selectedPrompt.prompt
        );
        safeLocalStorage.setItem(
          STORAGE_KEYS.SELECTED_SYSTEM_PROMPT_ID,
          promptId.toString()
        );

        safeLocalStorage.removeItem(STORAGE_KEYS.SELECTED_INVISIBLEAI_PROMPT);
      }
    },
    [prompts, setSystemPrompt]
  );

  return {
    prompts,
    isLoading,
    error,
    selectedPromptId,
    createPrompt,
    updatePrompt,
    deletePrompt,
    refreshPrompts,
    clearError,
    handleSelectPrompt,
  };
};

import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ProfileTemplate, ProfileModifier, ActiveProfileConfig } from "@/types";

export const useProfiles = () => {
  const [templates, setTemplates] = useState<ProfileTemplate[]>([]);
  const [modifiers, setModifiers] = useState<ProfileModifier[]>([]);
  const [activeConfig, setActiveConfig] = useState<ActiveProfileConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveConfig = useCallback(async () => {
    try {
      const config = await invoke<ActiveProfileConfig | null>("get_active_profile");
      setActiveConfig(config);
      return config;
    } catch (err) {
      console.error("Error fetching active profile config:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return null;
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const temps = await invoke<ProfileTemplate[]>("get_profile_templates");
      setTemplates(temps);
      await fetchActiveConfig();
    } catch (err) {
      console.error("Error fetching profile templates:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [fetchActiveConfig]);

  const fetchModifiers = useCallback(async (templateId: string) => {
    try {
      setError(null);
      const mods = await invoke<ProfileModifier[]>("get_profile_modifiers", { templateId });
      setModifiers(mods);
    } catch (err) {
      console.error("Error fetching modifiers:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, []);

  const selectTemplate = useCallback(async (templateId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await invoke("set_active_profile_template", { templateId });
      const newConfig = await fetchActiveConfig();
      if (newConfig && newConfig.template_id) {
        await fetchModifiers(newConfig.template_id);
      } else {
        setModifiers([]);
      }
    } catch (err) {
      console.error("Error setting active template:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [fetchActiveConfig, fetchModifiers]);

  const toggleModifier = useCallback(async (modifierId: string) => {
    try {
      setError(null);
      const updatedModifiers = await invoke<string[]>("toggle_profile_modifier", { modifierId });
      setActiveConfig(prev => {
        if (!prev) return null;
        return {
          ...prev,
          selected_modifiers: updatedModifiers
        };
      });
    } catch (err) {
      console.error("Error toggling modifier:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, []);

  const setCustomNotes = useCallback(async (notes: string) => {
    try {
      setError(null);
      await invoke("set_profile_custom_notes", { notes });
      setActiveConfig(prev => {
        if (!prev) return null;
        return {
          ...prev,
          custom_notes: notes
        };
      });
    } catch (err) {
      console.error("Error setting custom notes:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Si cambia el template_id activo, recargar sus modificadores
  useEffect(() => {
    if (activeConfig?.template_id) {
      fetchModifiers(activeConfig.template_id);
    } else {
      setModifiers([]);
    }
  }, [activeConfig?.template_id, fetchModifiers]);

  const getActiveTemplateName = useCallback(() => {
    if (!activeConfig?.template_id) return "Ninguno (Perfil Legacy)";
    const current = templates.find(t => t.id === activeConfig.template_id);
    return current ? current.name : "Personalizado";
  }, [activeConfig?.template_id, templates]);

  return {
    templates,
    modifiers,
    activeConfig,
    isLoading,
    error,
    selectTemplate,
    toggleModifier,
    setCustomNotes,
    getActiveTemplateName,
    refreshProfiles: fetchTemplates,
  };
};

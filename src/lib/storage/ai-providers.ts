import { STORAGE_KEYS } from "@/config";
import { TYPE_PROVIDER } from "@/types";
import { safeLocalStorage } from "./helper";

export function getCustomAiProviders(): TYPE_PROVIDER[] {
  try {
    const saved = safeLocalStorage.getItem(STORAGE_KEYS.CUSTOM_AI_PROVIDERS);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (provider) =>
        provider?.id && provider?.isCustom && typeof provider?.curl === "string"
    );
  } catch (error) {
    console.error("Error retrieving custom AI providers:", error);
    return [];
  }
}

export function setCustomAiProviders(providers: TYPE_PROVIDER[]): void {
  safeLocalStorage.setItem(
    STORAGE_KEYS.CUSTOM_AI_PROVIDERS,
    JSON.stringify(providers)
  );
}

export function addCustomAiProvider(
  newProvider: Omit<TYPE_PROVIDER, "id" | "isCustom">
): TYPE_PROVIDER | null {
  try {
    const providers = getCustomAiProviders();
    const provider: TYPE_PROVIDER = {
      ...newProvider,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      isCustom: true,
    };
    setCustomAiProviders([...providers, provider]);
    return provider;
  } catch (error) {
    console.error("Error adding custom AI provider:", error);
    return null;
  }
}

export function updateCustomAiProvider(
  id: string,
  updates: Partial<TYPE_PROVIDER>
): boolean {
  const providers = getCustomAiProviders();
  const index = providers.findIndex((provider) => provider.id === id);
  if (index === -1) return false;
  providers[index] = { ...providers[index], ...updates, isCustom: true };
  setCustomAiProviders(providers);
  return true;
}

export function removeCustomAiProvider(id: string): boolean {
  const providers = getCustomAiProviders();
  const filtered = providers.filter((provider) => provider.id !== id);
  if (filtered.length === providers.length) return false;
  setCustomAiProviders(filtered);
  return true;
}

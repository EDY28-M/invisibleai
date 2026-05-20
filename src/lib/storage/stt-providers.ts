import { STORAGE_KEYS } from "@/config";
import { TYPE_PROVIDER } from "@/types";
import { safeLocalStorage } from "./helper";

export function getCustomSttProviders(): TYPE_PROVIDER[] {
  try {
    const saved = safeLocalStorage.getItem(
      STORAGE_KEYS.CUSTOM_SPEECH_PROVIDERS
    );
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (provider) =>
        provider?.id && provider?.isCustom && typeof provider?.curl === "string"
    );
  } catch (error) {
    console.error("Error retrieving custom STT providers:", error);
    return [];
  }
}

export function setCustomSttProviders(providers: TYPE_PROVIDER[]): void {
  safeLocalStorage.setItem(
    STORAGE_KEYS.CUSTOM_SPEECH_PROVIDERS,
    JSON.stringify(providers)
  );
}

export function addCustomSttProvider(
  newProvider: Omit<TYPE_PROVIDER, "id" | "isCustom">
): TYPE_PROVIDER | null {
  try {
    const providers = getCustomSttProviders();
    const provider: TYPE_PROVIDER = {
      ...newProvider,
      id: `custom-stt-${Date.now()}`,
      isCustom: true,
    };
    setCustomSttProviders([...providers, provider]);
    return provider;
  } catch (error) {
    console.error("Error adding custom STT provider:", error);
    return null;
  }
}

export function updateCustomSttProvider(
  id: string,
  updates: Partial<TYPE_PROVIDER>
): boolean {
  const providers = getCustomSttProviders();
  const index = providers.findIndex((provider) => provider.id === id);
  if (index === -1) return false;
  providers[index] = { ...providers[index], ...updates, isCustom: true };
  setCustomSttProviders(providers);
  return true;
}

export function removeCustomSttProvider(id: string): boolean {
  const providers = getCustomSttProviders();
  const filtered = providers.filter((provider) => provider.id !== id);
  if (filtered.length === providers.length) return false;
  setCustomSttProviders(filtered);
  return true;
}

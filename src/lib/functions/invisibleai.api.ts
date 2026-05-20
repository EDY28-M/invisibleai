import { invoke } from "@tauri-apps/api/core";
import { safeLocalStorage } from "../storage";
import { STORAGE_KEYS } from "@/config";

let cachedResult: boolean | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

export async function shouldUseInvisibleAIAPI(): Promise<boolean> {

  const now = Date.now();
  if (cachedResult !== null && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedResult;
  }

  try {

    const invisibleaiApiEnabled =
      safeLocalStorage.getItem(STORAGE_KEYS.INVISIBLEAI_API_ENABLED) === "true";
    if (!invisibleaiApiEnabled) {
      cachedResult = false;
      cacheTimestamp = now;
      return false;
    }

    const hasLicense = await invoke<boolean>("check_license_status");
    cachedResult = hasLicense;
    cacheTimestamp = now;
    return hasLicense;
  } catch (error) {
    console.warn("Failed to check InvisibleAI API availability:", error);
    cachedResult = false;
    cacheTimestamp = now;
    return false;
  }
}

export function invalidateInvisibleAICache() {
  cachedResult = null;
  cacheTimestamp = 0;
}

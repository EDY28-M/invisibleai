/**
 * Simple localStorage-backed cache with TTL.
 *
 * Each cached value is stored under `key` and its write timestamp under
 * `${key}_at`.  Entries older than `ttlMs` are treated as stale and the
 * caller receives `null`, prompting a fresh network fetch.
 *
 * Usage:
 *   const models = getLocalCache<Model[]>(STORAGE_KEYS.CACHED_MODELS);
 *   if (!models) { ... fetch ... setLocalCache(STORAGE_KEYS.CACHED_MODELS, fresh); }
 */

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1_000; // 24 h

export function getLocalCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  try {
    const raw = localStorage.getItem(key);
    const rawAt = localStorage.getItem(`${key}_at`);
    if (!raw || !rawAt) return null;

    const age = Date.now() - parseInt(rawAt, 10);
    if (age > ttlMs) return null;

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setLocalCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(`${key}_at`, String(Date.now()));
  } catch {
    // Storage quota exceeded or private-browsing restriction — silently ignore
  }
}

export function clearLocalCache(key: string): void {
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_at`);
  } catch {
    // ignore
  }
}

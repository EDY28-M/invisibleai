import { CV_MAX_CHARS, STORAGE_KEYS } from "@/config/constants";
import { safeLocalStorage } from "./helper";

export interface InterviewCv {
  text: string;
  filename: string | null;
  updatedAt: number | null;
}

const STORAGE_EVENT = "interview-cv-updated";

/** Loads the persisted CV (text + filename + timestamp). Never throws. */
export function getInterviewCv(): InterviewCv {
  const text = safeLocalStorage.getItem(STORAGE_KEYS.INTERVIEW_CV_TEXT) ?? "";
  const filename = safeLocalStorage.getItem(STORAGE_KEYS.INTERVIEW_CV_FILENAME);
  const raw = safeLocalStorage.getItem(STORAGE_KEYS.INTERVIEW_CV_UPDATED_AT);
  const updatedAt = raw ? Number.parseInt(raw, 10) || null : null;
  return { text, filename, updatedAt };
}

/**
 * Persists the CV. The text is trimmed and capped at CV_MAX_CHARS to keep the
 * system prompt within Groq's context window — anything longer is dropped from
 * the tail, where résumés usually carry less signal.
 */
export function setInterviewCv(input: { text: string; filename?: string | null }): InterviewCv {
  const trimmed = input.text.trim().slice(0, CV_MAX_CHARS);
  if (!trimmed) {
    clearInterviewCv();
    return { text: "", filename: null, updatedAt: null };
  }

  const now = Date.now();
  safeLocalStorage.setItem(STORAGE_KEYS.INTERVIEW_CV_TEXT, trimmed);
  if (input.filename) {
    safeLocalStorage.setItem(STORAGE_KEYS.INTERVIEW_CV_FILENAME, input.filename);
  } else {
    safeLocalStorage.removeItem(STORAGE_KEYS.INTERVIEW_CV_FILENAME);
  }
  safeLocalStorage.setItem(STORAGE_KEYS.INTERVIEW_CV_UPDATED_AT, String(now));

  const next: InterviewCv = {
    text: trimmed,
    filename: input.filename ?? null,
    updatedAt: now,
  };
  emitChange(next);
  return next;
}

/** Removes any persisted CV. */
export function clearInterviewCv(): void {
  safeLocalStorage.removeItem(STORAGE_KEYS.INTERVIEW_CV_TEXT);
  safeLocalStorage.removeItem(STORAGE_KEYS.INTERVIEW_CV_FILENAME);
  safeLocalStorage.removeItem(STORAGE_KEYS.INTERVIEW_CV_UPDATED_AT);
  emitChange({ text: "", filename: null, updatedAt: null });
}

/** Whether the free-tier one-shot trial of the Interview Expert profile has been spent. */
export function isInterviewTrialUsed(): boolean {
  return safeLocalStorage.getItem(STORAGE_KEYS.INTERVIEW_TRIAL_USED) === "true";
}

/** Marks the free-tier trial as spent. Idempotent. */
export function markInterviewTrialUsed(): void {
  safeLocalStorage.setItem(STORAGE_KEYS.INTERVIEW_TRIAL_USED, "true");
}

/** Allows admins / licensed users to reset the trial flag (used after license activation). */
export function resetInterviewTrial(): void {
  safeLocalStorage.removeItem(STORAGE_KEYS.INTERVIEW_TRIAL_USED);
}

function emitChange(detail: InterviewCv): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent<InterviewCv>(STORAGE_EVENT, { detail }));
  } catch {
    /* ignore — environments without CustomEvent (SSR) just skip notifications */
  }
}

export const INTERVIEW_CV_EVENT = STORAGE_EVENT;

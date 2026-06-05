import { useCallback, useEffect, useState } from "react";
import {
  INTERVIEW_CV_EVENT,
  type InterviewCv,
  clearInterviewCv,
  getInterviewCv,
  isInterviewTrialUsed,
  markInterviewTrialUsed,
  resetInterviewTrial,
  setInterviewCv,
} from "@/lib/storage/interview-cv.storage";
import { parseCvFile } from "@/lib/functions/cv-parser.function";

/**
 * Parses any supported CV file (.txt, .md, .pdf, .docx) into plain text. PDF
 * and DOCX parsing happens via dynamic imports of `pdfjs-dist` and `mammoth`
 * so neither hits the initial bundle.
 */
export async function readCvFileAsText(file: File): Promise<string> {
  const parsed = await parseCvFile(file);
  return parsed.text;
}

export interface UseInterviewCvReturn {
  cv: InterviewCv;
  isLoaded: boolean;
  trialUsed: boolean;
  save: (input: { text: string; filename?: string | null }) => InterviewCv;
  clear: () => void;
  consumeTrial: () => void;
  resetTrial: () => void;
}

/**
 * Hook that exposes the persisted CV, keeps it in sync with localStorage
 * changes (including changes from other tabs / windows), and surfaces the
 * free-tier trial flag.
 */
export function useInterviewCv(): UseInterviewCvReturn {
  const [cv, setCv] = useState<InterviewCv>(() => getInterviewCv());
  const [trialUsed, setTrialUsed] = useState<boolean>(() => isInterviewTrialUsed());

  useEffect(() => {
    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent<InterviewCv>).detail;
      if (detail) setCv(detail);
    };
    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (event.key.startsWith("iai_interview_")) {
        setCv(getInterviewCv());
        setTrialUsed(isInterviewTrialUsed());
      }
    };
    window.addEventListener(INTERVIEW_CV_EVENT, handleCustom as EventListener);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(INTERVIEW_CV_EVENT, handleCustom as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const save = useCallback(
    (input: { text: string; filename?: string | null }) => {
      const next = setInterviewCv(input);
      setCv(next);
      return next;
    },
    [],
  );

  const clear = useCallback(() => {
    clearInterviewCv();
    setCv({ text: "", filename: null, updatedAt: null });
  }, []);

  const consumeTrial = useCallback(() => {
    markInterviewTrialUsed();
    setTrialUsed(true);
  }, []);

  const resetTrial = useCallback(() => {
    resetInterviewTrial();
    setTrialUsed(false);
  }, []);

  return {
    cv,
    isLoaded: true,
    trialUsed,
    save,
    clear,
    consumeTrial,
    resetTrial,
  };
}

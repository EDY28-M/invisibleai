import { useEffect } from "react";
import { useGlobalShortcuts } from "./useGlobalShortcuts";

interface UseShortcutsProps {
  onAudioRecording?: () => void;
  onScreenshot?: () => void;
  onSystemAudio?: () => void;
  customShortcuts?: Record<string, () => void>;
}

export const useShortcuts = ({
  onAudioRecording,
  onScreenshot,
  onSystemAudio,
  customShortcuts = {},
}: UseShortcutsProps = {}) => {
  const {
    registerAudioCallback,
    registerScreenshotCallback,
    registerSystemAudioCallback,
    registerCustomShortcutCallback,
    unregisterCustomShortcutCallback,
  } = useGlobalShortcuts();

  useEffect(() => {
    if (onAudioRecording) {
      registerAudioCallback(onAudioRecording);
    }
  }, [onAudioRecording, registerAudioCallback]);

  useEffect(() => {
    if (onScreenshot) {
      registerScreenshotCallback(onScreenshot);
    }
  }, [onScreenshot, registerScreenshotCallback]);

  useEffect(() => {
    if (onSystemAudio) {
      registerSystemAudioCallback(onSystemAudio);
    }
  }, [onSystemAudio, registerSystemAudioCallback]);

  useEffect(() => {
    Object.entries(customShortcuts).forEach(([actionId, callback]) => {
      registerCustomShortcutCallback(actionId, callback);
    });

    return () => {
      Object.keys(customShortcuts).forEach((actionId) => {
        unregisterCustomShortcutCallback(actionId);
      });
    };
  }, [
    customShortcuts,
    registerCustomShortcutCallback,
    unregisterCustomShortcutCallback,
  ]);

  return useGlobalShortcuts();
};

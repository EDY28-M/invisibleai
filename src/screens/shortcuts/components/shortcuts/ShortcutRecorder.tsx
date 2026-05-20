import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components";
import { Check, X } from "lucide-react";
import {
  isMacOS,
  validateShortcutKey,
  formatShortcutKeyForDisplay,
} from "@/lib";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "@/hooks";

interface ShortcutRecorderProps {
  onSave: (key: string) => void;
  onCancel: () => void;
  disabled?: boolean;
  actionId?: string;
}

export const ShortcutRecorder = ({
  onSave,
  onCancel,
  disabled = false,
  actionId,
}: ShortcutRecorderProps) => {
  const { t } = useTranslation();
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const isRecording = true;
  const isMoveWindow = actionId === "move_window";
  const minKeys = isMoveWindow ? 1 : 2;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isRecording) return;

      e.preventDefault();
      e.stopPropagation();

      const keys: string[] = [];

      if (e.metaKey || e.ctrlKey) {
        keys.push(isMacOS() ? "cmd" : "ctrl");
      }
      if (e.altKey) keys.push("alt");
      if (e.shiftKey) keys.push("shift");

      let mainKey = e.key.toLowerCase();

      const specialKeyMap: Record<string, string> = {
        arrowup: "up",
        arrowdown: "down",
        arrowleft: "left",
        arrowright: "right",
        " ": "space",
        escape: "esc",
        enter: "return",
        backspace: "backspace",
        delete: "delete",
        tab: "tab",
        "[": "bracketleft",
        "]": "bracketright",
        ";": "semicolon",
        "'": "quote",
        "`": "grave",
        "\\": "backslash",
        "/": "slash",
        ",": "comma",
        ".": "period",
        "-": "minus",
        "=": "equal",
        "+": "plus",
      };

      if (specialKeyMap[mainKey]) {
        mainKey = specialKeyMap[mainKey];
      }

      if (isMoveWindow) {
        if (["up", "down", "left", "right"].includes(mainKey)) {
          setError(
            t("recorder_err_arrow")
          );
          return;
        }
        if (keys.length >= 1) {
          setRecordedKeys(keys);
          setError("");
        } else {
          setError(t("recorder_err_modifier"));
        }
      } else {
        if (!["control", "alt", "shift", "meta"].includes(mainKey)) {
          keys.push(mainKey);
        }

        if (keys.length >= 2) {
          setRecordedKeys(keys);
          setError("");
        } else {
          setError(
            t("recorder_err_modifier_key")
          );
        }
      }
    },
    [isRecording, isMoveWindow, t]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!isRecording) return;
      e.preventDefault();
      e.stopPropagation();
    },
    [isRecording]
  );

  useEffect(() => {
    if (isRecording) {

      window.focus();

      window.addEventListener("keydown", handleKeyDown, true);
      window.addEventListener("keyup", handleKeyUp, true);

      return () => {
        window.removeEventListener("keydown", handleKeyDown, true);
        window.removeEventListener("keyup", handleKeyUp, true);
      };
    }
  }, [isRecording, handleKeyDown, handleKeyUp]);

  const handleSave = async () => {
    if (recordedKeys.length < minKeys) {
      setError(
        isMoveWindow
          ? t("recorder_err_move_modifier")
          : t("recorder_err_shortcut_modifier")
      );
      return;
    }

    const shortcutKey = recordedKeys.join("+");

    if (!isMoveWindow) {

      if (!validateShortcutKey(shortcutKey)) {
        setError(t("recorder_err_invalid"));
        return;
      }

      try {
        const isValid = await invoke<boolean>("validate_shortcut_key", {
          key: shortcutKey,
        });

        if (!isValid) {
          setError(t("recorder_err_not_supported"));
          return;
        }
      } catch (e) {
        setError(t("recorder_err_failed"));
        return;
      }
    }

    onSave(shortcutKey);
  };

  const handleCancel = () => {
    setRecordedKeys([]);
    setError("");
    onCancel();
  };

  const displayKey =
    recordedKeys.length > 0
      ? formatShortcutKeyForDisplay(recordedKeys.join("+"))
      : t("recorder_waiting");

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <div className="px-3 py-2 bg-primary/5 border-2 border-primary/50 rounded-md font-mono text-sm text-center">
            {isRecording ? (
              <span className="text-primary font-medium animate-pulse">
                ⌨️ {displayKey}
              </span>
            ) : (
              <span>{displayKey}</span>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="default"
          onClick={handleSave}
          disabled={disabled || recordedKeys.length < minKeys}
          title={t("recorder_save_title")}
        >
          <Check className="h-4 w-4" />
          {t("recorder_save")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={disabled}
          title={t("recorder_cancel_title")}
        >
          <X className="h-4 w-4" />
          {t("recorder_cancel")}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {isRecording && !error && (
        <p className="text-xs text-muted-foreground">
          {isMoveWindow
            ? t("recorder_help_move")
            : t("recorder_help_shortcut")}
        </p>
      )}

      {recordedKeys.length >= minKeys && !error && (
        <p className="text-xs text-green-600">
          {t("recorder_captured")}
        </p>
      )}
    </div>
  );
};

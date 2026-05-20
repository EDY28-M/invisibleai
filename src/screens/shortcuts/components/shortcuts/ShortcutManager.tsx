import { useState, useEffect } from "react";
import { Button, Card, GetLicense, Switch } from "@/components";
import {
  RotateCcw,
  AlertCircle,
  Keyboard,
  Lock,
  Mic as MicIcon,
  Radio as RadioIcon,
  XOctagon as XOctagonIcon,
  Camera as CameraIcon,
  Ghost as GhostIcon,
  Keyboard as KeyboardIcon,
} from "lucide-react";
import {
  getAllShortcutActions,
  getShortcutsConfig,
  updateShortcutBinding,
  resetShortcutsToDefaults,
  checkShortcutConflicts,
  formatShortcutKeyForDisplay,
  getPlatformDefaultKey,
} from "@/lib";
import { ShortcutAction, ShortcutBinding } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { useApp } from "@/contexts";
import { ShortcutRecorder } from "./ShortcutRecorder";
import { useTranslation } from "@/hooks";

export const ShortcutManager = () => {
  const { hasActiveLicense } = useApp();
  const { t } = useTranslation();
  const [actions, setActions] = useState<ShortcutAction[]>([]);
  const [bindings, setBindings] = useState<Record<string, ShortcutBinding>>({});
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    loadShortcuts();
  }, [hasActiveLicense]);

  const loadShortcuts = () => {
    const config = getShortcutsConfig();
    const allActions = getAllShortcutActions(hasActiveLicense);
    setActions(allActions);
    setBindings(config.bindings);
  };

  const handleToggleEnabled = async (actionId: string, enabled: boolean) => {
    const binding = bindings[actionId];
    if (!binding) return;

    const newBinding = { ...binding, enabled };
    const updatedBindings = { ...bindings, [actionId]: newBinding };
    setBindings(updatedBindings);

    updateShortcutBinding(actionId, binding.key, enabled);

    await applyShortcuts(updatedBindings);
  };

  const handleSaveShortcut = async (actionId: string, key: string) => {
    const conflict = checkShortcutConflicts(key, actionId);
    if (conflict) {
      setConflicts([
        `Shortcut "${key}" is already used by: ${conflict.actions
          .map((id) => actions.find((a) => a.id === id)?.name)
          .join(", ")}`,
      ]);
      return;
    }

    const binding = bindings[actionId] || {
      action: actionId,
      key: "",
      enabled: true,
    };
    const newBinding = { ...binding, key };
    const updatedBindings = { ...bindings, [actionId]: newBinding };
    setBindings(updatedBindings);

    updateShortcutBinding(actionId, key, binding.enabled);

    await applyShortcuts(updatedBindings);

    setEditingAction(null);
    setConflicts([]);
  };

  const applyShortcuts = async (
    updatedBindings: Record<string, ShortcutBinding>
  ) => {
    setIsApplying(true);
    try {
      await invoke("update_shortcuts", {
        config: { bindings: updatedBindings },
      });
    } catch (error) {
      console.error("Failed to apply shortcuts:", error);
      setConflicts([`Failed to apply shortcuts: ${error}`]);
    } finally {
      setIsApplying(false);
    }
  };

  const handleReset = async () => {
    setIsApplying(true);
    try {
      const defaultConfig = resetShortcutsToDefaults();

      await applyShortcuts(defaultConfig.bindings);

      setBindings(defaultConfig.bindings);
      setConflicts([]);
      setEditingAction(null);

      loadShortcuts();
    } catch (error) {
      console.error("Failed to reset shortcuts:", error);
      setConflicts(["Failed to reset shortcuts. Please try again."]);
    } finally {
      setIsApplying(false);
    }
  };

  // Select a theme-colored left border and tactical icon based on action ID
  const getActionTheme = (id: string) => {
    switch (id) {
      case "start_recording":
      case "toggle_recording":
        return {
          icon: <RadioIcon className="size-4 text-muted-foreground/50" />,
          bgColor: "bg-muted/10 border-border/20",
          borderColor: ""
        };
      case "cancel_recording":
        return {
          icon: <XOctagonIcon className="size-4 text-muted-foreground/50" />,
          bgColor: "bg-muted/10 border-border/20",
          borderColor: ""
        };
      case "mute_microphone":
        return {
          icon: <MicIcon className="size-4 text-muted-foreground/50" />,
          bgColor: "bg-muted/10 border-border/20",
          borderColor: ""
        };
      case "take_screenshot":
        return {
          icon: <CameraIcon className="size-4 text-muted-foreground/50" />,
          bgColor: "bg-muted/10 border-border/20",
          borderColor: ""
        };
      case "toggle_stealth_mode":
        return {
          icon: <GhostIcon className="size-4 text-muted-foreground/50" />,
          bgColor: "bg-muted/10 border-border/20",
          borderColor: ""
        };
      case "move_window":
        return {
          icon: <KeyboardIcon className="size-4 text-muted-foreground/50" />,
          bgColor: "bg-muted/10 border-border/20",
          borderColor: ""
        };
      default:
        return {
          icon: <Keyboard className="size-4 text-muted-foreground/50" />,
          bgColor: "bg-muted/10 border-border/20",
          borderColor: ""
        };
    }
  };

  // Custom keycap layout builder mimicking a premium mechanical keyboard feel
  const renderKeycaps = (keyString: string, isMoveWindow: boolean) => {
    const displayStr = formatShortcutKeyForDisplay(keyString);
    const parts = displayStr.split("+").map(k => k.trim());
    if (isMoveWindow) {
      parts.push("← ↑ ↓ →");
    }
    
    return (
      <div className="flex items-center gap-1">
        {parts.map((part, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <span className="text-[11px] font-bold text-muted-foreground/30 mx-1.5">+</span>}
            <kbd className="px-2.5 py-1 min-w-[34px] text-center text-[11px] font-bold font-mono uppercase tracking-wider rounded-lg border border-border/40 border-b-[3px] border-r-[2px] bg-gradient-to-b from-background to-card shadow-[1.5px_1.5px_0px_rgba(0,0,0,0.15)] text-foreground/80 transition-all select-none hover:border-b-2 hover:translate-y-[0.5px] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.15)] active:border-b-0 active:translate-y-[2px] active:shadow-none">
              {part}
            </kbd>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div id="shortcuts" className="space-y-6 w-full max-w-5xl mx-auto p-1">
      {/* HEADER CONTROLS SECTION */}
      <div className="flex items-center justify-between pb-3 border-b border-border/10">
        <div>
          <h3 className="text-[15px] font-bold text-foreground/95 tracking-wide">
            {t("shortcuts_kb_title")}
          </h3>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {actions.length} {t("shortcuts_kb_configured")}
            {!hasActiveLicense && ` (${t("shortcuts_kb_license_warning")})`}
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleReset}
          disabled={isApplying}
          className="h-9.5 rounded-xl border border-border/30 bg-card/40 backdrop-blur-md hover:bg-card hover:border-border/50 shadow-sm transition-all gap-1.5 active:scale-95 text-xs px-3.5"
          title={t("shortcuts_kb_reset_title")}
        >
          <RotateCcw className="size-4" />
          {t("shortcuts_kb_reset_btn")}
        </Button>
      </div>

      {/* CONFLICTS / ALERT WARNINGS */}
      {conflicts.length > 0 && (
        <div className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-4 text-destructive mt-0.5" />
            <div className="flex-1">
              {conflicts.map((conflict, i) => (
                <p key={i} className="text-xs text-destructive/90 font-medium">
                  {conflict}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* UNLOCK LICENSE BLOCK */}
      {!hasActiveLicense && (
        <Card className="relative p-5 rounded-3xl border border-border/20 bg-card/40 backdrop-blur-md overflow-hidden">
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-foreground/6 border border-border/20 text-foreground/50 shrink-0">
              <Lock className="size-5" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-foreground/95">
                  {t("shortcuts_kb_unlock_title")}
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed">
                  {t("shortcuts_kb_unlock_desc")}
                </p>
              </div>
              <GetLicense
                buttonText={t("dashboard_get_license")}
                buttonClassName="max-w-xs h-10 rounded-2xl text-xs font-bold tracking-wide"
              />
            </div>
          </div>
        </Card>
      )}

      {/* SHORTCUTS ACTION LIST */}
      <div className="space-y-3">
        {actions.map((action) => {
          const binding = bindings[action.id] || {
            action: action.id,
            key: getPlatformDefaultKey(action),
            enabled: true,
          };
          const isLocked = !hasActiveLicense;
          const isEditing = editingAction === action.id;
          const theme = getActionTheme(action.id);

          return (
            <div
              key={action.id}
              className={`relative overflow-hidden rounded-2xl border border-border/25 bg-card/15 backdrop-blur-md p-4 transition-all duration-300 flex flex-col justify-center min-h-[72px] ${
                !binding.enabled ? "opacity-50" : "hover:bg-card/30 hover:border-border/40"
              } ${isLocked ? "bg-muted/5 border-border/15 opacity-60" : ""}`}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-[13px] text-foreground/95">
                      {action.name}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      {action.description}
                    </p>
                  </div>
                  
                  <div className="pt-2 border-t border-border/5">
                    <ShortcutRecorder
                      actionId={action.id}
                      onSave={(key) => handleSaveShortcut(action.id, key)}
                      onCancel={() => {
                        setEditingAction(null);
                        setConflicts([]);
                      }}
                      disabled={isApplying}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Status switches & Description info */}
                  <div className="flex items-center gap-3.5">
                    <div className="shrink-0 flex items-center">
                      <Switch
                        checked={binding.enabled}
                        onCheckedChange={(enabled) =>
                          handleToggleEnabled(action.id, enabled)
                        }
                        disabled={isApplying || isLocked}
                        className="scale-90"
                      />
                    </div>

                    <div className="flex gap-3 items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[13px] text-foreground/95">
                            {action.name}
                          </p>
                          {isLocked && (
                            <Lock className="size-3.5 text-muted-foreground/60" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3D Keycaps and Editing buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-border/5 sm:border-0 pt-3.5 sm:pt-0">
                    <div className="shrink-0">
                      {renderKeycaps(binding.key, action.id === "move_window")}
                    </div>
                    
                    <Button
                      size="sm"
                      variant={isLocked ? "outline" : "default"}
                      onClick={() => {
                        if (isLocked) return;
                        setEditingAction(action.id);
                        setConflicts([]);
                      }}
                      disabled={isLocked || isApplying}
                      className="min-w-[84px] h-9.5 rounded-xl text-xs font-bold tracking-wide active:scale-95 transition-all shrink-0 shadow-sm"
                      title={
                        isLocked
                          ? t("shortcuts_kb_locked_btn_title")
                          : t("shortcuts_kb_change_btn_title")
                      }
                    >
                      {t("shortcuts_kb_change_btn")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER NOTE */}
      <p className="text-xs text-muted-foreground/50 text-center pt-2 leading-relaxed max-w-lg mx-auto">
        {t("shortcuts_kb_footer")}
      </p>
    </div>
  );
};


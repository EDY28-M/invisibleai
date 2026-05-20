import { STORAGE_KEYS, DEFAULT_SHORTCUT_ACTIONS } from "@/config";
import {
  ShortcutsConfig,
  ShortcutBinding,
  ShortcutConflict,
  ShortcutAction,
} from "@/types";
import { getPlatform } from "@/lib";

export const getPlatformDefaultKey = (action: ShortcutAction): string => {
  const platform = getPlatform();

  switch (platform) {
    case "macos":
      return action.defaultKey.macos;
    case "windows":
      return action.defaultKey.windows;
    case "linux":
      return action.defaultKey.linux;
  }
};

export const getDefaultShortcutsConfig = (): ShortcutsConfig => {
  const bindings: Record<string, ShortcutBinding> = {};

  DEFAULT_SHORTCUT_ACTIONS.forEach((action) => {
    bindings[action.id] = {
      action: action.id,
      key: getPlatformDefaultKey(action),
      enabled: true,
    };
  });

  return {
    bindings,
    customActions: [],
  };
};

export const getShortcutsConfig = (): ShortcutsConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SHORTCUTS);
    if (stored) {
      const parsed = JSON.parse(stored);

      const defaults = getDefaultShortcutsConfig();
      return {
        bindings: { ...defaults.bindings, ...parsed.bindings },
        customActions: parsed.customActions || [],
      };
    }
    return getDefaultShortcutsConfig();
  } catch (error) {
    console.error("Failed to get shortcuts config:", error);
    return getDefaultShortcutsConfig();
  }
};

export const setShortcutsConfig = (config: ShortcutsConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SHORTCUTS, JSON.stringify(config));
  } catch (error) {
    console.error("Failed to save shortcuts config:", error);
  }
};

export const updateShortcutBinding = (
  actionId: string,
  key: string,
  enabled: boolean = true
): ShortcutsConfig => {
  const config = getShortcutsConfig();
  config.bindings[actionId] = {
    action: actionId,
    key,
    enabled,
  };
  setShortcutsConfig(config);
  return config;
};

export const resetShortcutsToDefaults = (): ShortcutsConfig => {
  const defaults = getDefaultShortcutsConfig();
  setShortcutsConfig(defaults);
  return defaults;
};

export const checkShortcutConflicts = (
  key: string,
  excludeActionId?: string
): ShortcutConflict | null => {
  const config = getShortcutsConfig();
  const conflicts: string[] = [];

  Object.entries(config.bindings).forEach(([actionId, binding]) => {
    if (
      binding.key.toLowerCase() === key.toLowerCase() &&
      binding.enabled &&
      actionId !== excludeActionId
    ) {
      conflicts.push(actionId);
    }
  });

  if (conflicts.length > 0) {
    return { key, actions: conflicts };
  }

  return null;
};

export const validateShortcutKey = (key: string): boolean => {
  const parts = key
    .toLowerCase()
    .split("+")
    .map((p) => p.trim());

  if (parts.length < 2) return false;

  const modifiers = ["cmd", "ctrl", "alt", "shift"];
  const hasModifier = parts.some((p) => modifiers.includes(p));
  if (!hasModifier) return false;

  const validKeys = [
    ...modifiers,

    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",

    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",

    "f1",
    "f2",
    "f3",
    "f4",
    "f5",
    "f6",
    "f7",
    "f8",
    "f9",
    "f10",
    "f11",
    "f12",

    "space",
    "return",
    "enter",
    "tab",
    "backspace",
    "delete",
    "esc",
    "escape",
    "up",
    "down",
    "left",
    "right",
    "backslash",
    "slash",
    "comma",
    "period",
    "minus",
    "equal",
    "plus",
    "bracketleft",
    "bracketright",
    "semicolon",
    "quote",
    "grave",
  ];

  return parts.every((p) => validKeys.includes(p));
};

export const formatShortcutKeyForDisplay = (key: string): string => {
  return key
    .split("+")
    .map((part) => {
      const trimmed = part.trim();

      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    })
    .join(" + ");
};

export const getAllShortcutActions = (
  hasLicense: boolean
): ShortcutAction[] => {
  const config = getShortcutsConfig();
  const actions = [...DEFAULT_SHORTCUT_ACTIONS];

  if (hasLicense && config.customActions) {
    actions.push(...config.customActions);
  }

  return actions;
};

export const addCustomShortcutAction = (
  action: ShortcutAction
): ShortcutsConfig => {
  const config = getShortcutsConfig();

  if (!config.customActions) {
    config.customActions = [];
  }

  const existingIndex = config.customActions.findIndex(
    (a) => a.id === action.id
  );
  if (existingIndex >= 0) {
    config.customActions[existingIndex] = action;
  } else {
    config.customActions.push(action);
  }

  config.bindings[action.id] = {
    action: action.id,
    key: getPlatformDefaultKey(action),
    enabled: true,
  };

  setShortcutsConfig(config);
  return config;
};

export const removeCustomShortcutAction = (
  actionId: string
): ShortcutsConfig => {
  const config = getShortcutsConfig();

  if (config.customActions) {
    config.customActions = config.customActions.filter(
      (a) => a.id !== actionId
    );
  }

  delete config.bindings[actionId];

  setShortcutsConfig(config);
  return config;
};

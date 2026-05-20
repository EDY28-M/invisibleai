import { isMacOS } from "./platform";
import {
  getPermissionRestartInstruction,
  getPermissionTargetName,
} from "./permission-target";

export const getScreenRecordingPermissionMessage = async () => {
  const targetName = await getPermissionTargetName();
  const restartInstruction = await getPermissionRestartInstruction();

  return `Screen Recording permission required. Please enable ${targetName} in System Settings > Privacy & Security > Screen & System Audio Recording. If it is already listed, make sure ${targetName} is enabled. ${restartInstruction}`;
};

export const requestScreenRecordingPermissionIfNeeded = async () => {
  if (!isMacOS()) return;

  try {
    const {
      checkScreenRecordingPermission,
      requestScreenRecordingPermission,
    } = await import("tauri-plugin-macos-permissions-api");

    const hasPermission = await checkScreenRecordingPermission();
    if (!hasPermission) {
      await requestScreenRecordingPermission();
    }
  } catch (error) {
    console.debug("Unable to check screen recording permission:", error);
  }
};

export const isScreenRecordingPermissionError = (error: unknown) => {
  if (!isMacOS()) return false;

  const message = String(error instanceof Error ? error.message : error).toLowerCase();

  return (
    message.includes("screen recording") ||
    message.includes("privacy") ||
    message.includes("permission") ||
    message.includes("denied") ||
    message.includes("not authorized") ||
    message.includes("not permitted") ||
    message.includes("failed to get monitors") ||
    message.includes("failed to capture monitor") ||
    message.includes("failed to capture image")
  );
};

export const getScreenCaptureErrorMessage = async (error: unknown) =>
  isScreenRecordingPermissionError(error)
    ? await getScreenRecordingPermissionMessage()
    : "Failed to capture screenshot. Please try again.";

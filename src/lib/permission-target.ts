import { getName } from "@tauri-apps/api/app";

let cachedAppName: string | null = null;

export const getRuntimeAppName = async () => {
  if (cachedAppName) return cachedAppName;

  try {
    const appName = (await getName()).trim();
    cachedAppName = appName || "this app";
  } catch (error) {
    console.debug("Unable to read runtime app name:", error);
    cachedAppName = "this app";
  }

  return cachedAppName;
};

export const getPermissionTargetName = async () => {
  if (import.meta.env.DEV) {
    return "Terminal";
  }

  return getRuntimeAppName();
};

export const getPermissionRestartInstruction = async () => {
  if (import.meta.env.DEV) {
    return "Then quit Terminal, open it again, and restart the dev app.";
  }

  const appName = await getRuntimeAppName();
  return `Then quit and restart ${appName}.`;
};

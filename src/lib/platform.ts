export const getPlatform = (): "macos" | "windows" | "linux" => {

  if ((navigator as any).userAgentData?.platform) {
    const platform = (navigator as any).userAgentData.platform.toLowerCase();
    if (platform.includes("mac")) return "macos";
    if (platform.includes("win")) return "windows";
    return "linux";
  }

  const platform = navigator.platform.toLowerCase();
  if (platform.includes("mac")) return "macos";
  if (platform.includes("win")) return "windows";
  return "linux";
};

export const isMacOS = (): boolean => getPlatform() === "macos";

export const isWindows = (): boolean => getPlatform() === "windows";

export const isLinux = (): boolean => getPlatform() === "linux";

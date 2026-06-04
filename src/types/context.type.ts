import { Dispatch, SetStateAction } from "react";
import { ScreenshotConfig, TYPE_PROVIDER } from "@/types";
import { CursorType, CustomizableState } from "@/lib/storage";

/** Saldo de uso devuelto por el servidor (espeja UsageBalanceInfo del server). */
export interface UsageBalanceInfo {
  licenseType: "free" | "licensed";
  chat: {
    tokensUsedToday:  number;
    tokenLimitPerDay: number;
    remainingToday:   number;
    resetsAt:         string; // ISO — medianoche UTC
  };
  stt: {
    callsUsedToday:  number;
    callLimitPerDay: number | null; // null = ilimitado
    remainingToday:  number | null;
  };
  streaming: {
    credits:           number;
    maxCredits:        number;
    equivalentMinutes: number;
  };
}

export type IContextType = {
  allAiProviders: TYPE_PROVIDER[];
  customAiProviders: TYPE_PROVIDER[];
  selectedAIProvider: {
    provider: string;
    variables: Record<string, string>;
  };
  onSetSelectedAIProvider: ({
    provider,
    variables,
  }: {
    provider: string;
    variables: Record<string, string>;
  }) => void;
  allSttProviders: TYPE_PROVIDER[];
  customSttProviders: TYPE_PROVIDER[];
  selectedSttProvider: {
    provider: string;
    variables: Record<string, string>;
  };
  onSetSelectedSttProvider: ({
    provider,
    variables,
  }: {
    provider: string;
    variables: Record<string, string>;
  }) => void;
  screenshotConfiguration: ScreenshotConfig;
  setScreenshotConfiguration: React.Dispatch<
    React.SetStateAction<ScreenshotConfig>
  >;
  customizable: CustomizableState;
  toggleAppIconVisibility: (isVisible: boolean) => Promise<void>;
  toggleAlwaysOnTop: (isEnabled: boolean) => Promise<void>;
  toggleAutostart: (isEnabled: boolean) => Promise<void>;
  loadData: () => void;
  invisibleaiApiEnabled: boolean;
  setInvisibleAIApiEnabled: (enabled: boolean) => Promise<void>;
  hasActiveLicense: boolean;
  setHasActiveLicense: Dispatch<SetStateAction<boolean>>;
  getActiveLicenseStatus: () => Promise<void>;
  selectedAudioDevices: {
    input: { id: string; name: string };
    output: { id: string; name: string };
  };
  setSelectedAudioDevices: Dispatch<
    SetStateAction<{
      input: { id: string; name: string };
      output: { id: string; name: string };
    }>
  >;
  setCursorType: (type: CursorType) => void;
  toggleContentProtected: (isEnabled: boolean) => Promise<void>;
  supportsImages: boolean;
  setSupportsImages: (value: boolean) => void;
  /** Saldo de uso del dispositivo (null mientras se carga). */
  usageBalance: UsageBalanceInfo | null;
  /** Fuerza un refresh del saldo de uso desde el servidor. */
  refreshUsageBalance: () => Promise<void>;
};

import { Switch, Label, Header } from "@/components";
import { useApp } from "@/contexts";
import { useState, useEffect } from "react";
import { safeLocalStorage } from "@/lib";
import { useTranslation } from "@/hooks";

export const ConversationalMemoryToggle = () => {
  const { hasActiveLicense } = useApp();
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    const savedMemory = safeLocalStorage.getItem("system_audio_use_memory");
    setMemoryEnabled(savedMemory === "true");
  }, []);

  const handleSwitchChange = (checked: boolean) => {
    if (!hasActiveLicense) {
      return;
    }
    setMemoryEnabled(checked);
    safeLocalStorage.setItem("system_audio_use_memory", String(checked));

    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="space-y-4">
      <Header
        title={t("responses_memory_title")}
        description={t("responses_memory_desc")}
      />

      <div className="flex items-center justify-between p-4 border rounded-xl bg-background/50 backdrop-blur-sm relative overflow-hidden group">
        {}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="flex items-center space-x-3 z-10">
          <div>
            <Label className="text-sm font-medium flex items-center gap-2">
              <span>
                {memoryEnabled ? t("responses_memory_enabled") : t("responses_memory_disabled")}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-medium bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-300 border border-violet-500/30 select-none animate-pulse">
                Memory
              </span>
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              {memoryEnabled
                ? t("responses_memory_enabled_desc")
                : t("responses_memory_disabled_desc")}
            </p>
          </div>
        </div>
        <Switch
          checked={memoryEnabled}
          onCheckedChange={handleSwitchChange}
          disabled={!hasActiveLicense}
          title={`Toggle to ${!memoryEnabled ? "enable" : "disable"} conversational memory`}
          aria-label={`Toggle to ${
            memoryEnabled ? "disable" : "enable"
          } conversational memory`}
          className={memoryEnabled ? "bg-gradient-to-r from-violet-600 to-indigo-600" : ""}
        />
      </div>
    </div>
  );
};

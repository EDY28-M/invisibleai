import { Switch } from "@/components";
import { useState, useEffect } from "react";
import { safeLocalStorage } from "@/lib";
import { useTranslation } from "@/hooks";

export const ConversationalMemoryToggle = () => {
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    const savedMemory = safeLocalStorage.getItem("system_audio_use_memory");
    setMemoryEnabled(savedMemory === "true");
  }, []);

  const handleSwitchChange = (checked: boolean) => {
    setMemoryEnabled(checked);
    safeLocalStorage.setItem("system_audio_use_memory", String(checked));
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-bold text-foreground/95 tracking-wide">
            {t("responses_memory_title")}
          </h3>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-foreground/8 text-foreground/40 border border-border/20">
            Memory
          </span>
        </div>
        <p className="text-xs text-muted-foreground/60 mt-1.5 leading-relaxed max-w-lg">
          {memoryEnabled
            ? t("responses_memory_enabled_desc")
            : t("responses_memory_disabled_desc")}
        </p>
      </div>
      <Switch
        checked={memoryEnabled}
        onCheckedChange={handleSwitchChange}
        className="shrink-0"
        aria-label="Toggle conversational memory"
      />
    </div>
  );
};

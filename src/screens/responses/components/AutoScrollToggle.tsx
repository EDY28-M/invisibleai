import { Switch } from "@/components";
import { useApp } from "@/contexts";
import { useState, useEffect } from "react";
import { getResponseSettings, updateAutoScroll } from "@/lib";
import { useTranslation } from "@/hooks";

export const AutoScrollToggle = () => {
  const { hasActiveLicense } = useApp();
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const { t } = useTranslation();

  useEffect(() => {
    const settings = getResponseSettings();
    setAutoScroll(settings.autoScroll);
  }, []);

  const handleSwitchChange = (checked: boolean) => {
    if (!hasActiveLicense) return;
    setAutoScroll(checked);
    updateAutoScroll(checked);
  };

  return (
    <div className="flex items-center justify-between gap-6 h-full">
      <div>
        <h3 className="text-[15px] font-bold text-foreground/95 tracking-wide">
          {t("responses_scroll_title")}
        </h3>
        <p className="text-xs text-muted-foreground/60 mt-1.5 leading-relaxed">
          {autoScroll
            ? t("responses_scroll_enabled_desc")
            : t("responses_scroll_disabled_desc")}
        </p>
      </div>
      <Switch
        checked={autoScroll}
        onCheckedChange={handleSwitchChange}
        disabled={!hasActiveLicense}
        className="shrink-0"
        aria-label="Toggle auto-scroll"
      />
    </div>
  );
};

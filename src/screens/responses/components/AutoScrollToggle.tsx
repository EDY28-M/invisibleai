import { Switch, Label, Header } from "@/components";
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
    if (!hasActiveLicense) {
      return;
    }
    setAutoScroll(checked);
    updateAutoScroll(checked);
  };

  return (
    <div className="space-y-4">
      <Header
        title={t("responses_scroll_title")}
        description={t("responses_scroll_desc")}
      />

      <div className="flex items-center justify-between p-4 border rounded-xl">
        <div className="flex items-center space-x-3">
          <div>
            <Label className="text-sm font-medium">
              {autoScroll ? t("responses_scroll_enabled") : t("responses_scroll_disabled")}
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              {autoScroll
                ? t("responses_scroll_enabled_desc")
                : t("responses_scroll_disabled_desc")}
            </p>
          </div>
        </div>
        <Switch
          checked={autoScroll}
          onCheckedChange={handleSwitchChange}
          disabled={!hasActiveLicense}
          title={`Toggle to ${!autoScroll ? "enable" : "disable"} auto-scroll`}
          aria-label={`Toggle to ${
            autoScroll ? "disable" : "enable"
          } auto-scroll`}
        />
      </div>
    </div>
  );
};

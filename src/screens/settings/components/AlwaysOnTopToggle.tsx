import { Switch, Header } from "@/components";
import { useApp } from "@/contexts";
import { useTranslation } from "@/hooks";

interface AlwaysOnTopToggleProps {
  className?: string;
}

export const AlwaysOnTopToggle = ({ className }: AlwaysOnTopToggleProps) => {
  const { customizable, toggleAlwaysOnTop } = useApp();
  const { t } = useTranslation();

  const handleSwitchChange = async (checked: boolean) => {
    await toggleAlwaysOnTop(checked);
  };

  return (
    <div id="always-on-top" className={className}>
      <Header
        title={t("settings_always_on_top_title")}
        description={t("settings_always_on_top_desc")}
        rightSlot={
          <Switch
            checked={customizable.alwaysOnTop.isEnabled}
            onCheckedChange={handleSwitchChange}
            title={`Toggle to ${
              !customizable.alwaysOnTop.isEnabled ? "Enabled" : "Disabled"
            } always on top`}
            aria-label={`Toggle to ${
              customizable.alwaysOnTop.isEnabled ? "Enabled" : "Disabled"
            } always on top`}
          />
        }
      />
    </div>
  );
};

import { Switch, Label, Header } from "@/components";
import { useApp } from "@/contexts";
import { useTranslation } from "@/hooks";

interface AutostartToggleProps {
  className?: string;
}

export const AutostartToggle = ({ className }: AutostartToggleProps) => {
  const { customizable, toggleAutostart } = useApp();
  const { t } = useTranslation();

  const isEnabled = customizable?.autostart?.isEnabled ?? true;

  const handleSwitchChange = async (checked: boolean) => {
    await toggleAutostart(checked);
  };

  return (
    <div id="autostart" className={className}>
      <Header
        title={t("settings_startup_title")}
        description={t("settings_startup_desc")}
        rightSlot={
          <Switch
            checked={isEnabled}
            onCheckedChange={handleSwitchChange}
            aria-label="Toggle autostart"
          />
        }
      />
    </div>
  );
};

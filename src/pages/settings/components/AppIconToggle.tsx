import { Switch, Label, Header } from "@/components";
import { useApp } from "@/contexts";
import { useTranslation } from "@/hooks";

interface AppIconToggleProps {
  className?: string;
}

export const AppIconToggle = ({ className }: AppIconToggleProps) => {
  const { customizable, toggleAppIconVisibility } = useApp();
  const { t } = useTranslation();

  const handleSwitchChange = async (checked: boolean) => {
    await toggleAppIconVisibility(checked);
  };

  return (
    <div id="app-icon" className={className}>
      <Header
        title={t("settings_icon_title")}
        description={t("settings_icon_desc")}
        rightSlot={
          <Switch
            checked={customizable.appIcon.isVisible}
            onCheckedChange={handleSwitchChange}
            aria-label="Toggle app icon visibility"
          />
        }
      />
    </div>
  );
};

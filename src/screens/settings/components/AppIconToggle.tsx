import { Switch } from "@/components";
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
    <div id="app-icon" className={`flex items-center justify-between gap-6 ${className ?? ""}`}>
      <div>
        <h3 className="text-[15px] font-bold text-foreground/95 tracking-wide">
          {t("settings_icon_title")}
        </h3>
        <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">
          {t("settings_icon_desc")}
        </p>
      </div>
      <Switch
        checked={customizable.appIcon.isVisible}
        onCheckedChange={handleSwitchChange}
        className="shrink-0"
        aria-label="Toggle app icon visibility"
      />
    </div>
  );
};

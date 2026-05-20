import { Switch } from "@/components";
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
    <div id="autostart" className={`flex items-center justify-between gap-6 ${className ?? ""}`}>
      <div>
        <h3 className="text-[15px] font-bold text-foreground/95 tracking-wide">
          {t("settings_startup_title")}
        </h3>
        <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">
          {t("settings_startup_desc")}
        </p>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={handleSwitchChange}
        className="shrink-0"
        aria-label="Toggle autostart"
      />
    </div>
  );
};

import { Switch } from "@/components";
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
    <div id="always-on-top" className={`flex items-center justify-between gap-6 ${className ?? ""}`}>
      <div>
        <h3 className="text-[15px] font-bold text-foreground/95 tracking-wide">
          {t("settings_always_on_top_title")}
        </h3>
        <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">
          {t("settings_always_on_top_desc")}
        </p>
      </div>
      <Switch
        checked={customizable.alwaysOnTop.isEnabled}
        onCheckedChange={handleSwitchChange}
        className="shrink-0"
        aria-label="Toggle always on top"
      />
    </div>
  );
};

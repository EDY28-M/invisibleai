import { Switch } from "@/components";
import { useApp } from "@/contexts";
import { useTranslation } from "@/hooks";

interface StealthModeToggleProps {
  className?: string;
}

export const StealthModeToggle = ({ className }: StealthModeToggleProps) => {
  const { customizable, toggleContentProtected, hasActiveLicense } = useApp();
  const { t } = useTranslation();

  const handleSwitchChange = async (checked: boolean) => {
    await toggleContentProtected(checked);
  };

  return (
    <div
      id="stealth-mode"
      className={`flex items-center justify-between gap-6 ${className ?? ""} ${
        hasActiveLicense ? "" : "opacity-50 pointer-events-none"
      }`}
    >
      <div>
        <h3 className="text-[15px] font-bold text-foreground/95 tracking-wide">
          {t("settings_stealth_title")}
        </h3>
        <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">
          {t("settings_stealth_desc")}
        </p>
      </div>
      <Switch
        checked={customizable.contentProtected.isEnabled}
        onCheckedChange={handleSwitchChange}
        className="shrink-0"
        aria-label="Toggle stealth mode"
      />
    </div>
  );
};

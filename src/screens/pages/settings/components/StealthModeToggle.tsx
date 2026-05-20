import { Switch, Header } from "@/components";
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
      className={`${className ?? ""} ${
        hasActiveLicense ? "" : "opacity-60 pointer-events-none"
      }`}
    >
      <Header
        title={t("settings_stealth_title")}
        description={t("settings_stealth_desc")}
        rightSlot={
          <Switch
            checked={customizable.contentProtected.isEnabled}
            onCheckedChange={handleSwitchChange}
            aria-label="Toggle stealth mode"
          />
        }
      />
    </div>
  );
};

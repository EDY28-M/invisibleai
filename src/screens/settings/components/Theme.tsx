import { useApp, useTheme } from "@/contexts";
import { Slider, Button } from "@/components";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslation } from "@/hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components";

const themeOptions = [
  { id: "light", icon: SunIcon },
  { id: "dark",  icon: MoonIcon },
  { id: "system", icon: MonitorIcon },
];

export const Theme = () => {
  const { theme, transparency, setTheme, onSetTransparency } = useTheme();
  const { hasActiveLicense } = useApp();
  const { t } = useTranslation();

  const CurrentIcon =
    theme === "system" ? MonitorIcon : theme === "light" ? SunIcon : MoonIcon;

  return (
    <div id="theme" className="space-y-6">
      {/* Theme selector */}
      <div className="flex items-center justify-between gap-6">
        <div>
          <h3 className="text-[15px] font-bold text-foreground/95 tracking-wide">
            {t("settings_theme_title")}
            {!hasActiveLicense && (
              <span className="ml-2 text-[11px] normal-case font-normal text-muted-foreground/50">
                {t("settings_theme_license_warning")}
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {theme === "light"
              ? t("settings_theme_light_desc")
              : t("settings_theme_dark_desc")}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl border border-border/25 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all"
            >
              <CurrentIcon className="h-5 w-5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl border border-border/30">
            {themeOptions.map(({ id, icon: Icon }) => (
              <DropdownMenuItem
                key={id}
                onClick={() => setTheme(id as "light" | "dark" | "system")}
                className="flex items-center gap-2 rounded-xl"
              >
                <Icon className="size-3.5 opacity-60" />
                {id === "light"
                  ? t("settings_theme_light")
                  : id === "dark"
                  ? t("settings_theme_dark")
                  : t("settings_theme_system")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Transparency slider */}
      <div
        className={`space-y-3 pt-4 border-t border-border/10 ${
          hasActiveLicense ? "" : "opacity-50 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-foreground/95 tracking-wide">
              {t("settings_theme_transparency")}
            </h3>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {t("settings_theme_transparency_desc")}
            </p>
          </div>
          <span className="text-sm font-bold text-foreground/40 tabular-nums">
            {transparency}%
          </span>
        </div>
        <Slider
          value={[transparency]}
          onValueChange={(value: number[]) => onSetTransparency(value[0])}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground/40 mt-1">
          {t("settings_theme_transparency_tip")}
        </p>
      </div>
    </div>
  );
};

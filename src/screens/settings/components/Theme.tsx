import { useApp, useTheme } from "@/contexts";
import { Header, Label, Slider, Button } from "@/components";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslation } from "@/hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components";

export const Theme = () => {
  const { theme, transparency, setTheme, onSetTransparency } = useTheme();
  const { hasActiveLicense } = useApp();
  const { t } = useTranslation();

  return (
    <div id="theme" className="relative space-y-3">
      <Header
        title={`${t("settings_theme_title")}${
          hasActiveLicense
            ? ""
            : t("settings_theme_license_warning")
        }`}
        description={t("settings_theme_desc")}
      />

      {}
      <div
        className={`space-y-2 ${
          hasActiveLicense ? "" : "opacity-60 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                {theme === "system" ? (
                  <>
                    <MonitorIcon className="h-4 w-4" />
                    {t("settings_theme_system")}
                  </>
                ) : theme === "light" ? (
                  <>
                    <SunIcon className="h-4 w-4" />
                    {t("settings_theme_light")}
                  </>
                ) : (
                  <>
                    <MoonIcon className="h-4 w-4" />
                    {t("settings_theme_dark")}
                  </>
                )}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {theme === "light"
                  ? t("settings_theme_light_desc")
                  : t("settings_theme_dark_desc")}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                {theme === "system" ? (
                  <MonitorIcon className="h-[1.2rem] w-[1.2rem]" />
                ) : (
                  <>
                    <SunIcon className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                    <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                {t("settings_theme_light")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                {t("settings_theme_dark")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                {t("settings_theme_system")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {}
      <div
        className={`space-y-2 ${
          hasActiveLicense ? "" : "opacity-60 pointer-events-none"
        }`}
      >
        <Header
          title={t("settings_theme_transparency")}
          description={t("settings_theme_transparency_desc")}
        />
        <div className="space-y-3">
          <div className="flex items-center gap-4 mt-4">
            <Slider
              value={[transparency]}
              onValueChange={(value: number[]) => onSetTransparency(value[0])}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>

          <p className="text-xs text-muted-foreground/70">
            {t("settings_theme_transparency_tip")}
          </p>
        </div>
      </div>
    </div>
  );
};

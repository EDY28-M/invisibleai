import {
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Header,
} from "@/components";
import { UseSettingsReturn } from "@/types";
import { LaptopMinimalIcon, MousePointer2Icon } from "lucide-react";
import { useTranslation } from "@/hooks";

export const ScreenshotConfigs = ({
  screenshotConfiguration,
  handleScreenshotModeChange,
  handleScreenshotPromptChange,
  handleScreenshotEnabledChange,
  hasActiveLicense,
}: UseSettingsReturn) => {
  const { t } = useTranslation();

  return (
    <div id="screenshot" className="space-y-3">
      <div className="space-y-3">
        {}
        <div className="space-y-2">
          <div className="flex flex-col">
            <Header
              title={t("screenshot_method_title")}
              description={
                screenshotConfiguration.enabled
                  ? t("screenshot_method_screenshot_desc")
                  : t("screenshot_method_selection_desc")
              }
            />
          </div>
          <Select
            value={screenshotConfiguration.enabled ? "screenshot" : "selection"}
            onValueChange={(value) =>
              handleScreenshotEnabledChange(value === "screenshot")
            }
          >
            <SelectTrigger className="w-full h-11 border-1 border-input/50 focus:border-primary/50 transition-colors">
              <div className="flex items-center gap-2">
                {screenshotConfiguration.enabled ? (
                  <LaptopMinimalIcon className="size-4" />
                ) : (
                  <MousePointer2Icon className="size-4" />
                )}
                <div className="text-sm font-medium">
                  {screenshotConfiguration.enabled
                    ? t("screenshot_method_screenshot_mode")
                    : t("screenshot_method_selection_mode")}
                </div>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="selection" disabled={!hasActiveLicense}>
                <div className="flex items-center gap-2">
                  <MousePointer2Icon className="size-4" />
                  <div className="font-medium">{t("screenshot_method_selection_mode")}</div>
                  {!hasActiveLicense && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {t("screenshot_method_license_required")}
                    </span>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="screenshot" className="flex flex-row gap-2">
                <LaptopMinimalIcon className="size-4" />
                <div className="font-medium">{t("screenshot_method_screenshot_mode")}</div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {}
        <div className="space-y-2">
          <div className="flex flex-col">
            <Header
              title={t("screenshot_proc_title")}
              description={
                screenshotConfiguration.mode === "manual"
                  ? t("screenshot_proc_manual_desc")
                  : t("screenshot_proc_auto_desc")
              }
            />
          </div>
          <Select
            value={screenshotConfiguration.mode}
            onValueChange={handleScreenshotModeChange}
          >
            <SelectTrigger className="w-full h-11 border-1 border-input/50 focus:border-primary/50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">
                  {screenshotConfiguration.mode === "auto"
                    ? t("screenshot_proc_auto_mode")
                    : t("screenshot_proc_manual_mode")}
                </div>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">
                <div className="font-medium">{t("screenshot_proc_manual_mode")}</div>
              </SelectItem>
              <SelectItem value="auto">
                <div className="font-medium">{t("screenshot_proc_auto_mode")}</div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {}
        {screenshotConfiguration.mode === "auto" && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("screenshot_auto_prompt_label")}</Label>
            <Input
              placeholder={t("screenshot_auto_prompt_placeholder")}
              value={screenshotConfiguration.autoPrompt}
              onChange={(e) => handleScreenshotPromptChange(e.target.value)}
              className="w-full h-11 border-1 border-input/50 focus:border-primary/50 transition-colors"
            />
            <p className="text-xs text-muted-foreground">
              {t("screenshot_auto_prompt_help")}
            </p>
          </div>
        )}
      </div>

      {}
      <div className="text-xs text-muted-foreground/70">
        <p>
          {t("screenshot_tip")}
        </p>
      </div>
    </div>
  );
};

import {
  Theme,
  AlwaysOnTopToggle,
  AppIconToggle,
  AutostartToggle,
  LanguageToggle,
  StealthModeToggle,
} from "./components";
import { useTranslation } from "@/hooks";
import { PageLayout } from "@/layouts";

const Settings = () => {
  const { t, language } = useTranslation();

  return (
    <PageLayout title={t("settings_title")} description={t("settings_desc")}>
      <section className="grid gap-4">
        <div className="rounded-xl bg-card p-6 shadow-sm shadow-black/5">
          <div className="mb-5 flex items-center justify-between border-b border-border/70 pb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
              {language === "spanish" ? "Apariencia" : "Appearance"}
            </h2>
            <span className="text-xs text-muted-foreground">01</span>
          </div>
          <div className="space-y-6">
            <Theme />
            <LanguageToggle />
          </div>
        </div>

        <div className="rounded-xl bg-card p-6 shadow-sm shadow-black/5">
          <div className="mb-5 flex items-center justify-between border-b border-border/70 pb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
              {language === "spanish"
                ? "Comportamiento de ventana"
                : "Window Behavior"}
            </h2>
            <span className="text-xs text-muted-foreground">02</span>
          </div>
          <div className="grid gap-6">
            <AutostartToggle />
            <AppIconToggle />
            <AlwaysOnTopToggle />
            <StealthModeToggle />
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Settings;

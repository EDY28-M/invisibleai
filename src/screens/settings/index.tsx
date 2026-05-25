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

const cardClass =
  "relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden";

const Settings = () => {
  const { t } = useTranslation();

  return (
    <PageLayout title={t("settings_title")} description={t("settings_desc")}>
      <div id="settings" className="space-y-5 w-full max-w-5xl mx-auto p-1">

        <div className={cardClass}>
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-violet-500/8 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-6">
            <div className="pb-3 border-b border-border/10">
              <span className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground/35">
                Apariencia
              </span>
            </div>
            <Theme />
            <div className="pt-4 border-t border-border/10">
              <LanguageToggle />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className={cardClass}>
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <AutostartToggle />
            </div>
          </div>
          <div className={cardClass}>
            <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <AppIconToggle />
            </div>
          </div>
          <div className={cardClass}>
            <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <AlwaysOnTopToggle />
            </div>
          </div>
          <div className={cardClass}>
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-zinc-500/8 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <StealthModeToggle />
            </div>
          </div>
        </div>

      </div>
    </PageLayout>
  );
};

export default Settings;

import { useTranslation } from "@/hooks";
import { Header } from "@/components";
import { CheckIcon } from "lucide-react";

export const LanguageToggle = () => {
  const { t, language, changeLanguage } = useTranslation();

  const isSpanish = language === "spanish";
  const isEnglish = language === "english";

  return (
    <div id="language" className="relative space-y-3">
      <Header
        title={t("settings_language_title")}
        description={t("settings_language_desc")}
      />

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => changeLanguage("spanish")}
          className={`flex items-center gap-3 flex-1 rounded-lg border p-3 transition-all duration-200 text-left ${
            isSpanish
              ? "border-primary bg-primary/5 dark:bg-primary/10"
              : "border-input/50 bg-black/5 dark:bg-white/5 hover:border-primary/40 hover:bg-primary/5"
          }`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground">
            ES
          </span>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${isSpanish ? "text-primary" : ""}`}>
              {t("settings_language_spanish")}
            </p>
            <p className="text-xs text-muted-foreground">Español</p>
          </div>
          {isSpanish && (
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              <CheckIcon className="size-3.5" />
              {t("settings_language_active")}
            </div>
          )}
        </button>

        <button
          onClick={() => changeLanguage("english")}
          className={`flex items-center gap-3 flex-1 rounded-lg border p-3 transition-all duration-200 text-left ${
            isEnglish
              ? "border-primary bg-primary/5 dark:bg-primary/10"
              : "border-input/50 bg-black/5 dark:bg-white/5 hover:border-primary/40 hover:bg-primary/5"
          }`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground">
            EN
          </span>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${isEnglish ? "text-primary" : ""}`}>
              {t("settings_language_english")}
            </p>
            <p className="text-xs text-muted-foreground">English</p>
          </div>
          {isEnglish && (
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              <CheckIcon className="size-3.5" />
              {t("settings_language_active")}
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

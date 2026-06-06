import { useTranslation } from "@/hooks";
import { CheckIcon } from "lucide-react";

export const LanguageToggle = () => {
  const { t, language, changeLanguage } = useTranslation();

  const isSpanish = language === "spanish";
  const isEnglish = language === "english";

  return (
    <div id="language" className="space-y-3">
      <div>
        <h3 className="text-[15px] font-bold text-foreground/95 tracking-wide">
          {t("settings_language_title")}
        </h3>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {t("settings_language_desc")}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => changeLanguage("english")}
          className={`flex items-center gap-3 flex-1 rounded-2xl border p-3.5 transition-all duration-200 text-left ${
            isEnglish
              ? "border-border/30 bg-card/50 shadow-sm"
              : "border-border/15 bg-card/15 hover:bg-card/30 hover:border-border/25"
          }`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/20 bg-muted/30 text-xs font-bold text-foreground/70">
            EN
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-foreground/90">
              {t("settings_language_english")}
            </p>
            <p className="text-xs text-muted-foreground/50">English</p>
          </div>
          {isEnglish && <CheckIcon className="size-4 text-foreground/40 shrink-0" />}
        </button>

        <button
          onClick={() => changeLanguage("spanish")}
          className={`flex items-center gap-3 flex-1 rounded-2xl border p-3.5 transition-all duration-200 text-left ${
            isSpanish
              ? "border-border/30 bg-card/50 shadow-sm"
              : "border-border/15 bg-card/15 hover:bg-card/30 hover:border-border/25"
          }`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/20 bg-muted/30 text-xs font-bold text-foreground/70">
            ES
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-foreground/90">
              {t("settings_language_spanish")}
            </p>
            <p className="text-xs text-muted-foreground/50">Español</p>
          </div>
          {isSpanish && <CheckIcon className="size-4 text-foreground/40 shrink-0" />}
        </button>
      </div>
    </div>
  );
};

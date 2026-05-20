import { Header, Selection } from "@/components";
import { LANGUAGES } from "@/lib";
import { useApp } from "@/contexts";
import { useMemo } from "react";
import { useTranslation } from "@/hooks";

export const LanguageSelector = () => {
  const { hasActiveLicense } = useApp();
  const { language, changeLanguage, t } = useTranslation();

  const handleLanguageChange = (languageId: string) => {
    if (!hasActiveLicense) {
      return;
    }
    changeLanguage(languageId);
  };

  const languageOptions = useMemo(() => {
    return LANGUAGES.map((lang) => ({
      label: `${lang.flag} ${lang.name}`,
      value: lang.id,
    }));
  }, []);

  return (
    <div className="space-y-4">
      <Header
        title={t("responses_lang_title")}
        description={t("responses_lang_desc")}
      />

      <div className="max-w-md">
        <Selection
          selected={language}
          onChange={handleLanguageChange}
          options={languageOptions}
          placeholder={t("responses_lang_placeholder")}
          disabled={!hasActiveLicense}
        />
      </div>
    </div>
  );
};

import { Header, Selection } from "@/components";
import { LANGUAGES } from "@/lib";
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "@/hooks";
import { getResponseSettings, updateLanguage } from "@/lib/storage/response-settings.storage";

export const LanguageSelector = () => {
  const { t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<string>("spanish");

  useEffect(() => {
    const settings = getResponseSettings();
    setSelectedLang(settings.language);
  }, []);

  const handleLanguageChange = (languageId: string) => {
    setSelectedLang(languageId);
    updateLanguage(languageId);
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
          selected={selectedLang}
          onChange={handleLanguageChange}
          options={languageOptions}
          placeholder={t("responses_lang_placeholder")}
        />
      </div>
    </div>
  );
};

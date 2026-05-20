import { useLanguage } from "@/contexts/language.context";

export const useTranslation = () => {
  const { language, changeLanguage, t } = useLanguage();
  return { language, changeLanguage, t };
};

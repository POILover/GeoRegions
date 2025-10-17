import { ref } from "vue";
import { loadLanguage, setLanguage as setLocalLanguage } from "../storage/language";
import type { LanguageCode } from "../language";

export const useLanguage = () => {
  const language = ref<LanguageCode>(loadLanguage());
  const setLanguage = (lang: LanguageCode) => {
    language.value = lang;
    setLocalLanguage(lang);
  }
  return { language, setLanguage };
}
import { loadLocalStorage, saveLocalStorage } from "./storage";

export const LANGUAGE_KEY = {
    EN: { name: "English", suffix: "en" },
    ZH: { name: "中文", suffix: "zh" },
} as const;

export type LanguageCode = keyof typeof LANGUAGE_KEY;

const LANGUAGE_STORAGE_KEY = "geo-regions-language";
const DEFAULT_LANGUAGE: LanguageCode = "EN";

export const loadLanguage = (): LanguageCode => {
    return loadLocalStorage(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE;
}
export const setLanguage = (lang: LanguageCode): void => {
    saveLocalStorage(LANGUAGE_STORAGE_KEY, lang);
}
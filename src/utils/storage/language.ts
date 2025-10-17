import { DEFAULT_LANGUAGE, type LanguageCode } from "../language";
import { loadLocalStorage, saveLocalStorage } from "./storage";

const LANGUAGE_STORAGE_KEY = "geo-regions-language";

export const loadLanguage = (): LanguageCode => {
    return loadLocalStorage(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE;
}
export const setLanguage = (lang: LanguageCode): void => {
    saveLocalStorage(LANGUAGE_STORAGE_KEY, lang);
}
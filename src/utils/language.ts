export const LANGUAGE_KEY = {
  EN: { name: "English", suffix: "en" },
  ZH: { name: "中文", suffix: "zh" },
} as const;

export type LanguageCode = keyof typeof LANGUAGE_KEY;
export const DEFAULT_LANGUAGE: LanguageCode = "EN";
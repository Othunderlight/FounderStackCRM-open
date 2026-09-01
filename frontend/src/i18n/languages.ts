export type Language = "en" | "ar";

export const languages: Record<Language, { name: string; nativeName: string; dir: "ltr" | "rtl" }> = {
  en: {
    name: "English",
    nativeName: "English",
    dir: "ltr",
  },
  ar: {
    name: "Arabic",
    nativeName: "العربية",
    dir: "rtl",
  },
};

export const defaultLanguage: Language = "en";

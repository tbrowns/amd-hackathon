"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { t, type TranslationKey } from "@/lib/i18n";
import type { Language } from "@/lib/types";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  tr: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANGUAGE_KEY = "shambalens.language.v1";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);
    if (stored === "en" || stored === "sw") {
      // Reading browser preferences after mount avoids an SSR hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      updateLanguage(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    updateLanguage(nextLanguage);
    window.localStorage.setItem(LANGUAGE_KEY, nextLanguage);
    document.documentElement.lang = nextLanguage;
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, tr: (key: TranslationKey) => t(language, key) }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

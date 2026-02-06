"use client";

import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/i18n";

function isSupportedLanguage(v: string): v is SupportedLanguage {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_LANGUAGES, v);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initLanguage = async () => {
      if (!i18n.isInitialized) {
        await i18n.init();
      }

      const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      let targetLanguage = i18n.language || "zh-CN";

      if (saved && isSupportedLanguage(saved)) {
        targetLanguage = saved;
      } else {
        const nav = navigator.language;
        if (isSupportedLanguage(nav)) {
          targetLanguage = nav;
        } else {
          const base = nav.split("-")[0];
          if (base === "zh") {
            targetLanguage = "zh-CN";
          } else if (isSupportedLanguage(base)) {
            targetLanguage = base;
          }
        }
      }

      if (targetLanguage !== i18n.language) {
        await i18n.changeLanguage(targetLanguage);
      }
      
      // 立即设置 HTML lang 属性
      document.documentElement.lang = targetLanguage;
      setIsReady(true);
    };

    initLanguage();

    const onChanged = (lng: string) => {
      document.documentElement.lang = lng;
      if (isSupportedLanguage(lng)) {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
      }
    };

    i18n.on("languageChanged", onChanged);
    return () => {
      i18n.off("languageChanged", onChanged);
    };
  }, []);

  if (!isReady) {
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

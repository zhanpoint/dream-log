"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/i18n";

function isSupportedLanguage(v: string): v is SupportedLanguage {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_LANGUAGES, v);
}

// 在模块加载时同步初始化语言（避免 useEffect 延迟导致的空白闪烁）
function initLanguageSync() {
  if (typeof window === "undefined") return;
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    let targetLanguage = "zh-CN";

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
      i18n.changeLanguage(targetLanguage);
    }
    document.documentElement.lang = targetLanguage;
  } catch {
    // 忽略错误，使用默认语言
  }
}

// 立即执行，不等待 React 挂载
initLanguageSync();

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
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

  // 直接渲染子组件，不再有 isReady 门控
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

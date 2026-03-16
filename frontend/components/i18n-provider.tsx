"use client";

import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/i18n";
import { TOKEN_KEYS } from "@/lib/api";
import { userAPI, type PreferredLocale } from "@/lib/user-api";

function isSupportedLanguage(v: string): v is SupportedLanguage {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_LANGUAGES, v);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    // 注意：不要在模块加载阶段读取 localStorage 并切换语言，否则会导致 SSR/CSR 首屏不一致触发 hydration error。
    // 这里在 hydration 完成后再切换语言，避免首屏 HTML mismatch。
    const syncLanguage = async () => {
      try {
        const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && isSupportedLanguage(saved) && saved !== i18n.language) {
          await i18n.changeLanguage(saved);
        }
        document.documentElement.lang = i18n.language;
      } catch {
        // 忽略错误，使用默认语言
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    };

    void syncLanguage();

    const onChanged = (lng: string) => {
      document.documentElement.lang = lng;
      if (isSupportedLanguage(lng)) {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
        // 同步到后端：让“定时周报”也能按用户语言生成
        // 仅在登录态（有 access_token）时同步；失败不影响前端切换体验
        const token = window.localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
        if (token) {
          void userAPI
            .setPreferredLocale(lng as PreferredLocale)
            .catch(() => undefined);
        }
      }
    };

    i18n.on("languageChanged", onChanged);
    return () => {
      mounted = false;
      i18n.off("languageChanged", onChanged);
    };
  }, []);

  if (!ready) return null;

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

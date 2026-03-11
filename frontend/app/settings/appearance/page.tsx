"use client";

import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { SUPPORTED_LANGUAGES } from "@/i18n";

export default function AppearancePage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("settings.appearance.title")}</h1>
        <p className="text-muted-foreground">
          {t("settings.appearance.subtitle")}
        </p>
      </div>

      {/* 主题设置 */}
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">
          {t("settings.appearance.theme")}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {["light", "dark", "system"].map((themeOption) => (
            <button
              key={themeOption}
              onClick={() => setTheme(themeOption)}
              className={`border-2 rounded-lg p-4 transition-colors ${
                theme === themeOption
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-medium capitalize">
                {t(`settings.appearance.theme${themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}`)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 语言设置 */}
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">
          {t("settings.appearance.language")}
        </h2>
        <div className="space-y-2">
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, { nativeName }]) => (
            <button
              key={code}
              onClick={() => i18n.changeLanguage(code)}
              className={`w-full text-left border-2 rounded-lg p-4 transition-colors ${
                i18n.language === code
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-medium">{nativeName}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

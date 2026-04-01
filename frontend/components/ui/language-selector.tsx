"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FlagIcon } from "@/components/ui/flag-icon";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

const ORDER: SupportedLanguage[] = ["cn", "en", "ja"];

export function LanguageSelector({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language) as string;

  const normalized: SupportedLanguage = ((): SupportedLanguage => {
    if (current in SUPPORTED_LANGUAGES) return current as SupportedLanguage;
    const base = current.split("-")[0];
    if (base in SUPPORTED_LANGUAGES) return base as SupportedLanguage;
    return "cn";
  })();

  // 避免 SSR/CSR 初始语言不一致导致 hydration mismatch
  if (!mounted) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id="language-selector-trigger"
          variant="ghost"
          size="icon"
          className={`navbar-language-selector ${className}`}
          aria-label={t("settings.appearance.language")}
        >
          <FlagIcon
            countryCode={normalized}
            size="md"
            className="flag-hover-scale"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        {ORDER.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => i18n.changeLanguage(code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FlagIcon countryCode={code} size="sm" />
              <span className="text-sm font-medium">
                {SUPPORTED_LANGUAGES[code].nativeName}
              </span>
            </div>
            {code === normalized && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

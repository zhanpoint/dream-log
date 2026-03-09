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

const ORDER: SupportedLanguage[] = ["zh-CN", "en", "ja"];

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language) as string;

  const normalized: SupportedLanguage = ((): SupportedLanguage => {
    if (current in SUPPORTED_LANGUAGES) return current as SupportedLanguage;
    const base = current.split("-")[0];
    if (base in SUPPORTED_LANGUAGES) return base as SupportedLanguage;
    return "zh-CN";
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id="language-selector-trigger"
          variant="ghost"
          size="icon"
          className={`navbar-language-selector ${className}`}
          aria-label="切换语言"
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

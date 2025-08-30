import React, { useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FlagIcon } from '@/components/ui/flag-icon';
import { useI18nContext } from '@/contexts/I18nContext';

/**
 * 简化的语言选择器组件
 */
export const LanguageSelector = ({
    variant = 'default',
    size = 'sm',
    showFlag = true,
    showName = false,
    className = ''
}) => {
    const { i18n, currentLanguage, changeLanguage, isChangingLanguage, supportedLanguages } = useI18nContext();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={variant}
                    size={size}
                    className={`language-selector navbar-language-selector ${className}`}
                    disabled={isChangingLanguage}
                >
                    {showFlag ? (
                        <FlagIcon
                            countryCode={i18n.language}
                            size="md"
                            className="flag-hover-scale"
                        />
                    ) : (
                        <Languages className="h-4 w-4" />
                    )}
                    {showName && (
                        <span className="ml-1 text-xs">
                            {currentLanguage.nativeName}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
                {Object.entries(supportedLanguages).map(([code, config]) => (
                    <DropdownMenuItem
                        key={code}
                        onClick={() => changeLanguage(code)}
                        className="flex items-center justify-between cursor-pointer"
                        disabled={isChangingLanguage}
                    >
                        <div className="flex items-center gap-3">
                            <FlagIcon
                                countryCode={code}
                                size="sm"
                            />
                            <span className="text-sm font-medium">{config.nativeName}</span>
                        </div>
                        {code === i18n.language && (
                            <Check className="h-4 w-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default LanguageSelector;

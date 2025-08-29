import React, { useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
                    className={`language-selector ${className}`}
                    disabled={isChangingLanguage}
                >
                    <Languages className="h-4 w-4" />
                    {showFlag && (
                        <span className="ml-1 text-sm">
                            {currentLanguage.flag}
                        </span>
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
                        <div className="flex items-center gap-2">
                            <span className="text-base">
                                {config.flag}
                            </span>
                            <span className="text-sm">{config.nativeName}</span>
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

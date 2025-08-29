import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useI18nContext } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * 认证页面专用的轻量级语言切换器
 * 简洁的设计，适合放在认证页面的头部
 */
export function AuthLanguageSwitcher() {
    const { t, currentLanguage, supportedLanguages, changeLanguage } = useI18nContext();
    const [isChanging, setIsChanging] = useState(false);

    /**
     * 处理语言切换
     */
    const handleLanguageChange = async (languageCode) => {
        if (languageCode === currentLanguage || isChanging) return;

        setIsChanging(true);
        try {
            await changeLanguage(languageCode);
        } catch (error) {
            console.error('语言切换失败:', error);
        } finally {
            setIsChanging(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 gap-2 text-muted-foreground hover:text-foreground"
                    disabled={isChanging}
                >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">
                        {currentLanguage?.nativeName || '中文'}
                    </span>
                    <span className="sm:hidden">
                        {currentLanguage?.flag || '🇨🇳'}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-[180px]"
            >
                {Object.entries(supportedLanguages).map(([code, config]) => (
                    <DropdownMenuItem
                        key={code}
                        onClick={() => handleLanguageChange(code)}
                        className="flex items-center gap-3 cursor-pointer"
                        disabled={isChanging}
                    >
                        <span className="text-lg">{config.flag}</span>
                        <div className="flex flex-col">
                            <span className="font-medium text-sm">
                                {config.nativeName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {config.name}
                            </span>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default AuthLanguageSwitcher;

import React, { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import './css/theme-toggle.css';

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const themes = [
        {
            value: 'light',
            label: '浅色',
            icon: Sun,
            description: '明亮清晰的界面'
        },
        {
            value: 'dark',
            label: '深色',
            icon: Moon,
            description: '舒适护眼的暗色界面'
        },
        {
            value: 'system',
            label: '跟随系统',
            icon: Monitor,
            description: '自动适应系统设置'
        }
    ];

    const getCurrentThemeIcon = () => {
        const currentTheme = themes.find(t => t.value === theme);
        const IconComponent = currentTheme?.icon || Monitor;
        return <IconComponent className="h-4 w-4" />;
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="theme-toggle-btn relative overflow-hidden"
                    aria-label="切换主题"
                >
                    <div className="theme-icon-container">
                        {getCurrentThemeIcon()}
                    </div>
                    <span className="sr-only">切换主题</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="theme-dropdown-content"
                sideOffset={8}
            >
                {themes.map((themeOption) => {
                    const IconComponent = themeOption.icon;
                    return (
                        <DropdownMenuItem
                            key={themeOption.value}
                            onClick={() => setTheme(themeOption.value)}
                            className={`theme-option ${theme === themeOption.value ? 'active' : ''}`}
                        >
                            <div className="theme-option-content">
                                <div className="theme-option-header">
                                    <IconComponent className="h-4 w-4" />
                                    <span className="theme-option-label">
                                        {themeOption.label}
                                    </span>
                                    {theme === themeOption.value && (
                                        <div className="theme-option-indicator" />
                                    )}
                                </div>
                                <p className="theme-option-description">
                                    {themeOption.description}
                                </p>
                            </div>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export { ThemeToggle }; 
import React from 'react';
import { User, Shield, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

/**
 * 设置页面左侧导航组件
 * 提供个人资料和账号安全两个主要选项
 */
const SettingsNavigation = ({ activeTab, onTabChange }) => {
    const { t } = useTranslation();
    const navigationItems = [
        {
            id: 'profile',
            label: t('settings:profile.title'),
            icon: User
        },
        {
            id: 'security',
            label: t('settings:security.title'),
            icon: Shield
        }
    ];

    return (
        <Card className="p-2 shadow-sm">
            <nav className="space-y-1">
                {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <Button
                            key={item.id}
                            variant={isActive ? 'secondary' : 'ghost'}
                            className={cn(
                                'w-full justify-start h-auto p-4 transition-all duration-200',
                                isActive && 'bg-secondary/80 shadow-sm border border-border'
                            )}
                            onClick={() => onTabChange(item.id)}
                        >
                            <div className="flex items-center gap-3 w-full">
                                <Icon className={cn(
                                    'h-5 w-5 flex-shrink-0',
                                    isActive ? 'text-primary' : 'text-muted-foreground'
                                )} />
                                <div className={cn(
                                    'font-medium text-sm flex-1 text-left',
                                    isActive ? 'text-primary' : 'text-foreground'
                                )}>
                                    {item.label}
                                </div>
                                <ChevronRight className={cn(
                                    'h-4 w-4 transition-transform duration-200',
                                    isActive ? 'rotate-90 text-primary' : 'text-muted-foreground'
                                )} />
                            </div>
                        </Button>
                    );
                })}
            </nav>
        </Card>
    );
};

export default SettingsNavigation;

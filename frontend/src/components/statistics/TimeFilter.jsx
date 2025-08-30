import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays, CalendarRange, Clock, Infinity } from 'lucide-react';
import { useI18nContext } from '@/contexts/I18nContext';

const TimeFilter = ({ period, onPeriodChange }) => {
    const { t } = useI18nContext();
    const timeOptions = [
        { value: 'all', label: t('statistics.timeFilter.all', '所有时间'), icon: Infinity },
        { value: 'year', label: t('statistics.timeFilter.year', '今年'), icon: CalendarRange },
        { value: 'month', label: t('statistics.timeFilter.month', '本月'), icon: CalendarDays },
        { value: 'week', label: t('statistics.timeFilter.week', '本周'), icon: Calendar },
        { value: 'day', label: t('statistics.timeFilter.day', '今天'), icon: Clock },
    ];

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {timeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = period === option.value;

                return (
                    <Button
                        key={option.value}
                        variant="outline"
                        size="sm"
                        onClick={() => onPeriodChange(option.value)}
                        className={`flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md ${isActive
                                ? 'shadow-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500 hover:bg-cyan-500/20'
                                : 'hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20'
                            }`}
                    >
                        <Icon className="h-4 w-4" />
                        <span>{option.label}</span>
                    </Button>
                );
            })}
        </div>
    );
};

export default TimeFilter;

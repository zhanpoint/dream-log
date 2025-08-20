import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays, CalendarRange, Clock, Infinity } from 'lucide-react';

const TimeFilter = ({ period, onPeriodChange }) => {
    const timeOptions = [
        { value: 'all', label: '所有时间', icon: Infinity },
        { value: 'year', label: '今年', icon: CalendarRange },
        { value: 'month', label: '本月', icon: CalendarDays },
        { value: 'week', label: '本周', icon: Calendar },
        { value: 'day', label: '今天', icon: Clock },
    ];

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {timeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = period === option.value;

                return (
                    <Button
                        key={option.value}
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onPeriodChange(option.value)}
                        className={`flex items-center gap-2 transition-all ${isActive ? 'shadow-md' : ''
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

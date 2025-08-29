import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Hash, RefreshCw, Brain, Eye } from 'lucide-react';
import { useI18nContext } from '@/contexts/I18nContext';

const SummaryCards = ({ summary = {} }) => {
    const { t } = useI18nContext();
    const cards = [
        {
            title: t('statistics.summary.totalDreams', '梦境总数'),
            value: summary.total_dreams || 0,
            icon: BookOpen,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
        },
        {
            title: t('statistics.summary.totalTags', '标签总数'),
            value: summary.total_tags || 0,
            icon: Hash,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
        },
        {
            title: t('statistics.summary.recurringDreams', '重复梦境'),
            value: `${summary.recurring_percentage || 0}%`,
            icon: RefreshCw,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
        },
        {
            title: t('statistics.summary.avgLucidity', '平均清醒度'),
            value: summary.avg_lucidity || 0,
            icon: Brain,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
            suffix: '/5',
        },
        {
            title: t('statistics.summary.avgClarity', '平均清晰度'),
            value: summary.avg_vividness || 0,
            icon: Eye,
            color: 'text-cyan-500',
            bgColor: 'bg-cyan-500/10',
            suffix: '/5',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                        {card.title}
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {card.value}
                                        {card.suffix && (
                                            <span className="text-base text-muted-foreground ml-1">
                                                {card.suffix}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                                    <Icon className={`h-6 w-6 ${card.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export default SummaryCards;

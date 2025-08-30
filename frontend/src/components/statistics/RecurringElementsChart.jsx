import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { useI18nContext } from '@/contexts/I18nContext';
import { DreamElementCloud } from '@/components/magicui/dream-element-cloud';

const RecurringElementsChart = ({ data = [] }) => {
    const { t } = useI18nContext();

    const chartData = useMemo(() => {
        const validData = data?.filter(item => item.value > 0) || [];

        if (validData.length === 0) {
            return { hasData: false, validData: [] };
        }

        // 使用主题兼容的颜色方案
        const colors = [
            '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
            '#6366f1', '#ec4899', '#84cc16', '#f97316', '#06d6a0',
            '#3b82f6', '#f43f5e', '#22c55e', '#a855f7', '#eab308'
        ];

        return {
            hasData: true,
            validData: validData.map((item, index) => ({
                ...item,
                color: item.color || colors[index % colors.length]
            }))
        };
    }, [data]);

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <RefreshCw className="h-4 w-4 text-cyan-500" />
                    {t('statistics.charts.recurringElementsAnalysis', '重复梦境元素分析')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.hasData ? (
                    <div className="flex items-center justify-center h-[280px] w-full">
                        <DreamElementCloud elements={chartData.validData} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                        <RefreshCw className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-sm">{t('statistics.noRecurringElementsData', '暂无重复元素数据')}</p>
                        <p className="text-xs mt-1">{t('statistics.recordMoreForAnalysis', '记录更多梦境后查看分析')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RecurringElementsChart;

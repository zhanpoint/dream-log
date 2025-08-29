import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart } from 'lucide-react';
import { useI18nContext } from '@/contexts/I18nContext';

const CategoryPieChart = ({ data = [] }) => {
    const { t, i18n } = useI18nContext();
    const chartData = useMemo(() => {
        const validData = data?.filter(item => item.value > 0) || [];

        if (validData.length === 0) {
            return { hasData: false, option: null };
        }

        // 翻译分类名称 - 修复翻译逻辑
        const translatedData = validData.map(item => {
            const categoryKey = item.name;

            // 使用正确的命名空间分隔符 ":"
            const translatedName = t(
                `dreams:categories.${categoryKey}`,
                { defaultValue: item.name } // 如果找不到，则使用原始值
            );

            return {
                ...item,
                name: translatedName
            };
        });

        // 使用主题兼容的颜色方案
        const colors = [
            '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
            '#6366f1', '#ec4899', '#84cc16', '#f97316', '#06d6a0'
        ];

        const option = {
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: '#06b6d4',
                borderWidth: 1,
                textStyle: { color: '#fff', fontSize: 12 },
                formatter: (params) => {
                    return `${params.name}<br/>${t('statistics.count', '次数')}: ${params.value}${t('statistics.times', '次')}<br/>${t('statistics.percentage', '占比')}: ${params.percent}%`;
                },
            },
            legend: {
                orient: 'horizontal',
                bottom: 0,
                left: 'center',
                textStyle: {
                    color: 'hsl(var(--foreground) / 0.8)',
                    fontSize: 11,
                    fontWeight: 500,
                },
                itemWidth: 8,
                itemHeight: 8,
                itemGap: 12,
                data: translatedData.map(item => item.name),
            },
            series: [{
                name: t('statistics.dreamCategories', '梦境类别'),
                type: 'pie',
                radius: ['35%', '65%'],
                center: ['50%', '45%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: 'hsl(var(--border) / 0.3)',
                },
                label: {
                    show: false,
                },
                emphasis: {
                    scale: true,
                    scaleSize: 5,
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.3)',
                    },
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#fff',
                    },
                },
                labelLine: {
                    show: false,
                },
                data: translatedData.map((item, index) => ({
                    value: item.value,
                    name: item.name,
                    itemStyle: {
                        color: item.color || colors[index % colors.length],
                    },
                })),
                animationDuration: 800,
                animationEasing: 'cubicOut',
            }],
        };

        return { hasData: true, option };
    }, [data, t, i18n.language]);

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <PieChart className="h-4 w-4 text-cyan-500" />
                    {t('statistics.charts.categoryDistribution', '梦境类别分布')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.hasData ? (
                    <ReactECharts
                        option={chartData.option}
                        style={{ height: '280px', width: '100%' }}
                        opts={{ renderer: 'svg', devicePixelRatio: window.devicePixelRatio || 2 }}
                        className="w-full theme-transition"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                        <PieChart className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-sm">{t('statistics.noCategoryData', '暂无类别数据')}</p>
                        <p className="text-xs mt-1">{t('statistics.recordMoreForAnalysis', '记录更多梦境后查看分析')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CategoryPieChart;

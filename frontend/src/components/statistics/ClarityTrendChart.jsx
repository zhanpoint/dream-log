import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { useI18nContext } from '@/contexts/I18nContext';

const ClarityTrendChart = ({ data = { dates: [], series: [] } }) => {
    const { t } = useI18nContext();
    const chartData = useMemo(() => {
        const validData = data.series?.filter(val => typeof val === 'number' && !isNaN(val)) || [];
        const hasValidData = validData.length > 0 && data.dates?.length > 0;

        if (!hasValidData) {
            return { hasData: false, option: null };
        }

        // 计算平均值和动态Y轴范围
        const average = validData.reduce((sum, val) => sum + val, 0) / validData.length;
        const minValue = Math.min(...validData);
        const maxValue = Math.max(...validData);

        // 动态计算Y轴范围，但确保包含有意义的上下文
        const range = maxValue - minValue;
        const padding = Math.max(0.5, range * 0.2); // 至少0.5的padding
        const yMin = Math.max(0, Math.floor((minValue - padding) * 2) / 2); // 以0.5为单位
        const yMax = Math.min(5, Math.ceil((maxValue + padding) * 2) / 2);

        // 如果数据变化很小，确保有足够的显示范围
        const finalYMin = range < 1 ? Math.max(0, minValue - 1) : yMin;
        const finalYMax = range < 1 ? Math.min(5, maxValue + 1) : yMax;

        const option = {
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: '#06b6d4',
                borderWidth: 1,
                textStyle: { color: '#fff', fontSize: 12 },
                formatter: (params) => {
                    const param = params[0];
                    const date = new Date(param.axisValue);
                    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
                    const clarityLevel = param.value >= 4 ? t('statistics.clarity.veryClear', '很清晰') :
                        param.value >= 3 ? t('statistics.clarity.clear', '较清晰') :
                            param.value >= 2 ? t('statistics.clarity.blurry', '模糊') :
                                t('statistics.clarity.veryBlurry', '很模糊');
                    return `${formattedDate}<br/>${t('statistics.clarity.clarity', '清晰度')}: ${param.value}/5 (${clarityLevel})`;
                },
            },
            grid: {
                left: '5%',
                right: '5%',
                bottom: '10%',
                top: '15%',
                containLabel: true,
            },
            xAxis: {
                type: 'category',
                data: data.dates,
                boundaryGap: false,
                axisLabel: {
                    color: 'hsl(var(--foreground) / 0.7)',
                    fontSize: 11,
                    fontWeight: 500,
                    formatter: (value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                    },
                },
                axisLine: {
                    lineStyle: {
                        color: 'hsl(var(--border))',
                    },
                },
                axisTick: {
                    show: false,
                },
            },
            yAxis: {
                type: 'value',
                min: finalYMin,
                max: finalYMax,
                interval: 0.5,
                axisLabel: {
                    color: 'hsl(var(--foreground) / 0.8)',
                    fontSize: 11,
                    fontWeight: 500,
                    formatter: '{value}',
                },
                axisLine: {
                    lineStyle: {
                        color: 'hsl(var(--border))',
                    },
                },
                splitLine: {
                    lineStyle: {
                        color: 'hsl(var(--border) / 0.3)',
                        type: 'dashed',
                    },
                },
                alignTicks: false,
            },
            series: [{
                name: t('statistics.charts.dreamClarity', '梦境清晰度'),
                type: 'line',
                smooth: true,
                data: data.series,
                lineStyle: {
                    color: '#06b6d4',
                    width: 2.5,
                    shadowBlur: 4,
                    shadowColor: 'rgba(6, 182, 212, 0.5)',
                },
                itemStyle: {
                    color: '#06b6d4',
                    borderColor: '#0891b2',
                    borderWidth: 2,
                },
                areaStyle: validData.length > 2 ? {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: 'rgba(6, 182, 212, 0.15)',
                            },
                            {
                                offset: 1,
                                color: 'rgba(6, 182, 212, 0.02)',
                            },
                        ],
                    },
                } : null, // 数据点太少时不显示面积填充
                emphasis: {
                    itemStyle: {
                        color: '#67e8f9',
                        shadowBlur: 10,
                        shadowColor: 'rgba(6, 182, 212, 0.6)',
                    },
                },
                markLine: validData.length > 2 && range > 0.5 ? {
                    silent: true,
                    data: [
                        {
                            yAxis: average,
                            lineStyle: {
                                color: '#f59e0b',
                                type: 'dashed',
                                width: 1.5,
                                opacity: 0.8,
                            },
                            label: {
                                position: 'insideEndTop',
                                formatter: `${t('statistics.clarity.average', '平均值')}: ${average.toFixed(1)}`,
                                color: 'hsl(var(--foreground) / 0.7)',
                                fontSize: 10,
                                fontWeight: 500,
                                backgroundColor: 'hsl(var(--background) / 0.9)',
                                padding: [2, 6],
                                borderRadius: 4,
                            },
                        },
                    ],
                } : null, // 数据点太少或变化太小时不显示平均值线
                animationDuration: 800,
                animationEasing: 'cubicOut',
            }],
        };

        return { hasData: true, option };
    }, [data, t]);

    const hasData = data.dates?.length > 0 && data.series?.length > 0;

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Eye className="h-4 w-4 text-cyan-500" />
                    {t('statistics.charts.clarityTrend', '梦境清晰度趋势')}
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
                        <Eye className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-sm">{t('statistics.noClarityData', '暂无清晰度数据')}</p>
                        <p className="text-xs mt-1">{t('statistics.recordMoreForAnalysis', '记录更多梦境后查看分析')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ClarityTrendChart;

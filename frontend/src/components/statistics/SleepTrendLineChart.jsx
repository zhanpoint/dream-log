import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { useI18nContext } from '@/contexts/I18nContext';

const SleepTrendLineChart = ({ data = { dates: [], quality: [], duration: [] } }) => {
    const { t } = useI18nContext();

    const chartData = useMemo(() => {
        const validQuality = data.quality?.filter(val => typeof val === 'number' && !isNaN(val)) || [];
        const validDuration = data.duration?.filter(val => typeof val === 'number' && !isNaN(val)) || [];
        const hasValidData = validQuality.length > 0 || validDuration.length > 0;

        if (!hasValidData) {
            return { hasData: false, option: null };
        }

        const option = {
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: '#06b6d4',
                borderWidth: 1,
                textStyle: { color: '#fff', fontSize: 12 },
            },
            legend: {
                data: [t('statistics.sleepQuality', '睡眠质量'), t('statistics.sleepDuration', '睡眠时长')],
                bottom: 0,
                textStyle: {
                    color: 'hsl(var(--foreground) / 0.8)',
                    fontSize: 11,
                    fontWeight: 500,
                },
                itemGap: 15,
            },
            grid: {
                left: '8%',
                right: '12%',
                bottom: '15%',
                top: '8%',
                containLabel: true,
            },
            xAxis: {
                type: 'category',
                data: data.dates,
                axisLabel: {
                    color: 'hsl(var(--foreground) / 0.9)',
                    fontSize: 11,
                    fontWeight: 500,
                    rotate: window.innerWidth < 768 ? 45 : 30,
                    interval: Math.floor(data.dates.length / 8) || 0,
                },
                axisLine: {
                    lineStyle: {
                        color: 'hsl(var(--border))',
                    },
                },
            },
            yAxis: [
                {
                    type: 'value',
                    name: t('statistics.sleepQuality', '睡眠质量'),
                    nameTextStyle: {
                        color: 'hsl(var(--foreground) / 0.95)',
                        fontSize: 12,
                        fontWeight: 500,
                    },
                    position: 'left',
                    min: 0,
                    max: 5,
                    interval: 1,
                    axisLabel: {
                        color: 'hsl(var(--foreground) / 0.95)',
                        fontSize: 11,
                        fontWeight: 500,
                        formatter: '{value}',
                    },
                    axisLine: {
                        lineStyle: {
                            color: 'rgba(99, 102, 241, 0.3)',
                        },
                    },
                    splitLine: {
                        lineStyle: {
                            color: 'hsl(var(--border) / 0.3)',
                            type: 'dashed',
                        },
                    },
                },
                {
                    type: 'value',
                    name: t('statistics.sleepDurationHours', '睡眠时长(小时)'),
                    nameTextStyle: {
                        color: 'hsl(var(--foreground) / 0.95)',
                        fontSize: 12,
                        fontWeight: 500,
                    },
                    position: 'right',
                    min: 0,
                    max: 12,
                    interval: 2,
                    axisLabel: {
                        color: 'hsl(var(--foreground) / 0.95)',
                        fontSize: 11,
                        fontWeight: 500,
                        formatter: '{value}h',
                    },
                    axisLine: {
                        lineStyle: {
                            color: 'rgba(16, 185, 129, 0.3)',
                        },
                    },
                    splitLine: {
                        show: false,
                    },
                },
            ],
            series: [
                {
                    name: t('statistics.sleepQuality', '睡眠质量'),
                    type: 'line',
                    smooth: true,
                    yAxisIndex: 0,
                    data: data.quality,
                    itemStyle: {
                        color: '#6366f1',
                    },
                    lineStyle: {
                        width: 2.5,
                        shadowBlur: 4,
                        shadowColor: 'rgba(99, 102, 241, 0.5)',
                    },
                    areaStyle: {
                        opacity: 0.1,
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                {
                                    offset: 0,
                                    color: 'rgba(99, 102, 241, 0.3)',
                                },
                                {
                                    offset: 1,
                                    color: 'rgba(99, 102, 241, 0)',
                                },
                            ],
                        },
                    },
                    emphasis: {
                        focus: 'series',
                    },
                    animationDuration: 800,
                    animationEasing: 'cubicOut',
                },
                {
                    name: t('statistics.sleepDuration', '睡眠时长'),
                    type: 'line',
                    smooth: true,
                    yAxisIndex: 1,
                    data: data.duration,
                    itemStyle: {
                        color: '#10b981',
                    },
                    lineStyle: {
                        width: 2.5,
                        shadowBlur: 4,
                        shadowColor: 'rgba(16, 185, 129, 0.5)',
                    },
                    areaStyle: {
                        opacity: 0.1,
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                {
                                    offset: 0,
                                    color: 'rgba(16, 185, 129, 0.3)',
                                },
                                {
                                    offset: 1,
                                    color: 'rgba(16, 185, 129, 0)',
                                },
                            ],
                        },
                    },
                    emphasis: {
                        focus: 'series',
                    },
                    animationDuration: 800,
                    animationEasing: 'cubicOut',
                },
            ],
        };

        return { hasData: true, option };
    }, [data, t]);

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-cyan-500" />
                    {t('statistics.sleepTrend', '睡眠质量与时长趋势')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.hasData ? (
                    <ReactECharts
                        option={chartData.option}
                        style={{ height: '320px', width: '100%' }}
                        opts={{ renderer: 'svg', devicePixelRatio: window.devicePixelRatio || 2 }}
                        className="w-full theme-transition"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-sm">{t('statistics.noSleepData', '暂无睡眠数据')}</p>
                        <p className="text-xs mt-1">{t('statistics.recordMoreForAnalysis', '记录更多梦境后查看分析')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default SleepTrendLineChart;

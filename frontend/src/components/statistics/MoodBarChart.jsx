import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import { useI18nContext } from '@/contexts/I18nContext';

const MoodRadarChart = ({ data = { categories: [], series: [] } }) => {
    const { t, i18n } = useI18nContext();

    // 将响应式变量提取到组件顶层，确保整个组件都能访问
    const currentLanguage = i18n.language || 'zh-CN';
    const isMobile = window.innerWidth < 768;
    const isCompactLanguage = ['zh-CN', 'zh-TW', 'ja', 'ko'].includes(currentLanguage);

    // 数据预处理和验证 - 优化性能
    const chartData = useMemo(() => {
        const validData = data.series?.filter(val => typeof val === 'number' && !isNaN(val)) || [];
        const hasValidData = validData.length > 0 && data.categories?.length > 0;

        if (!hasValidData) {
            return { hasData: false, option: null, stats: null };
        }

        // 计算合理的最大值
        const dataMax = Math.max(...validData);
        const maxValue = Math.max(dataMax * 1.1, 5); // 比最大值多10%，最小为5
        const normalizedMax = Math.ceil(maxValue / 5) * 5;

        // 翻译情绪类别标签
        const translatedCategories = data.categories.map(category => {
            // 后端现在返回英文key，直接使用进行翻译
            if (typeof category === 'string') {
                // 将英文key映射到翻译键
                const emotionKeyMap = {
                    'very_positive': 'veryPositive',
                    'positive': 'positive',
                    'negative': 'negative',
                    'very_negative': 'veryNegative',
                    'neutral': 'neutral',
                    // 向后兼容：保留中文映射以防数据中仍有中文
                    '非常积极': 'veryPositive',
                    '积极': 'positive',
                    '消极': 'negative',
                    '很消极': 'veryNegative',
                    '中性': 'neutral'
                };

                const emotionKey = emotionKeyMap[category];
                if (emotionKey) {
                    return t(`statistics.emotions.${emotionKey}`, category);
                }
            }
            // 如果找不到对应的翻译，返回原值
            return category;
        });

        // 计算统计信息
        const total = validData.reduce((sum, val) => sum + val, 0);
        const dominantEmotion = translatedCategories[validData.indexOf(dataMax)];

        const stats = {
            dominantEmotion,
            emotions: translatedCategories.map((cat, idx) => ({
                name: cat,
                value: validData[idx],
                percentage: ((validData[idx] / total) * 100).toFixed(1)
            })).sort((a, b) => b.value - a.value)
        };

        const option = {
            tooltip: {
                show: false,
                trigger: 'item',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: '#06b6d4',
                borderWidth: 1,
                textStyle: { color: '#fff', fontSize: 12 },
                formatter: (params) => {
                    const percentage = ((params.value / normalizedMax) * 100).toFixed(1);
                    return `${params.name}<br/>${t('statistics.occurrences', '出现次数')}: ${params.value}${t('statistics.occurrencesTimes', '次')}<br/>${t('statistics.proportion', '占比')}: ${percentage}%`;
                },
            },
            dataZoom: isMobile ? [
                {
                    type: 'inside',
                    disabled: true
                }
            ] : undefined,
            radar: {
                indicator: translatedCategories.map((category) => ({
                    name: category,
                    max: normalizedMax,
                })),
                center: ['50%', '50%'],
                radius: '75%', // 轻微增加半径以提供更多文字空间
                startAngle: 90,
                splitNumber: 4,
                shape: 'polygon',
                axisName: {
                    color: 'hsl(var(--foreground) / 0.8)',
                    fontSize: 12,
                    fontWeight: 500,
                    // 更智能的文字处理策略：优先显示完整文字，只在必要时截断
                    formatter: (value) => {
                        if (!value || typeof value !== 'string') return value;

                        // 根据语言类型设定更宽松的长度限制
                        let maxLength;
                        if (isMobile) {
                            // 移动端：适度放宽限制
                            maxLength = isCompactLanguage ? 6 : 5;
                        } else {
                            // 桌面端：显著放宽限制，尽量显示完整文字
                            maxLength = isCompactLanguage ? 10 : 8;
                        }

                        // 只在超出限制时才截断
                        return value.length > maxLength ? value.substring(0, maxLength - 1) + '...' : value;
                    },
                },
                axisLine: {
                    lineStyle: { color: 'hsl(var(--border))' },
                },
                splitLine: {
                    lineStyle: { color: 'hsl(var(--border) / 0.3)', width: 1 },
                },
                splitArea: {
                    show: true,
                    areaStyle: { color: ['rgba(6, 182, 212, 0.02)', 'rgba(6, 182, 212, 0.05)'] },
                },
            },
            series: [{
                type: 'radar',
                data: [{
                    value: data.series.map(val => typeof val === 'number' && !isNaN(val) ? val : 0),
                    name: t('statistics.charts.moodDistribution', '情绪分布'),
                    itemStyle: { color: '#06b6d4' },
                    lineStyle: { color: '#06b6d4', width: 2.5 },
                    areaStyle: {
                        color: {
                            type: 'radial',
                            x: 0.5, y: 0.5, r: 0.5,
                            colorStops: [
                                { offset: 0, color: 'rgba(6, 182, 212, 0.3)' },
                                { offset: 1, color: 'rgba(6, 182, 212, 0.05)' }
                            ]
                        }
                    },
                    symbol: 'circle',
                    symbolSize: 5,
                    emphasis: {
                        itemStyle: { color: '#0891b2', shadowBlur: 10, shadowColor: 'rgba(6, 182, 212, 0.6)' },
                        lineStyle: { color: '#0891b2', width: 3 },
                        areaStyle: {
                            color: {
                                type: 'radial',
                                x: 0.5, y: 0.5, r: 0.5,
                                colorStops: [
                                    { offset: 0, color: 'rgba(6, 182, 212, 0.4)' },
                                    { offset: 1, color: 'rgba(6, 182, 212, 0.1)' }
                                ]
                            }
                        },
                    },
                }],
                animationDuration: 800,
                animationEasing: 'cubicOut',
            }],
        };

        return { hasData: true, option, stats };
    }, [data, t, i18n.language, isMobile, isCompactLanguage]);

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Heart className="h-4 w-4 text-cyan-500" />
                    {t('statistics.charts.moodAnalysis', '梦境情绪分析')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.hasData ? (
                    <div className="space-y-4">
                        <ReactECharts
                            option={chartData.option}
                            style={{
                                height: isMobile ? '200px' : '240px',
                                width: '100%'
                            }}
                            opts={{ renderer: 'svg', devicePixelRatio: window.devicePixelRatio || 2 }}
                            className="w-full theme-transition"
                        />

                        {/* 情绪分析信息 */}
                        <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{t('statistics.dominantEmotion', '主导情绪')}</span>
                                <span className="font-medium">{chartData.stats.dominantEmotion}</span>
                            </div>

                            {/* 前3情绪排行 */}
                            <div className="space-y-1.5">
                                <div className="text-xs text-muted-foreground">{t('statistics.emotionRanking', '情绪排行')}</div>
                                {chartData.stats.emotions.slice(0, 3).map((emotion, idx) => (
                                    <div key={emotion.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] font-bold">
                                                {idx + 1}
                                            </span>
                                            <span>{emotion.name}</span>
                                        </div>
                                        <span className="text-muted-foreground">{emotion.percentage}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                        <Heart className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-sm">{t('statistics.noMoodData', '暂无情绪数据')}</p>
                        <p className="text-xs mt-1">{t('statistics.recordMoreForAnalysis', '记录更多梦境后查看分析')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default MoodRadarChart;

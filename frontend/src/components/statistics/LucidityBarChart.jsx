import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain } from 'lucide-react';
import { useI18nContext } from '@/contexts/I18nContext';

const LucidityBarChart = ({ data = { categories: [], series: [] } }) => {
    const { t, i18n } = useI18nContext();

    // 将响应式变量提取到组件顶层，确保整个组件都能访问
    const currentLanguage = i18n.language || 'zh-CN';
    const isMobile = window.innerWidth < 768;
    const isCompactLanguage = ['zh-CN', 'zh-TW', 'ja', 'ko'].includes(currentLanguage);
    const chartData = useMemo(() => {
        const validData = data.series?.filter(val => typeof val === 'number' && !isNaN(val)) || [];
        const hasValidData = validData.length > 0 && data.categories?.length > 0;

        if (!hasValidData) {
            return { hasData: false, option: null };
        }

        // 翻译清醒度等级标签
        const translatedCategories = data.categories.map(category => {
            // 中文清醒度等级到翻译键的映射
            const lucidityKeyMap = {
                '完全清醒': 'level0',
                '高度清醒': 'level1',
                '中等清醒': 'level2',
                '轻度清醒': 'level3',
                '微弱清醒': 'level4',
                '无清醒': 'level5',
                '完全清醒度': 'level0',
                '高度清醒度': 'level1',
                '中等清醒度': 'level2',
                '轻度清醒度': 'level3',
                '微弱清醒度': 'level4',
                '无清醒度': 'level5'
            };

            // 数字映射（兼容旧格式）
            if (typeof category === 'string' && category.match(/^\d+$/)) {
                const levelKey = `level${category}`;
                return t(`statistics.lucidityLevels.${levelKey}`, category);
            } else if (typeof category === 'number') {
                const levelKey = `level${category}`;
                return t(`statistics.lucidityLevels.${levelKey}`, category.toString());
            } else if (typeof category === 'string') {
                // 尝试从中文映射到翻译键
                const levelKey = lucidityKeyMap[category];
                if (levelKey) {
                    return t(`statistics.lucidityLevels.${levelKey}`, category);
                }
            }
            // 如果找不到对应的翻译，返回原值
            return category;
        });

        // 使用主题兼容的颜色方案
        const colors = [
            '#64748b', '#94a3b8', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'
        ];

        const option = {
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: '#06b6d4',
                borderWidth: 1,
                textStyle: { color: '#fff', fontSize: 12 },
                formatter: (params) => {
                    const percentage = ((params.value / validData.reduce((sum, val) => sum + val, 0)) * 100).toFixed(1);
                    return `${params.name}<br/>${t('statistics.count', '次数')}: ${params.value}${t('statistics.times', '次')}<br/>${t('statistics.percentage', '占比')}: ${percentage}%`;
                },
            },
            grid: {
                left: '10%',
                right: '10%',
                bottom: isMobile ? '25%' : '20%', // 根据设备动态调整底部空间
                top: '10%',
                containLabel: true,
            },
            xAxis: {
                type: 'category',
                data: translatedCategories,
                axisTick: {
                    alignWithLabel: true,
                },
                axisLabel: {
                    color: 'hsl(var(--foreground) / 0.8)',
                    fontSize: isMobile ? 10 : 11,
                    fontWeight: 500,
                    interval: 0, // 显示所有标签
                    // 优化旋转角度以减少重叠
                    rotate: (() => {
                        // 中文/日文/韩文等简洁语言在桌面端可以不旋转或小角度旋转
                        if (!isMobile && isCompactLanguage) {
                            // 检查是否有较长的标签需要旋转
                            const hasLongLabels = data.categories?.some(cat =>
                                typeof cat === 'string' && cat.length > 4
                            );
                            return hasLongLabels ? 15 : 0;
                        }
                        // 移动端或长文字语言：使用适中的角度
                        return isMobile ? 35 : 25;
                    })(),
                    // 智能文字截断和换行
                    formatter: (value) => {
                        if (!value || typeof value !== 'string') return value;

                        // 更智能的长度控制
                        let maxLength;
                        if (isMobile) {
                            maxLength = isCompactLanguage ? 6 : 5;
                        } else {
                            maxLength = isCompactLanguage ? 8 : 7;
                        }

                        // 只在超长时才截断，优先保持完整性
                        if (value.length > maxLength) {
                            return value.substring(0, maxLength - 1) + '…';
                        }
                        return value;
                    },
                    // 增加标签间距以减少重叠
                    margin: isMobile ? 12 : 8,
                },
                axisLine: {
                    lineStyle: {
                        color: 'hsl(var(--border))',
                    },
                },
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    color: 'hsl(var(--foreground) / 0.8)',
                    fontSize: 11,
                    fontWeight: 500,
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
            },
            series: [{
                name: t('statistics.charts.lucidityDistribution', '清醒度分布'),
                type: 'bar',
                barWidth: isMobile ? '45%' : '55%', // 稍微减小柱宽，给标签更多空间
                data: data.series.map((value, index) => ({
                    value,
                    itemStyle: {
                        borderRadius: [6, 6, 0, 0],
                        color: colors[index % colors.length],
                    },
                })),
                emphasis: {
                    itemStyle: {
                        opacity: 0.9,
                        shadowBlur: 8,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.3)',
                    },
                },
                animationDuration: 800,
                animationEasing: 'cubicOut',
            }],
        };

        return { hasData: true, option };
    }, [data, t, i18n.language, isMobile, isCompactLanguage]);

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Brain className="h-4 w-4 text-cyan-500" />
                    {t('statistics.charts.lucidityDistribution', '清醒度分布')}
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
                        <Brain className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-sm">{t('statistics.noLucidityData', '暂无清醒度数据')}</p>
                        <p className="text-xs mt-1">{t('statistics.recordMoreForAnalysis', '记录更多梦境后查看分析')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default LucidityBarChart;

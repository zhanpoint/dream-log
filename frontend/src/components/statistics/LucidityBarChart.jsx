import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain } from 'lucide-react';

const LucidityBarChart = ({ data = { categories: [], series: [] } }) => {
    // 清醒度对应的渐变色
    const lucidityGradients = [
        ['#1e293b', '#334155'], // 完全无意识 - 深灰
        ['#475569', '#64748b'], // 轻微意识 - 中灰
        ['#6366f1', '#818cf8'], // 部分清醒 - 蓝紫
        ['#a78bfa', '#c4b5fd'], // 较为清醒 - 浅紫
        ['#e879f9', '#f0abfc'], // 完全清醒 - 粉紫
        ['#fbbf24', '#fde047'], // 超清醒状态 - 金黄
    ];

    const option = {
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: 'transparent',
            textStyle: {
                color: '#fff',
            },
            formatter: '{b}: {c} 次',
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true,
        },
        xAxis: {
            type: 'category',
            data: data.categories,
            axisTick: {
                alignWithLabel: true,
            },
            axisLabel: {
                color: '#999',
                fontSize: 10,
                rotate: 20,
                interval: 0,
            },
            axisLine: {
                lineStyle: {
                    color: '#333',
                },
            },
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: '#999',
            },
            axisLine: {
                lineStyle: {
                    color: '#333',
                },
            },
            splitLine: {
                lineStyle: {
                    color: '#333',
                    type: 'dashed',
                },
            },
        },
        series: [
            {
                name: '清醒度分布',
                type: 'bar',
                barWidth: '60%',
                data: data.series.map((value, index) => ({
                    value,
                    itemStyle: {
                        borderRadius: [4, 4, 0, 0],
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                {
                                    offset: 0,
                                    color: lucidityGradients[index][1],
                                },
                                {
                                    offset: 1,
                                    color: lucidityGradients[index][0],
                                },
                            ],
                        },
                    },
                })),
                emphasis: {
                    itemStyle: {
                        opacity: 0.8,
                        shadowBlur: 8,
                        shadowColor: 'rgba(0, 0, 0, 0.3)',
                    },
                },
            },
        ],
        darkMode: true,
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    清醒度分布
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ReactECharts
                    option={option}
                    style={{ height: '300px' }}
                    theme="dark"
                    opts={{ renderer: 'svg' }}
                />
            </CardContent>
        </Card>
    );
};

export default LucidityBarChart;

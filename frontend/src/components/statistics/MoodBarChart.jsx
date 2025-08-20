import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const MoodBarChart = ({ data = { categories: [], series: [] } }) => {
    // 情绪对应的颜色
    const moodColors = [
        '#ef4444', // 非常消极 - 红色
        '#f97316', // 消极 - 橙色
        '#eab308', // 中性 - 黄色
        '#22c55e', // 积极 - 绿色
        '#10b981', // 非常积极 - 深绿色
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
                fontSize: 11,
                rotate: 0,
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
                name: '情绪分布',
                type: 'bar',
                barWidth: '60%',
                data: data.series.map((value, index) => ({
                    value,
                    itemStyle: {
                        color: moodColors[index],
                        borderRadius: [4, 4, 0, 0],
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
                    <BarChart3 className="h-5 w-5" />
                    梦境情绪分布
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

export default MoodBarChart;

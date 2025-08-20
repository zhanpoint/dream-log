import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

const SleepTrendLineChart = ({ data = { dates: [], quality: [], duration: [] } }) => {
    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: 'transparent',
            textStyle: {
                color: '#fff',
            },
        },
        legend: {
            data: ['睡眠质量', '睡眠时长'],
            bottom: 0,
            textStyle: {
                color: '#999',
            },
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true,
        },
        xAxis: {
            type: 'category',
            data: data.dates,
            axisLabel: {
                color: '#999',
                fontSize: 11,
                rotate: 45,
                interval: Math.floor(data.dates.length / 10) || 0,
            },
            axisLine: {
                lineStyle: {
                    color: '#333',
                },
            },
        },
        yAxis: [
            {
                type: 'value',
                name: '睡眠质量',
                position: 'left',
                min: 0,
                max: 5,
                interval: 1,
                axisLabel: {
                    color: '#6366f1',
                    formatter: '{value}',
                },
                axisLine: {
                    lineStyle: {
                        color: '#6366f1',
                    },
                },
                splitLine: {
                    lineStyle: {
                        color: '#333',
                        type: 'dashed',
                    },
                },
            },
            {
                type: 'value',
                name: '睡眠时长(小时)',
                position: 'right',
                min: 0,
                max: 12,
                interval: 2,
                axisLabel: {
                    color: '#10b981',
                    formatter: '{value}h',
                },
                axisLine: {
                    lineStyle: {
                        color: '#10b981',
                    },
                },
                splitLine: {
                    show: false,
                },
            },
        ],
        series: [
            {
                name: '睡眠质量',
                type: 'line',
                smooth: true,
                yAxisIndex: 0,
                data: data.quality,
                itemStyle: {
                    color: '#6366f1',
                },
                lineStyle: {
                    width: 2,
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
            },
            {
                name: '睡眠时长',
                type: 'line',
                smooth: true,
                yAxisIndex: 1,
                data: data.duration,
                itemStyle: {
                    color: '#10b981',
                },
                lineStyle: {
                    width: 2,
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
            },
        ],
        darkMode: true,
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    睡眠质量与时长趋势
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ReactECharts
                    option={option}
                    style={{ height: '350px' }}
                    theme="dark"
                    opts={{ renderer: 'svg' }}
                />
            </CardContent>
        </Card>
    );
};

export default SleepTrendLineChart;

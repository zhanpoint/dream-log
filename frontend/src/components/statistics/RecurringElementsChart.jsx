import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

const RecurringElementsChart = ({ data = [] }) => {
    if (data.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        重复梦境元素分析
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                        暂无重复梦境元素数据
                    </p>
                </CardContent>
            </Card>
        );
    }

    // 为不同元素分配不同颜色
    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} 次 ({d}%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: 'transparent',
            textStyle: {
                color: '#fff',
            },
        },
        legend: {
            orient: 'horizontal',
            bottom: 0,
            left: 'center',
            textStyle: {
                color: '#999',
                fontSize: 11,
            },
            itemWidth: 8,
            itemHeight: 8,
        },
        series: [
            {
                name: '重复元素',
                type: 'pie',
                radius: ['30%', '70%'],
                center: ['50%', '45%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 6,
                    borderColor: '#1a1a1a',
                    borderWidth: 1,
                },
                label: {
                    show: false,
                },
                emphasis: {
                    scale: true,
                    scaleSize: 5,
                    itemStyle: {
                        shadowBlur: 8,
                        shadowColor: 'rgba(0, 0, 0, 0.3)',
                    },
                },
                labelLine: {
                    show: false,
                },
                data: data.map((item, index) => ({
                    value: item.value,
                    name: item.name,
                    itemStyle: {
                        color: colors[index % colors.length],
                    },
                })),
            },
        ],
        darkMode: true,
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    重复梦境元素分析
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

export default RecurringElementsChart;

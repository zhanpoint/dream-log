import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart } from 'lucide-react';

const CategoryPieChart = ({ data = [] }) => {
    // 准备 ECharts 配置
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)',
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
                fontSize: 12,
            },
            itemWidth: 10,
            itemHeight: 10,
        },
        series: [
            {
                name: '梦境类别',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '45%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#1a1a1a',
                    borderWidth: 2,
                },
                label: {
                    show: false,
                    position: 'center',
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 20,
                        fontWeight: 'bold',
                        color: '#fff',
                    },
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)',
                    },
                },
                labelLine: {
                    show: false,
                },
                data: data.map((item) => ({
                    value: item.value,
                    name: item.name,
                    itemStyle: {
                        color: item.color || '#6366f1',
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
                    <PieChart className="h-5 w-5" />
                    梦境类别分布
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

export default CategoryPieChart;

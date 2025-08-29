import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18nContext } from '@/contexts/I18nContext';
import { MultilingualSeo } from '@/components/seo/MultilingualSeo';
import { Skeleton } from '@/components/ui/skeleton';
import TimeFilter from '@/components/statistics/TimeFilter';
import SummaryCards from '@/components/statistics/SummaryCards';
import TagLeaderboard from '@/components/statistics/TagLeaderboard';
import CategoryPieChart from '@/components/statistics/CategoryPieChart';
import MoodRadarChart from '@/components/statistics/MoodBarChart';
import LucidityBarChart from '@/components/statistics/LucidityBarChart';
import ClarityTrendChart from '@/components/statistics/ClarityTrendChart';
import SleepTrendLineChart from '@/components/statistics/SleepTrendLineChart';
import RecurringElementsChart from '@/components/statistics/RecurringElementsChart';
import api from '@/services/api';
import notification from '@/utils/notification';

const StatisticsPage = () => {
    const navigate = useNavigate();
    const { t } = useI18nContext();
    const [period, setPeriod] = useState('all');
    const [statisticsData, setStatisticsData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // 获取统计数据 - 使用 useCallback 优化
    const fetchStatistics = useCallback(async (selectedPeriod) => {
        setIsLoading(true);
        try {
            const response = await api.get('/statistics/', {
                params: { period: selectedPeriod }
            });
            setStatisticsData(response.data);
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
            notification.error(t('common.error.fetchFailed', '获取统计数据失败'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 时间范围变化处理 - 使用 useCallback 优化
    const handlePeriodChange = useCallback((newPeriod) => {
        setPeriod(newPeriod);
    }, []);

    // 初始加载和时间范围变化时重新获取数据
    useEffect(() => {
        fetchStatistics(period);
    }, [period, fetchStatistics]);

    return (
        <>
            <MultilingualSeo
                title={t('statistics.title', '梦境统计')}
                description={t('statistics.subtitle', '查看你的梦境数据统计和分析')}
                keywords={t('statistics.keywords', '梦境,统计,分析,数据')}
            />
            <div className="min-h-screen bg-background">
                {/* 顶部导航栏 */}
                <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </button>
                                <h1 className="text-2xl font-bold">{t('statistics.title', '梦境统计')}</h1>
                            </div>
                            <TimeFilter period={period} onPeriodChange={handlePeriodChange} />
                        </div>
                    </div>
                </div>

                {/* 主内容区 */}
                <div className="container mx-auto px-4 py-8">
                    {isLoading ? (
                        // 骨架屏 - 优化布局
                        <div className="space-y-8">
                            {/* 汇总卡片骨架 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {Array.from({ length: 4 }, (_, i) => (
                                    <Skeleton key={`summary-${i}`} className="h-24" />
                                ))}
                            </div>

                            {/* 图表骨架 - 匹配实际布局 */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {Array.from({ length: 7 }, (_, i) => (
                                    <Skeleton
                                        key={`chart-${i}`}
                                        className={`h-80 ${i === 4 ? 'lg:col-span-2 xl:col-span-2' : // 睡眠趋势图
                                            i === 5 ? 'lg:col-span-1' : // 标签排行榜改为紧凑
                                                'lg:col-span-1'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : statisticsData ? (
                        <div className="space-y-8">
                            {/* 核心指标卡片 */}
                            <SummaryCards summary={statisticsData.summary || {}} />

                            {/* 图表网格布局 - PC端优先设计 */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {/* 梦境类别分布饼图 */}
                                {statisticsData.category_distribution?.length > 0 && (
                                    <div className="lg:col-span-1">
                                        <CategoryPieChart data={statisticsData.category_distribution} />
                                    </div>
                                )}

                                {/* 情绪分布雷达图 */}
                                {statisticsData.mood_distribution?.series?.some(val => val > 0) && (
                                    <div className="lg:col-span-1">
                                        <MoodRadarChart data={statisticsData.mood_distribution} />
                                    </div>
                                )}

                                {/* 清醒度分布柱状图 */}
                                {statisticsData.lucidity_distribution?.series?.some(val => val > 0) && (
                                    <div className="lg:col-span-1">
                                        <LucidityBarChart data={statisticsData.lucidity_distribution} />
                                    </div>
                                )}

                                {/* 清晰度趋势图 - 始终显示，用于展示功能 */}
                                <div className="lg:col-span-1">
                                    <ClarityTrendChart data={
                                        statisticsData.clarity_trends ||
                                        statisticsData.clarity_distribution ||
                                        statisticsData.dream_clarity ||
                                        { dates: [], series: [] }
                                    } />
                                </div>

                                {/* 睡眠趋势折线图 - 占两列 */}
                                {statisticsData.sleep_trends?.dates?.length > 0 && (
                                    <div className="lg:col-span-2 xl:col-span-2">
                                        <SleepTrendLineChart data={statisticsData.sleep_trends} />
                                    </div>
                                )}

                                {/* 标签排行榜 */}
                                {statisticsData.tag_leaderboard && Object.keys(statisticsData.tag_leaderboard).some(key => statisticsData.tag_leaderboard[key]?.length > 0) && (
                                    <div className="lg:col-span-1">
                                        <TagLeaderboard data={statisticsData.tag_leaderboard} />
                                    </div>
                                )}

                                {/* 重复梦境元素分析 */}
                                {statisticsData.recurring_elements?.length > 0 && (
                                    <div className="lg:col-span-1">
                                        <RecurringElementsChart data={statisticsData.recurring_elements} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20">
                            <p className="text-muted-foreground">{t('statistics.noData', '暂无统计数据')}</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default StatisticsPage;

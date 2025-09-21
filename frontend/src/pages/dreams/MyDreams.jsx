import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Calendar, Sparkles, Moon, Edit, Trash2 } from 'lucide-react';
import { useI18nContext } from '@/contexts/I18nContext';
import { MultilingualSeo } from '@/components/seo/MultilingualSeo';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AdvancedFilter from '@/components/ui/advanced-filter';
import notification from '@/utils/notification';
import api from '@/services/api';
import useProgressiveLoading from '@/hooks/useProgressiveLoading';
import '@/styles/pages/MyDreams.css';

// 懒加载虚拟化网格组件
const VirtualizedDreamGrid = lazy(() => import('@/components/ui/VirtualizedDreamGrid'));

/**
 * 检查是否有活跃筛选条件
 */
const hasActiveFilters = (filters) => {
    return Object.entries(filters).some(([key, value]) => {
        if (key === 'categoryMode') return false; // 排除模式设置
        if (Array.isArray(value)) return value.length > 0;
        if (key === 'lucidityRange' || key === 'clarityRange') {
            return value && (value[0] > 1 || value[1] < 5);
        }
        if (key === 'sleepDurationRange') {
            return value && (value[0] > 0 || value[1] < 24);
        }
        return value !== undefined && value !== null;
    });
};

const MyDreams = () => {
    const { t, i18n, formatDate, forceUpdateKey } = useI18nContext();
    const navigate = useNavigate();
    const [dreams, setDreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [sortDisplayText, setSortDisplayText] = useState(t('dreams:sort.default', '默认排序'));
    const [deletingId, setDeletingId] = useState(null);

    // 高级筛选状态
    const [filters, setFilters] = useState({
        categories: [],
        categoryMode: 'OR', // 'AND' 或 'OR'
        mood: undefined,
        dateRange: null,
        isRecurring: undefined,
        lucidityRange: [1, 5],
        clarityRange: [1, 5],
        sleepQuality: undefined,
        sleepDurationRange: [0, 24],
        tags: undefined
    });

    useEffect(() => {
        fetchDreams();
    }, []);

    const fetchDreams = async () => {
        try {
            const response = await api.get('/dreams/');
            const dreamsData = response.data.results || response.data;
            setDreams(Array.isArray(dreamsData) ? dreamsData : []);
        } catch (error) {
            notification.error(t('common.error.fetchFailed', '获取数据失败'));
            setDreams([]);
        } finally {
            setLoading(false);
        }
    };

    /**
     * 删除梦境
     */
    const handleDelete = async (dreamId) => {
        setDeletingId(dreamId);
        try {
            await api.delete(`/dreams/${dreamId}/`);
            setDreams(dreams.filter(dream => dream.id !== dreamId));
            notification.success(t('common.success.deleted', '删除成功'));
        } catch (error) {
            notification.error(t('common.error.deleteFailed', '删除失败'));
        } finally {
            setDeletingId(null);
        }
    };

    /**
     * 处理筛选条件变化 - 实时反馈
     */
    const handleFiltersChange = useCallback((newFilters) => {
        setFilters(newFilters);
    }, []);

    /**
     * 重置筛选条件
     */
    const handleResetFilters = useCallback(() => {
        setFilters({
            categories: [],
            categoryMode: 'OR',
            mood: undefined,
            dateRange: null,
            isRecurring: undefined,
            lucidityRange: [1, 5],
            clarityRange: [1, 5],
            sleepQuality: undefined,
            sleepDurationRange: [0, 24],
            tags: undefined
        });
        setSearchTerm('');
        notification.success(t('common.success.filtersReset', '筛选已重置'));
    }, []);



    const truncateContent = (htmlContent, maxLength = 150) => {
        // 创建一个临时div来解析HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // 获取纯文本内容
        const textContent = tempDiv.textContent || tempDiv.innerText || "";

        // 截断文本
        if (textContent.length <= maxLength) {
            return textContent;
        }
        return textContent.substring(0, maxLength) + '...';
    };

    /**
     * 高级筛选逻辑
     * 支持多维度筛选和实时反馈
     */
    const applyAdvancedFilters = useCallback((dream) => {
        // 搜索匹配
        const matchesSearch = !searchTerm ||
            dream.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            dream.content.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        // 分类筛选 - 支持交集和并集
        const matchesCategories = !filters.categories?.length || (() => {
            // 获取梦境的分类键值数组
            const dreamCategoryNames = dream.categories?.map(cat =>
                typeof cat === 'object' ? cat.name : cat
            ) || [];

            return filters.categoryMode === 'AND'
                ? filters.categories.every(filterCat => dreamCategoryNames.includes(filterCat))
                : filters.categories.some(filterCat => dreamCategoryNames.includes(filterCat));
        })();

        // 情绪筛选
        const matchesMood = !filters.mood || dream.mood === filters.mood;

        // 日期范围筛选
        const matchesDateRange = !filters.dateRange?.from || (
            new Date(dream.dream_date) >= filters.dateRange.from &&
            (!filters.dateRange.to || new Date(dream.dream_date) <= filters.dateRange.to)
        );

        // 重复梦境筛选
        const matchesRecurring = filters.isRecurring === undefined ||
            Boolean(dream.is_recurring) === filters.isRecurring;

        // 清醒度等级筛选
        const matchesLucidity = !dream.lucidity_level || (
            dream.lucidity_level >= filters.lucidityRange[0] &&
            dream.lucidity_level <= filters.lucidityRange[1]
        );

        // 清晰度等级筛选
        const matchesClarity = !dream.clarity_level || (
            dream.clarity_level >= filters.clarityRange[0] &&
            dream.clarity_level <= filters.clarityRange[1]
        );

        // 睡眠质量筛选
        const matchesSleepQuality = !filters.sleepQuality ||
            dream.sleep_quality === filters.sleepQuality;

        // 睡眠时长筛选 - 修复数据类型不匹配问题
        const matchesSleepDuration = !filters.sleepDurationRange ||
            (filters.sleepDurationRange[0] === 0 && filters.sleepDurationRange[1] === 24) ||
            (() => {
                if (!dream.sleep_duration) return true; // 没有睡眠时长数据时不过滤

                // 将后端的秒数转换为小时数
                const sleepHours = typeof dream.sleep_duration === 'number'
                    ? dream.sleep_duration / 3600
                    : parseFloat(dream.sleep_duration) / 3600;

                return sleepHours >= filters.sleepDurationRange[0] &&
                    sleepHours <= filters.sleepDurationRange[1];
            })();

        // 标签筛选 - 优化并集筛选逻辑
        const matchesTags = !filters.tags?.length || (() => {
            if (!dream.tags || !Array.isArray(dream.tags)) return false;

            // 获取梦境的所有标签字符串
            const dreamTagStrings = dream.tags.map(dreamTag => {
                const tagString = typeof dreamTag === 'string' ? dreamTag :
                    typeof dreamTag === 'object' && dreamTag.name ? dreamTag.name :
                        String(dreamTag);
                return tagString.toLowerCase().trim();
            });

            // 并集筛选：只要梦境包含任一筛选标签即可
            return filters.tags.some(filterTag => {
                const normalizedFilterTag = filterTag.toLowerCase().trim();
                if (!normalizedFilterTag) return false; // 跳过空标签

                return dreamTagStrings.some(dreamTagString =>
                    dreamTagString.includes(normalizedFilterTag)
                );
            });
        })();

        return matchesCategories && matchesMood && matchesDateRange &&
            matchesRecurring && matchesLucidity && matchesClarity &&
            matchesSleepQuality && matchesSleepDuration && matchesTags;
    }, [searchTerm, filters]);

    // 过滤和排序梦境
    const filteredAndSortedDreams = dreams
        .filter(applyAdvancedFilters)
        .sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.dream_date) - new Date(a.dream_date);
                case 'oldest':
                    return new Date(a.dream_date) - new Date(b.dream_date);
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

    // 渐进式加载处理 - 仅对中等数量的数据启用
    const shouldUseProgressive = filteredAndSortedDreams.length > 20 && filteredAndSortedDreams.length <= 50;
    const { displayedData: progressiveData, isLoading: isProgressive } = useProgressiveLoading(
        shouldUseProgressive ? filteredAndSortedDreams : [],
        30, // 每批加载30个
        150 // 延迟150ms
    );

    // 根据数据量选择显示策略
    const finalDisplayData = shouldUseProgressive ? progressiveData : filteredAndSortedDreams;

    if (loading) {
        return (
            <div className="my-dreams-container">
                <div className="my-dreams-header">
                    <h1 className="my-dreams-title">
                        <Moon className="h-8 w-8" />
                        {t('dreams:list.title', '我的梦境')}
                    </h1>
                </div>
                <div className="dreams-grid">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="dream-card">
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2 mt-2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <MultilingualSeo
                title={t('dreams:list.title', '我的梦境')}
                description={t('dreams:list.subtitle', '浏览和管理你的梦境记录')}
                keywords={t('dreams:list.keywords', '梦境,记录,管理')}
            />
            <div className="my-dreams-container">
                <div className="my-dreams-header">
                    <h1 className="my-dreams-title">
                        <Moon className="h-8 w-8" />
                        {t('dreams:list.title', '我的梦境')}
                    </h1>
                    <Button
                        onClick={() => navigate('/dreams/create')}
                        className="create-dream-button"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        {t('dreams:create.button', '记录新梦境')}
                    </Button>
                </div>

                {/* 统一的搜索、筛选和排序栏 - 与梦境卡片对齐 */}
                <div className="max-w-[1400px] mx-auto">
                    <div className="flex flex-col xl:flex-row gap-2 xl:items-center justify-between relative">
                        {/* 搜索框 - 左侧 */}
                        <div className="xl:flex-shrink-0 xl:w-72">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder={t('dreams:search.placeholder', '搜索梦境标题或内容...')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 h-9 w-full border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                                />
                            </div>
                        </div>

                        {/* 高级筛选系统 - 中间 */}
                        <div className="xl:flex-1 xl:mx-2 relative z-30">
                            <AdvancedFilter
                                filters={filters}
                                onFiltersChange={handleFiltersChange}
                                onResetFilters={handleResetFilters}
                            />
                        </div>

                        {/* 排序功能 - 右侧 */}
                        <div className="xl:flex-shrink-0 xl:w-32">
                            <Select
                                value={sortBy}
                                onValueChange={(value) => {
                                    setSortBy(value);
                                    // 更新显示文本
                                    const displayTexts = {
                                        newest: t('dreams:sort.newest', '最新优先'),
                                        oldest: t('dreams:sort.oldest', '最早优先'),
                                        title: t('dreams:sort.title', '标题排序')
                                    };
                                    setSortDisplayText(displayTexts[value] || t('dreams:sort.default', '默认排序'));
                                }}
                            >
                                <SelectTrigger className="w-full h-9 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                                    <SelectValue>{sortDisplayText}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">{t('dreams:sort.newest', '最新优先')}</SelectItem>
                                    <SelectItem value="oldest">{t('dreams:sort.oldest', '最早优先')}</SelectItem>
                                    <SelectItem value="title">{t('dreams:sort.title', '标题排序')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* 梦境统计 - 与梦境卡片对齐 */}
                <div className="dreams-stats-wrapper">
                    <div className="dreams-stats-compact">
                        <div
                            className="stat-item-compact"
                            onClick={() => navigate('/statistics')}
                            title={t('dreams:stats.viewDetails', '查看详细统计')}
                        >
                            <Sparkles className="stat-icon" />
                            <div className="stat-content">
                                <span className="stat-value">{dreams.length}</span>
                                <span className="stat-label">{t('dreams:stats.total', '总梦境数')}</span>
                            </div>
                        </div>
                        <div
                            className="stat-item-compact"
                            onClick={() => navigate('/statistics')}
                            title={t('dreams:stats.viewDetails', '查看详细统计')}
                        >
                            <Calendar className="stat-icon" />
                            <div className="stat-content">
                                <span className="stat-value">
                                    {dreams.filter(d => {
                                        const today = new Date().toDateString();
                                        return new Date(d.dream_date).toDateString() === today;
                                    }).length}
                                </span>
                                <span className="stat-label">{t('dreams:stats.today', '今日梦境')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 梦境列表 */}
                <div className="mt-6">
                    {filteredAndSortedDreams.length === 0 ? (
                        <div className="empty-state">
                            <Moon className="empty-icon" />
                            <h3 className="empty-title">{t('dreams:list.noDreams', '还没有梦境记录')}</h3>
                            <p className="empty-description">
                                {searchTerm || hasActiveFilters(filters)
                                    ? t('dreams:list.noResults', '没有找到匹配的梦境，试试调整筛选条件')
                                    : t('dreams:list.startRecording', '开始记录你的第一个梦境吧')}
                            </p>
                            {!searchTerm && !hasActiveFilters(filters) && (
                                <Button onClick={() => navigate('/dreams/create')} className="mt-4">
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t('dreams:create.button', '记录梦境')}
                                </Button>
                            )}
                        </div>
                    ) : filteredAndSortedDreams.length > 50 ? (
                        // 大量梦境使用虚拟滚动
                        <Suspense fallback={
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        }>
                            <VirtualizedDreamGrid
                                dreams={filteredAndSortedDreams}
                                onDelete={handleDelete}
                                deletingId={deletingId}
                            />
                        </Suspense>
                    ) : (
                        // 少量梦境使用传统网格布局
                        <>
                            <div className="dreams-grid">
                                {finalDisplayData.map(dream => (
                                    <Card
                                        key={dream.id}
                                        className="dream-card"
                                        onClick={() => navigate(`/dreams/${dream.id}`)}
                                    >
                                        <CardHeader className="dream-card-header">
                                            <div className="dream-card-title-row">
                                                <h3 className="dream-card-title">{dream.title}</h3>
                                                <div className="dream-card-actions" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => navigate(`/dreams/${dream.id}/edit`)}
                                                        className="action-icon"
                                                        title={t('common.edit', '编辑')}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="action-icon delete-icon"
                                                                disabled={deletingId === dream.id}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>{t('common.confirmDelete', '确认删除')}</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    {t('dreams:list.confirmDeleteDescription', '确定要删除梦境 "{title}" 吗？此操作无法撤销。').replace('{title}', dream.title)}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>{t('common.cancel', '取消')}</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(dream.id)}>
                                                                    {t('common.confirmDelete', '确认删除')}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => navigate(`/dreams/${dream.id}`)}
                                                        className="action-icon"
                                                        title={t('common.viewDetails', '查看详情')}
                                                    >
                                                        <Search className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="dream-card-meta">
                                                <span className="meta-item">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(dream.dream_date)}
                                                </span>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="dream-card-content">
                                            <p className="dream-preview">
                                                {truncateContent(dream.content)}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            {shouldUseProgressive && isProgressive && (
                                <div className="flex justify-center items-center py-6">
                                    <div className="animate-pulse flex items-center gap-2">
                                        <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
                                        <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <span className="ml-2 text-sm text-muted-foreground">{t('common.loadingMore', '正在加载更多...')}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default MyDreams; 
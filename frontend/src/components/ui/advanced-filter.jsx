import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    ChevronUp,
    X,
    Filter,
    RotateCcw,
    Calendar as CalendarIcon,
    Tags,
    Brain,
    Heart,
    Clock,
    Bed,
    Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import CategoryModeToggle from '@/components/ui/category-mode-toggle';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useI18nContext } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
import { getCategoryConfig, getMoodConfig } from '@/constants/dreamConstants';

const getSleepQualityOptions = (t) => [
    { value: 'very_poor', label: t('dreams:sleepQuality.very_poor', '很差') },
    { value: 'poor', label: t('dreams:sleepQuality.poor', '较差') },
    { value: 'average', label: t('dreams:sleepQuality.average', '一般') },
    { value: 'good', label: t('dreams:sleepQuality.good', '良好') },
    { value: 'excellent', label: t('dreams:sleepQuality.excellent', '很好') },
];

/**
 * 高级筛选组件
 * 支持多维度筛选条件和实时反馈
 */
const AdvancedFilter = ({
    filters,
    onFiltersChange,
    onResetFilters,
    className
}) => {
    const { t } = useI18nContext();

    // 初始化翻译配置
    const categoryConfig = getCategoryConfig(t);
    const moodConfig = getMoodConfig(t);
    const sleepQualityOptions = getSleepQualityOptions(t);

    const [isExpanded, setIsExpanded] = useState(false);
    const [dateRange, setDateRange] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [moodOpen, setMoodOpen] = useState(false);
    const [sleepOpen, setSleepOpen] = useState(false);

    // 格式化日期显示 - 优化性能
    const formatDateRange = useCallback(() => {
        if (!dateRange?.from) return t('dreams:filters.dateRange', '日期范围');
        if (!dateRange.to) return t('dreams:filters.dateFrom', '从 {date}').replace('{date}', dateRange.from.toLocaleDateString('zh-CN'));
        return `${dateRange.from.toLocaleDateString('zh-CN')} - ${dateRange.to.toLocaleDateString('zh-CN')}`;
    }, [dateRange, t]);

    // 处理分类选择 - 优化性能
    const handleCategoryToggle = useCallback((category) => {
        const currentCategories = filters.categories || [];
        const newCategories = currentCategories.includes(category)
            ? currentCategories.filter(c => c !== category)
            : [...currentCategories, category];

        onFiltersChange({ ...filters, categories: newCategories });
    }, [filters, onFiltersChange]);

    // 处理日期范围变化 - 优化同步逻辑
    const handleDateRangeChange = useCallback((range) => {
        setDateRange(range);
        onFiltersChange({ ...filters, dateRange: range });
    }, [filters, onFiltersChange]);

    // 计算活跃筛选数量
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.categories?.length > 0) count++;
        if (filters.mood) count++;
        if (filters.isRecurring !== undefined) count++;
        if (filters.lucidityRange && (filters.lucidityRange[0] > 1 || filters.lucidityRange[1] < 5)) count++;
        if (filters.clarityRange && (filters.clarityRange[0] > 1 || filters.clarityRange[1] < 5)) count++;
        if (filters.sleepQuality) count++;
        if (filters.sleepDurationRange && (filters.sleepDurationRange[0] > 0 || filters.sleepDurationRange[1] < 24)) count++;
        if (filters.dateRange?.from) count++;
        if (filters.tags?.length > 0) count++;
        return count;
    }, [filters]);

    const hasActiveFilters = activeFiltersCount > 0;

    return (
        <div className={cn("bg-white dark:bg-gray-900 border rounded-lg shadow-sm relative min-h-[40px] overflow-visible", className)}>
            {/* 核心筛选栏 - 紧凑布局 */}
            <div className={cn("px-3 py-1.5 overflow-visible min-h-[40px] flex items-center", isExpanded && "border-b")}>
                <div className="flex flex-wrap items-center gap-2 w-full">
                    {/* 分类选择器 - 最重要 */}
                    <div className="flex items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-9 text-xs">
                                    <Tags className="h-3.5 w-3.5 mr-1.5" />
                                    {filters.categories?.length > 0
                                        ? t('dreams:filters.categoriesCount', '{count} 个分类').replace('{count}', filters.categories.length)
                                        : t('dreams:filters.categories', '分类')
                                    }
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4 z-[100]" sideOffset={5}>
                                {/* 分类模式切换 */}
                                <div className="mb-3">
                                    <CategoryModeToggle
                                        mode={filters.categoryMode}
                                        onChange={(mode) => onFiltersChange({ ...filters, categoryMode: mode })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(categoryConfig).map(([value, config]) => (
                                        <div key={value} className="flex items-center space-x-2">
                                            <Checkbox
                                                checked={filters.categories?.includes(value)}
                                                onCheckedChange={() => handleCategoryToggle(value)}
                                                id={`category-${value}`}
                                            />
                                            <Label
                                                htmlFor={`category-${value}`}
                                                className="text-sm cursor-pointer"
                                            >
                                                <span
                                                    className="inline-block w-2 h-2 rounded-full mr-1"
                                                    style={{ backgroundColor: config.color }}
                                                />
                                                {config.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* 情绪筛选 */}
                    <Popover open={moodOpen} onOpenChange={setMoodOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-9 text-xs">
                                <Heart className="h-3.5 w-3.5 mr-1.5" />
                                {filters.mood ? (moodConfig[filters.mood]?.label || t('dreams:filters.mood', '情绪')) : t('dreams:filters.mood', '情绪')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2 z-[100]" sideOffset={5}>
                            <div className="flex flex-col gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start h-8 text-xs"
                                    onClick={() => {
                                        onFiltersChange({ ...filters, mood: undefined });
                                        setMoodOpen(false);
                                    }}
                                >
                                    {t('dreams:filters.allMoods', '全部情绪')}
                                </Button>
                                {Object.entries(moodConfig).map(([value, config]) => (
                                    <Button
                                        key={value}
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "justify-start h-8 text-xs",
                                            filters.mood === value && "bg-gray-100 dark:bg-gray-800"
                                        )}
                                        onClick={() => {
                                            onFiltersChange({ ...filters, mood: value });
                                            setMoodOpen(false);
                                        }}
                                    >
                                        {config.label}
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* 日期筛选 */}
                    <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-9 text-xs">
                                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                                {formatDateRange()}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[100]" align="start" sideOffset={5}>
                            <div className="p-4">
                                <Calendar
                                    mode="range"
                                    selected={dateRange}
                                    onSelect={handleDateRangeChange}
                                    numberOfMonths={1}
                                    className="rounded-md"
                                />
                            </div>
                            <div className="p-3 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setDateRange(null);
                                        onFiltersChange({ ...filters, dateRange: null });
                                        setShowDatePicker(false);
                                    }}
                                    className="w-full"
                                    size="sm"
                                >
                                    {t('dreams:filters.clearDate', '清除日期')}
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* 睡眠质量筛选 */}
                    <Popover open={sleepOpen} onOpenChange={setSleepOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-9 text-xs">
                                <Bed className="h-3.5 w-3.5 mr-1.5" />
                                {filters.sleepQuality ? (sleepQualityOptions.find(o => o.value === filters.sleepQuality)?.label || t('dreams:filters.sleepQuality', '睡眠质量')) : t('dreams:filters.sleepQuality', '睡眠质量')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2 z-[100]" sideOffset={5}>
                            <div className="flex flex-col gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start h-8 text-xs"
                                    onClick={() => {
                                        onFiltersChange({ ...filters, sleepQuality: undefined });
                                        setSleepOpen(false);
                                    }}
                                >
                                    {t('dreams:filters.allSleepQualities', '全部质量')}
                                </Button>
                                {sleepQualityOptions.map(option => (
                                    <Button
                                        key={option.value}
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "justify-start h-8 text-xs",
                                            filters.sleepQuality === option.value && "bg-gray-100 dark:bg-gray-800"
                                        )}
                                        onClick={() => {
                                            onFiltersChange({ ...filters, sleepQuality: option.value });
                                            setSleepOpen(false);
                                        }}
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* 重复梦境开关 */}
                    <Button
                        variant="outline"
                        className={cn(
                            "h-9 text-xs px-3",
                            filters.isRecurring && "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                        )}
                        onClick={() => onFiltersChange({ ...filters, isRecurring: filters.isRecurring ? undefined : true })}
                    >
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "transition-colors duration-200",
                                filters.isRecurring ? "text-green-700 dark:text-green-300" : ""
                            )}>
                                {t('dreams:filters.recurringDream', '重复梦')}
                            </span>
                            {/* 开关轨道和滑块 */}
                            <div className={cn(
                                "relative w-8 h-4 rounded-full transition-colors duration-200 border",
                                filters.isRecurring
                                    ? "bg-green-500 border-green-500"
                                    : "bg-gray-300 dark:bg-gray-600 border-gray-300 dark:border-gray-600"
                            )}>
                                <div className={cn(
                                    "absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200",
                                    filters.isRecurring ? "translate-x-4" : "translate-x-0.5"
                                )} />
                            </div>
                        </div>
                    </Button>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 ml-auto">
                        {hasActiveFilters && (
                            <Badge variant="secondary" className="text-xs h-6 px-2">
                                {t('dreams:filters.activeFiltersCount', '{count} 个筛选').replace('{count}', activeFiltersCount)}
                            </Badge>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-gray-600 dark:text-gray-300 h-9 text-xs"
                        >
                            <Filter className="h-3.5 w-3.5 mr-1" />
                            {t('dreams:filters.moreFilters', '更多筛选')}
                            {isExpanded ?
                                <ChevronUp className="h-3.5 w-3.5 ml-1" /> :
                                <ChevronDown className="h-3.5 w-3.5 ml-1" />
                            }
                        </Button>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onResetFilters}
                                className="text-gray-600 dark:text-gray-300 h-9 text-xs"
                            >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                {t('dreams:filters.reset', '重置')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* 活跃筛选标签 */}
                {filters.categories?.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-x border-b rounded-b-lg px-3 py-2 z-10 shadow-md">
                        <div className="flex flex-wrap gap-2">
                            {filters.categories.map(category => (
                                <Badge
                                    key={category}
                                    variant="outline"
                                    className="text-xs pl-2 pr-1 py-1 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    style={{
                                        borderColor: categoryConfig[category]?.color,
                                        color: categoryConfig[category]?.color
                                    }}
                                >
                                    <span className="mr-1">{categoryConfig[category]?.label}</span>
                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center rounded-sm w-4 h-4 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleCategoryToggle(category);
                                        }}
                                        aria-label={t('filters.removeCategory', '移除分类').replace('{category}', categoryConfig[category]?.label || category)}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 高级筛选面板 - 使用绝对定位避免影响布局 */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border border-t-0 rounded-b-lg shadow-lg z-50 overflow-hidden"
                    >
                        <div className="p-4 space-y-4">

                            {/* 等级筛选 - 紧凑布局 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center">
                                        <Brain className="h-4 w-4 mr-2" />
                                        {t('dreams:filters.lucidity', '清醒度')}：{filters.lucidityRange?.[0] || 1} - {filters.lucidityRange?.[1] || 5}
                                    </Label>
                                    <Slider
                                        value={filters.lucidityRange || [1, 5]}
                                        onValueChange={(value) =>
                                            onFiltersChange({ ...filters, lucidityRange: value })
                                        }
                                        max={5}
                                        min={1}
                                        step={1}
                                        className="w-full"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center">
                                        <Eye className="h-4 w-4 mr-2" />
                                        {t('dreams:filters.clarity', '清晰度')}：{filters.clarityRange?.[0] || 1} - {filters.clarityRange?.[1] || 5}
                                    </Label>
                                    <Slider
                                        value={filters.clarityRange || [1, 5]}
                                        onValueChange={(value) =>
                                            onFiltersChange({ ...filters, clarityRange: value })
                                        }
                                        max={5}
                                        min={1}
                                        step={1}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            {/* 睡眠时长筛选 - 使用Range Slider */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium flex items-center">
                                    <Clock className="h-4 w-4 mr-2" />
                                    {t('dreams:filters.sleepDuration', '睡眠时长')}：{(filters.sleepDurationRange?.[0] || 0).toFixed(1)} - {(filters.sleepDurationRange?.[1] || 24).toFixed(1)} {t('dreams:filters.hours', '小时')}
                                </Label>
                                <div className="px-2">
                                    <Slider
                                        value={filters.sleepDurationRange || [0, 24]}
                                        onValueChange={(value) =>
                                            onFiltersChange({ ...filters, sleepDurationRange: value })
                                        }
                                        max={24}
                                        min={0}
                                        step={0.1}
                                        className="w-full [&>*]:cursor-pointer"
                                        style={{
                                            '--slider-thumb-size': '16px',
                                            '--slider-track-height': '6px'
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>{t('dreams:filters.hoursRange', '0小时')}</span>
                                    <span>{t('dreams:filters.hoursRangeMax', '24小时')}</span>
                                </div>
                            </div>

                            {/* 标签筛选 */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center">
                                    <Tags className="h-4 w-4 mr-2" />
                                    {t('dreams:filters.tags', '标签')} ({t('dreams:filters.tagsSeparator', '用逗号分隔')})
                                </Label>
                                <Input
                                    placeholder={t('dreams:filters.tagsPlaceholder', '例如: 飞行, 学校, 家人')}
                                    value={filters.tags?.join(', ') || ''}
                                    onChange={(e) => {
                                        const inputValue = e.target.value;

                                        // 处理标签输入，支持逗号结尾
                                        const tags = inputValue
                                            .split(',')
                                            .map(tag => tag.trim())
                                            .filter(tag => tag.length > 0);

                                        // 如果原始输入以逗号结尾，保留空标签以便继续输入
                                        const shouldKeepEmpty = inputValue.endsWith(',') || inputValue.endsWith('，');

                                        onFiltersChange({
                                            ...filters,
                                            tags: tags.length > 0 || shouldKeepEmpty ? tags : undefined
                                        });
                                    }}
                                    className="h-9"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdvancedFilter;

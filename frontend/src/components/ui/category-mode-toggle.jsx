import React from 'react';
import { Plus, Layers } from 'lucide-react';
import { cn } from '@/utils/ui';
import { useI18nContext } from '@/contexts/I18nContext';

/**
 * 分类模式切换组件 - 简约设计
 * 支持交集(AND)和并集(OR)模式切换
 */
const CategoryModeToggle = React.memo(({
    mode = 'OR',
    onChange,
    className
}) => {
    const { t } = useI18nContext();
    const isAnd = mode === 'AND';

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {/* 切换按钮组 */}
            <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1">
                {/* 并集选项 */}
                <button
                    type="button"
                    onClick={() => onChange('OR')}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                        !isAnd
                            ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    )}
                    aria-label={t('dreams:filters.modeUnion', '并集模式')}
                >
                    <Plus className="h-4 w-4" />
                    <span>{t('dreams:filters.modeUnion', '并集')}</span>
                </button>

                {/* 交集选项 */}
                <button
                    type="button"
                    onClick={() => onChange('AND')}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                        isAnd
                            ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    )}
                    aria-label={t('dreams:filters.modeIntersection', '交集模式')}
                >
                    <Layers className="h-4 w-4" />
                    <span>{t('dreams:filters.modeIntersection', '交集')}</span>
                </button>
            </div>

            {/* 简洁的模式说明 */}
            <span className="text-xs text-gray-500 dark:text-gray-400">
                {isAnd ? t('dreams:filters.modeAndDescription', '包含所有分类') : t('dreams:filters.modeOrDescription', '包含任一分类')}
            </span>
        </div>
    );
});

CategoryModeToggle.displayName = 'CategoryModeToggle';

export default CategoryModeToggle;
import React, { memo, useMemo, useEffect, useState, useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Edit, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18nContext } from '@/contexts/I18nContext';

/**
 * 虚拟化梦境网格组件 - React 19优化版本
 * 使用react-window实现大量数据的高效渲染，避免无限更新循环
 */
const VirtualizedDreamGrid = memo(({ dreams, onDelete, deletingId }) => {
    const navigate = useNavigate();
    const { t } = useI18nContext();
    const [windowSize, setWindowSize] = useState(() => ({
        width: typeof window !== 'undefined' ? window.innerWidth : 1200,
        height: typeof window !== 'undefined' ? window.innerHeight : 800
    }));

    // 防抖的窗口尺寸更新
    useEffect(() => {
        let timeoutId;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setWindowSize({
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }, 100);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    // 计算网格布局参数 - 响应式设计，使用稳定的计算
    const gridParams = useMemo(() => {
        const containerWidth = windowSize.width;
        const padding = 32;
        const gap = 24;
        const minCardWidth = 350;
        const maxWidth = 1400;

        const effectiveWidth = Math.min(containerWidth - padding * 2, maxWidth);
        const columnCount = Math.max(1, Math.floor((effectiveWidth + gap) / (minCardWidth + gap)));
        const cardWidth = (effectiveWidth - (columnCount - 1) * gap) / columnCount;

        return {
            columnCount,
            cardWidth,
            cardHeight: 280,
            gap
        };
    }, [windowSize.width]);

    // 格式化日期 - 记忆化优化
    const formatDate = useCallback((dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }, []);

    // 截断内容 - 记忆化优化
    const truncateContent = useCallback((htmlContent, maxLength = 150) => {
        if (!htmlContent) return '';

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const textContent = tempDiv.textContent || tempDiv.innerText || "";

        if (textContent.length <= maxLength) {
            return textContent;
        }
        return textContent.substring(0, maxLength) + '...';
    }, []);

    // 事件处理函数 - 提升到父组件层面避免重复创建
    const handleCardClick = useCallback((dreamId) => {
        navigate(`/dreams/${dreamId}`);
    }, [navigate]);

    const handleEditClick = useCallback((dreamId) => {
        navigate(`/dreams/${dreamId}/edit`);
    }, [navigate]);

    const handleViewClick = useCallback((dreamId) => {
        navigate(`/dreams/${dreamId}`);
    }, [navigate]);

    // 渲染单个梦境卡片 - 简化事件处理，避免钩子在子组件中使用
    const DreamCard = memo(({ columnIndex, rowIndex, style, data }) => {
        const { dreams, columnCount, onDelete, deletingId, onCardClick, onEditClick, onViewClick, formatDate, truncateContent } = data;
        const index = rowIndex * columnCount + columnIndex;

        if (index >= dreams.length) {
            return <div style={style} />; // 空白格子
        }

        const dream = dreams[index];

        return (
            <div style={style}>
                <div style={{
                    padding: '0 12px 24px 12px',
                    height: '100%'
                }}>
                    <Card
                        className="dream-card h-full"
                        onClick={() => onCardClick(dream.id)}
                        style={{ cursor: 'pointer' }}
                    >
                        <CardHeader className="dream-card-header">
                            <div className="dream-card-title-row">
                                <h3 className="dream-card-title">{dream.title}</h3>
                                <div
                                    className="dream-card-actions"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEditClick(dream.id)}
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
                                                <AlertDialogAction onClick={() => onDelete(dream.id)}>
                                                    {t('common.confirmDelete', '确认删除')}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onViewClick(dream.id)}
                                        className="action-icon"
                                        title={t('common.viewDetails', '查看详情')}
                                    >
                                        <Eye className="h-4 w-4" />
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
                </div>
            </div>
        );
    });

    // 计算行数
    const rowCount = Math.ceil(dreams.length / gridParams.columnCount);

    // 如果没有梦境数据，返回空状态
    if (dreams.length === 0) {
        return null;
    }

    return (
        <div className="max-w-[1400px] mx-auto">
            <Grid
                columnCount={gridParams.columnCount}
                columnWidth={gridParams.cardWidth + 24}
                height={Math.min(windowSize.height * 0.7, rowCount * gridParams.cardHeight)} // 响应式高度
                rowCount={rowCount}
                rowHeight={gridParams.cardHeight}
                itemData={{
                    dreams,
                    columnCount: gridParams.columnCount,
                    onDelete,
                    deletingId,
                    onCardClick: handleCardClick,
                    onEditClick: handleEditClick,
                    onViewClick: handleViewClick,
                    formatDate,
                    truncateContent
                }}
                style={{
                    overflowX: 'hidden'
                }}
                overscanRowCount={2} // 预渲染行数优化性能
            >
                {DreamCard}
            </Grid>
        </div>
    );
});

VirtualizedDreamGrid.displayName = 'VirtualizedDreamGrid';

export default VirtualizedDreamGrid;

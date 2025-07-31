import { useState, useCallback, useRef } from 'react';

/**
 * 撤销/重做操作管理Hook
 * 支持图片删除和恢复的撤销/重做功能
 */
export const useUndoRedo = (maxHistorySize = 50) => {
    const [history, setHistory] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const isPerformingAction = useRef(false);

    // 添加操作到历史记录
    const addAction = useCallback((action) => {
        if (isPerformingAction.current) return;

        setHistory(prev => {
            const newHistory = prev.slice(0, currentIndex + 1);
            newHistory.push({
                ...action,
                timestamp: Date.now(),
                id: Math.random().toString(36).substr(2, 9)
            });

            // 限制历史记录大小
            if (newHistory.length > maxHistorySize) {
                newHistory.shift();
                return newHistory;
            }

            return newHistory;
        });

        setCurrentIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
    }, [currentIndex, maxHistorySize]);

    // 撤销操作
    const undo = useCallback(async () => {
        if (currentIndex < 0) return false;

        const action = history[currentIndex];
        if (!action) return false;

        isPerformingAction.current = true;

        try {
            if (action.undo) {
                await action.undo();
            }
            setCurrentIndex(prev => prev - 1);
            return true;
        } catch (error) {
            console.error('撤销操作失败:', error);
            return false;
        } finally {
            isPerformingAction.current = false;
        }
    }, [currentIndex, history]);

    // 重做操作
    const redo = useCallback(async () => {
        if (currentIndex >= history.length - 1) return false;

        const nextIndex = currentIndex + 1;
        const action = history[nextIndex];
        if (!action) return false;

        isPerformingAction.current = true;

        try {
            if (action.redo) {
                await action.redo();
            }
            setCurrentIndex(nextIndex);
            return true;
        } catch (error) {
            console.error('重做操作失败:', error);
            return false;
        } finally {
            isPerformingAction.current = false;
        }
    }, [currentIndex, history]);

    // 清空历史记录
    const clearHistory = useCallback(() => {
        setHistory([]);
        setCurrentIndex(-1);
    }, []);

    // 获取当前状态
    const canUndo = currentIndex >= 0;
    const canRedo = currentIndex < history.length - 1;
    const currentAction = history[currentIndex];
    const nextAction = history[currentIndex + 1];

    return {
        // 操作方法
        addAction,
        undo,
        redo,
        clearHistory,

        // 状态信息
        canUndo,
        canRedo,
        currentAction,
        nextAction,
        history,
        currentIndex,

        // 工具方法
        getUndoDescription: () => currentAction?.description || '撤销',
        getRedoDescription: () => nextAction?.description || '重做',
        getHistorySize: () => history.length
    };
};

/**
 * 图片删除相关的撤销/重做Hook
 * 专门用于处理图片的软删除和恢复操作
 */
export const useImageUndoRedo = () => {
    const [pendingDeletes, setPendingDeletes] = useState(new Set());
    const undoRedo = useUndoRedo();

    const addImageToDeleteList = useCallback((imageUrl) => {
        setPendingDeletes(prev => new Set(prev).add(imageUrl));

        undoRedo.addAction({
            type: 'image_delete',
            description: `删除图片`,
            imageUrl,
            undo: () => {
                setPendingDeletes(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(imageUrl);
                    return newSet;
                });
            },
            redo: () => {
                setPendingDeletes(prev => new Set(prev).add(imageUrl));
            }
        });
    }, [undoRedo]);

    const removeImageFromDeleteList = useCallback((imageUrl) => {
        setPendingDeletes(prev => {
            const newSet = new Set(prev);
            newSet.delete(imageUrl);
            return newSet;
        });
    }, []);

    const isImagePendingDelete = useCallback((url) => {
        return pendingDeletes.has(url);
    }, [pendingDeletes]);

    const clearPendingDeletes = useCallback(() => {
        setPendingDeletes(new Set());
        undoRedo.clearHistory();
    }, [undoRedo]);

    return {
        ...undoRedo,
        addImageToDeleteList,
        removeImageFromDeleteList,
        isImagePendingDelete,
        clearPendingDeletes,
        pendingDeletes: Array.from(pendingDeletes),
    };
};

export default useUndoRedo; 
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const ResizableEditor = ({
    children,
    className,
    isFullscreen,
    minHeight = 300,
    maxHeight = 800,
    defaultHeight = 400,
    ...props
}) => {
    const [height, setHeight] = useState(defaultHeight);
    const [isResizing, setIsResizing] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef(null);
    const resizeStartY = useRef(0);
    const initialHeight = useRef(defaultHeight);
    const rafId = useRef(null);
    const lastUpdateTime = useRef(0);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        setIsResizing(true);
        resizeStartY.current = e.clientY;
        initialHeight.current = height;

        // 设置全局样式
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        document.body.style.pointerEvents = 'none';

        // 添加临时样式类
        document.body.classList.add('resizing-editor');
    }, [height]);

    const handleMouseMove = useCallback((e) => {
        if (!isResizing) return;

        // 节流：限制更新频率到60fps
        const now = performance.now();
        if (now - lastUpdateTime.current < 16) return;
        lastUpdateTime.current = now;

        // 取消之前的动画帧
        if (rafId.current) {
            cancelAnimationFrame(rafId.current);
        }

        // 使用 requestAnimationFrame 优化性能
        rafId.current = requestAnimationFrame(() => {
            const deltaY = e.clientY - resizeStartY.current;
            const newHeight = Math.max(
                minHeight,
                Math.min(maxHeight, initialHeight.current + deltaY)
            );

            // 只在高度真正改变时更新
            if (Math.abs(newHeight - height) > 1) {
                setHeight(newHeight);
            }
        });
    }, [isResizing, minHeight, maxHeight, height]);

    const handleMouseUp = useCallback(() => {
        if (!isResizing) return;

        setIsResizing(false);

        // 恢复全局样式
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.pointerEvents = '';
        document.body.classList.remove('resizing-editor');

        // 清理动画帧
        if (rafId.current) {
            cancelAnimationFrame(rafId.current);
            rafId.current = null;
        }
    }, [isResizing]);

    // 使用passive事件监听器优化性能
    useEffect(() => {
        if (isResizing) {
            const options = { passive: true, capture: true };
            document.addEventListener('mousemove', handleMouseMove, options);
            document.addEventListener('mouseup', handleMouseUp, options);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove, options);
                document.removeEventListener('mouseup', handleMouseUp, options);

                // 清理动画帧
                if (rafId.current) {
                    cancelAnimationFrame(rafId.current);
                    rafId.current = null;
                }
            };
        }
    }, [isResizing, handleMouseMove, handleMouseUp]);

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            if (rafId.current) {
                cancelAnimationFrame(rafId.current);
            }
            // 确保清理全局样式
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.body.style.pointerEvents = '';
            document.body.classList.remove('resizing-editor');
        };
    }, []);

    // 键盘快捷键调整大小
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.ctrlKey && e.shiftKey) {
                let newHeight = height;
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    newHeight = Math.min(maxHeight, height + 50);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    newHeight = Math.max(minHeight, height - 50);
                }
                if (newHeight !== height) {
                    setHeight(newHeight);
                }
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [height, minHeight, maxHeight]);

    // 全屏模式下不显示调整大小功能
    if (isFullscreen) {
        return (
            <div className={cn('resizable-editor-fullscreen', className)} {...props}>
                {children}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn('resizable-editor-container', className)}
            {...props}
        >
            <div
                className="resizable-editor-content"
                style={{
                    height: `${height}px`,
                    minHeight: `${minHeight}px`,
                    maxHeight: `${maxHeight}px`,
                    transition: isResizing ? 'none' : 'height 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {children}
            </div>

            <div
                className={cn(
                    'resizable-editor-handle',
                    isResizing && 'resizable-editor-handle-active',
                    isHovering && 'resizable-editor-handle-hover'
                )}
                onMouseDown={handleMouseDown}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                title="拖拽调整高度"
            >
                <div className="resizable-editor-handle-line">
                    <GripHorizontal className="resizable-editor-handle-icon" />
                </div>
            </div>
        </div>
    );
};

export { ResizableEditor }; 
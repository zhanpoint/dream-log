import React, { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import { GripHorizontal } from 'lucide-react';
import { cn } from '@/utils/ui';

const ResizableTextarea = forwardRef(({
    className,
    minHeight = 120,
    maxHeight = 600,
    defaultHeight = 120,
    ...props
}, ref) => {
    const [height, setHeight] = useState(defaultHeight);
    const [isResizing, setIsResizing] = useState(false);
    const textareaRef = useRef(null);
    const resizeStartY = useRef(0);
    const initialHeight = useRef(defaultHeight);
    const rafId = useRef(null);
    const lastUpdateTime = useRef(0);

    // 组合ref - 直接指向textarea元素
    useEffect(() => {
        if (ref) {
            if (typeof ref === 'function') {
                ref(textareaRef.current);
            } else {
                ref.current = textareaRef.current;
            }
        }
    }, [ref]);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        setIsResizing(true);
        resizeStartY.current = e.clientY;
        initialHeight.current = height;

        // 设置全局样式，防止文本选择和提高性能
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        document.body.style.pointerEvents = 'none';
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

            // 只在高度真正改变时更新（减少不必要的重渲染）
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
            // 只在textarea获得焦点时响应快捷键
            if (document.activeElement === textareaRef.current && e.ctrlKey && e.shiftKey) {
                let newHeight = height;
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    newHeight = Math.min(maxHeight, height + 30);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    newHeight = Math.max(minHeight, height - 30);
                }
                if (newHeight !== height) {
                    setHeight(newHeight);
                }
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [height, minHeight, maxHeight]);

    return (
        <div className="resizable-textarea-wrapper">
            <textarea
                ref={textareaRef}
                className={cn('resizable-textarea', className)}
                style={{
                    height: `${height}px`,
                    minHeight: `${minHeight}px`,
                    maxHeight: `${maxHeight}px`,
                    resize: 'none',
                    transition: isResizing ? 'none' : 'height 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                {...props}
            />

            <div
                className="resizable-textarea-handle"
                onMouseDown={handleMouseDown}
                title="拖拽调整高度"
            >
                <div className="resizable-textarea-handle-line">
                    <GripHorizontal className="resizable-textarea-handle-icon" />
                </div>
            </div>
        </div>
    );
});

ResizableTextarea.displayName = 'ResizableTextarea';

export { ResizableTextarea };
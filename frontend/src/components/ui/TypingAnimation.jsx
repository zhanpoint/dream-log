import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * React 19 最佳实践的打字动画组件
 * 解决重复闪烁和性能问题
 * @param {Object} props - 组件属性
 * @param {string} props.children - 要显示的文本
 * @param {string} props.className - 自定义类名
 * @param {number} props.duration - 每个字符的打字间隔（毫秒）
 * @param {number} props.delay - 动画开始前的延迟（毫秒）
 * @param {React.ElementType} props.as - 渲染的元素类型
 * @param {boolean} props.startOnView - 是否在进入视口时开始动画
 * @param {Function} props.onComplete - 动画完成回调
 */
const TypingAnimationComponent = ({
    children,
    className,
    duration = 80,
    delay = 0,
    as: Component = 'h1',
    startOnView = false,
    onComplete,
    ...props
}) => {
    // 使用 motion.h1 作为默认组件
    const MotionComponent = motion[Component] || motion.div;

    // 使用 useRef 存储稳定的状态，避免重渲染
    const animationStateRef = useRef({
        hasStarted: false,
        isCompleted: false,
        intervalId: null,
        timeoutId: null
    });

    const [displayedText, setDisplayedText] = useState('');
    const [showCursor, setShowCursor] = useState(false);
    const elementRef = useRef(null);

    const isInView = useInView(elementRef, {
        amount: 0.3,
        once: true,
    });

    // 使用 useCallback 缓存清理函数
    const cleanup = useCallback(() => {
        const state = animationStateRef.current;
        if (state.intervalId) {
            clearInterval(state.intervalId);
            state.intervalId = null;
        }
        if (state.timeoutId) {
            clearTimeout(state.timeoutId);
            state.timeoutId = null;
        }
    }, []);

    // 使用 useCallback 缓存启动动画函数
    const startAnimation = useCallback(() => {
        const state = animationStateRef.current;

        // 防止重复启动
        if (state.hasStarted || state.isCompleted) {
            return;
        }

        const text = children.toString();

        // 如果文本为空，直接完成
        if (!text.length) {
            state.isCompleted = true;
            if (onComplete) {
                onComplete();
            }
            return;
        }

        state.hasStarted = true;
        setShowCursor(true);

        let currentIndex = 0;

        const typeCharacter = () => {
            if (currentIndex <= text.length) {
                setDisplayedText(text.substring(0, currentIndex));
                currentIndex++;

                if (currentIndex > text.length) {
                    // 动画完成
                    cleanup();
                    state.isCompleted = true;
                    setShowCursor(false);

                    if (onComplete) {
                        onComplete();
                    }
                }
            }
        };

        // 启动打字动画
        state.intervalId = setInterval(typeCharacter, duration);

        // 立即显示第一个字符
        typeCharacter();
    }, [children, duration, onComplete, cleanup]);

    // 主要动画启动逻辑
    useEffect(() => {
        const state = animationStateRef.current;

        // 如果已经完成，直接显示完整文本
        if (state.isCompleted) {
            setDisplayedText(children.toString());
            setShowCursor(false);
            return;
        }

        // 清理之前的定时器
        cleanup();

        if (!startOnView) {
            // 不依赖视口，延迟后启动
            state.timeoutId = setTimeout(startAnimation, delay);
        } else if (isInView) {
            // 依赖视口且在视口内，延迟后启动
            state.timeoutId = setTimeout(startAnimation, delay);
        }

        // 组件卸载时的清理函数
        return cleanup;
    }, [startOnView, isInView, delay, startAnimation, cleanup, children]);

    // 组件卸载时确保清理
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return (
        <MotionComponent
            ref={elementRef}
            className={cn(
                'text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight tracking-tight mb-6',
                className,
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            {...props}
        >
            <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 dark:from-white dark:via-purple-200 dark:to-pink-200 light:from-gray-800 light:via-purple-600 light:to-pink-600 bg-clip-text text-transparent">
                {displayedText}
            </span>
            {showCursor && (
                <span
                    className="inline-block w-1 h-[1em] ml-1 bg-gradient-to-b from-purple-400 to-pink-400 animate-pulse"
                    style={{ verticalAlign: 'text-bottom' }}
                />
            )}
        </MotionComponent>
    );
};

// 使用 React.memo 优化性能，避免不必要的重渲染
export const TypingAnimation = memo(TypingAnimationComponent, (prevProps, nextProps) => {
    // 自定义比较函数，只有关键属性变化时才重渲染
    return (
        prevProps.children === nextProps.children &&
        prevProps.duration === nextProps.duration &&
        prevProps.delay === nextProps.delay &&
        prevProps.startOnView === nextProps.startOnView &&
        prevProps.className === nextProps.className
    );
});
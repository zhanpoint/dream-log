import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 自动滚动 Hook
 * 提供自动滚动到底部功能，当用户手动滚动时会禁用自动滚动
 */
export function useAutoScroll(options = {}) {
    const { offset = 20, smooth = false, content } = options;
    const scrollRef = useRef(null);
    const lastContentHeight = useRef(0);
    const userHasScrolled = useRef(false);

    const [scrollState, setScrollState] = useState({
        isAtBottom: true,
        autoScrollEnabled: true,
    });

    const checkIsAtBottom = useCallback(
        (element) => {
            const { scrollTop, scrollHeight, clientHeight } = element;
            const distanceToBottom = Math.abs(
                scrollHeight - scrollTop - clientHeight
            );
            return distanceToBottom <= offset;
        },
        [offset]
    );

    const scrollToBottom = useCallback(
        (instant = false) => {
            if (!scrollRef.current) return;

            const targetScrollTop =
                scrollRef.current.scrollHeight - scrollRef.current.clientHeight;

            if (instant) {
                scrollRef.current.scrollTop = targetScrollTop;
            } else {
                scrollRef.current.scrollTo({
                    top: targetScrollTop,
                    behavior: smooth ? 'smooth' : 'auto',
                });
            }

            setScrollState({
                isAtBottom: true,
                autoScrollEnabled: true,
            });
            userHasScrolled.current = false;
        },
        [smooth]
    );

    const handleScroll = useCallback(() => {
        if (!scrollRef.current) return;

        const atBottom = checkIsAtBottom(scrollRef.current);

        setScrollState((prev) => ({
            isAtBottom: atBottom,
            // 重新启用自动滚动如果在底部
            autoScrollEnabled: atBottom ? true : prev.autoScrollEnabled,
        }));
    }, [checkIsAtBottom]);

    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;

        element.addEventListener('scroll', handleScroll, { passive: true });
        return () => element.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // 内容变化时自动滚动
    useEffect(() => {
        const scrollElement = scrollRef.current;
        if (!scrollElement) return;

        const currentHeight = scrollElement.scrollHeight;
        const hasNewContent = currentHeight !== lastContentHeight.current;

        if (hasNewContent) {
            if (scrollState.autoScrollEnabled) {
                requestAnimationFrame(() => {
                    scrollToBottom(lastContentHeight.current === 0);
                });
            }
            lastContentHeight.current = currentHeight;
        }
    }, [content, scrollState.autoScrollEnabled, scrollToBottom]);

    // 监听容器大小变化
    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;

        const resizeObserver = new ResizeObserver(() => {
            if (scrollState.autoScrollEnabled) {
                scrollToBottom(true);
            }
        });

        resizeObserver.observe(element);
        return () => resizeObserver.disconnect();
    }, [scrollState.autoScrollEnabled, scrollToBottom]);

    const disableAutoScroll = useCallback(() => {
        const atBottom = scrollRef.current
            ? checkIsAtBottom(scrollRef.current)
            : false;

        // 只有在不在底部时才禁用
        if (!atBottom) {
            userHasScrolled.current = true;
            setScrollState((prev) => ({
                ...prev,
                autoScrollEnabled: false,
            }));
        }
    }, [checkIsAtBottom]);

    return {
        scrollRef,
        isAtBottom: scrollState.isAtBottom,
        autoScrollEnabled: scrollState.autoScrollEnabled,
        scrollToBottom: () => scrollToBottom(false),
        disableAutoScroll,
    };
}

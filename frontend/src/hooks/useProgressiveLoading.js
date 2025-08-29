import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * 渐进式加载钩子 - React 19优化版本
 * 避免循环依赖，使用 ref 和 useMemo 优化性能
 */
export const useProgressiveLoading = (initialData = [], batchSize = 30, delay = 150) => {
    const [displayedData, setDisplayedData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const currentIndexRef = useRef(0);
    const dataHashRef = useRef('');

    // 生成数据指纹，用于检测数据变化
    const dataHash = useMemo(() => {
        return `${initialData.length}-${JSON.stringify(initialData.slice(0, 3).map(item => item?.id || item))}`;
    }, [initialData]);

    // 数据变化时重置状态
    useEffect(() => {
        if (dataHash !== dataHashRef.current) {
            dataHashRef.current = dataHash;
            currentIndexRef.current = 0;
            setIsLoading(false);

            // 直接显示小数据集，大数据集启用渐进式加载
            if (initialData.length <= 50) {
                setDisplayedData(initialData);
            } else {
                // 启动渐进式加载
                setDisplayedData([]);
                setIsLoading(true);

                // 立即显示第一批
                const firstBatch = initialData.slice(0, batchSize);
                setDisplayedData(firstBatch);
                currentIndexRef.current = batchSize;

                // 延迟加载后续批次
                if (initialData.length > batchSize) {
                    const loadNextBatch = () => {
                        const nextIndex = currentIndexRef.current;
                        if (nextIndex >= initialData.length) {
                            setIsLoading(false);
                            return;
                        }

                        const nextBatch = initialData.slice(nextIndex, nextIndex + batchSize);
                        setDisplayedData(prev => [...prev, ...nextBatch]);
                        currentIndexRef.current = nextIndex + batchSize;

                        if (nextIndex + batchSize >= initialData.length) {
                            setIsLoading(false);
                        } else {
                            // 继续加载下一批
                            setTimeout(loadNextBatch, delay);
                        }
                    };

                    setTimeout(loadNextBatch, delay);
                } else {
                    setIsLoading(false);
                }
            }
        }
    }, [dataHash, initialData, batchSize, delay]);

    return {
        displayedData,
        isLoading,
        hasMore: currentIndexRef.current < initialData.length,
        progress: initialData.length > 0 ? Math.min(100, (currentIndexRef.current / initialData.length) * 100) : 0
    };
};

export default useProgressiveLoading;

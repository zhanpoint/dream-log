/**
 * useAsyncData - 通用异步数据加载 hook
 * 
 * 特性：
 * - 自动处理 loading / error 状态
 * - 支持依赖变化时重新加载
 * - 请求竞态保护（快速切换参数时丢弃过期响应）
 * - 支持初始数据（缓存命中时无闪烁）
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface UseAsyncDataOptions<T> {
  /** 初始数据（如从缓存读到则直接展示，跳过 loading 状态） */
  initialData?: T;
  /** 依赖项变化时是否显示 loading（false = 静默刷新，保持旧数据直到新数据到来） */
  showLoadingOnRefetch?: boolean;
}

interface UseAsyncDataResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  options: UseAsyncDataOptions<T> = {}
): UseAsyncDataResult<T> {
  const { initialData, showLoadingOnRefetch = true } = options;
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  const requestIdRef = useRef(0);

  // 保持 fetcher 引用最新，避免闭包陷阱
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const load = useCallback(() => {
    const id = ++requestIdRef.current;
    if (showLoadingOnRefetch || data === undefined) {
      setLoading(true);
    }
    setError(null);

    fetcherRef.current()
      .then((result) => {
        if (id !== requestIdRef.current) return; // 丢弃过期请求
        setData(result);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (id !== requestIdRef.current) return;
        setError(err);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}

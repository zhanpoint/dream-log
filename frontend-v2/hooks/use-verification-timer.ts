"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * 验证码倒计时配置
 */
export interface VerificationTimerOptions {
  /** 倒计时时长(秒) */
  duration?: number;
  /** 倒计时结束回调 */
  onComplete?: () => void;
}

/**
 * 验证码倒计时 Hook
 * 
 * @example
 * ```tsx
 * const { seconds, isRunning, start, reset } = useVerificationTimer({
 *   duration: 60,
 *   onComplete: () => console.log("可以重新发送了"),
 * });
 * 
 * return (
 *   <button onClick={start} disabled={isRunning}>
 *     {isRunning ? `重新发送 (${seconds}秒)` : "发送验证码"}
 *   </button>
 * );
 * ```
 */
export function useVerificationTimer(
  options: VerificationTimerOptions = {}
) {
  const { duration = 60, onComplete } = options;

  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  // 保持 onComplete 引用最新
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  /**
   * 清理定时器
   */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * 开始倒计时
   */
  const start = useCallback(() => {
    clearTimer();
    setSeconds(duration);
    setIsRunning(true);

    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          
          // 调用完成回调
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [duration, clearTimer]);

  /**
   * 重置倒计时
   */
  const reset = useCallback(() => {
    clearTimer();
    setSeconds(0);
    setIsRunning(false);
  }, [clearTimer]);

  /**
   * 暂停倒计时
   */
  const pause = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  /**
   * 恢复倒计时
   */
  const resume = useCallback(() => {
    if (seconds > 0 && !isRunning) {
      setIsRunning(true);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearTimer();
            setIsRunning(false);
            
            if (onCompleteRef.current) {
              onCompleteRef.current();
            }
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [seconds, isRunning, clearTimer]);

  /**
   * 组件卸载时清理
   */
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    /** 剩余秒数 */
    seconds,
    /** 是否正在倒计时 */
    isRunning,
    /** 是否可以重新发送 */
    canResend: !isRunning && seconds === 0,
    /** 开始倒计时 */
    start,
    /** 重置倒计时 */
    reset,
    /** 暂停倒计时 */
    pause,
    /** 恢复倒计时 */
    resume,
  };
}

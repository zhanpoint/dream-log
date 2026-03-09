"use client";

import { useTranslation } from "@/node_modules/react-i18next";
import { useCallback } from "react";
import { toast } from "sonner";
import { getErrorTranslationKey } from "@/lib/auth";

/**
 * 表单错误处理 Hook
 * 
 * 提供统一的错误提示和翻译功能
 * 
 * @example
 * ```tsx
 * const { showError, showSuccess, translateError } = useFormError();
 * 
 * try {
 *   await authAPI.login(email, password);
 *   showSuccess("auth.loginSuccess");
 * } catch (error) {
 *   showError(error);
 * }
 * ```
 */
export function useFormError() {
  const { t } = useTranslation();

  /**
   * 翻译错误消息
   */
  const translateError = useCallback(
    (error: any): string => {
      if (typeof error === "string") {
        // 如果是翻译键,直接翻译
        if (error.startsWith("auth.") || error.startsWith("common.")) {
          return t(error);
        }
        // 否则返回原始字符串
        return error;
      }

      // 使用错误处理器获取翻译键
      const translationKey = getErrorTranslationKey(error);
      return t(translationKey);
    },
    [t]
  );

  /**
   * 显示错误提示
   */
  const showError = useCallback(
    (error: any, options?: { duration?: number }) => {
      const message = translateError(error);
      toast.error(message, {
        duration: options?.duration || 4000,
      });
    },
    [translateError]
  );

  /**
   * 显示成功提示
   */
  const showSuccess = useCallback(
    (messageKey: string, options?: { duration?: number }) => {
      const message = t(messageKey);
      toast.success(message, {
        duration: options?.duration || 3000,
      });
    },
    [t]
  );

  /**
   * 显示信息提示
   */
  const showInfo = useCallback(
    (messageKey: string, options?: { duration?: number }) => {
      const message = t(messageKey);
      toast.info(message, {
        duration: options?.duration || 3000,
      });
    },
    [t]
  );

  /**
   * 显示警告提示
   */
  const showWarning = useCallback(
    (messageKey: string, options?: { duration?: number }) => {
      const message = t(messageKey);
      toast.warning(message, {
        duration: options?.duration || 3000,
      });
    },
    [t]
  );

  return {
    /** 翻译错误消息 */
    translateError,
    /** 显示错误提示 */
    showError,
    /** 显示成功提示 */
    showSuccess,
    /** 显示信息提示 */
    showInfo,
    /** 显示警告提示 */
    showWarning,
    /** 翻译函数 */
    t,
  };
}

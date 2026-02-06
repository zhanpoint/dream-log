"use client";

import { useState, useCallback } from "react";
import { authAPI, AuthHelpers } from "@/lib/auth";

/**
 * 认证步骤枚举
 */
export type AuthStep =
  | "email" // 输入邮箱
  | "method-selection" // 选择认证方式
  | "password-input" // 输入密码
  | "code-input" // 输入验证码
  | "create-password"; // 创建密码(注册)

/**
 * 认证模式
 */
export type AuthMode = "login" | "signup" | "unknown";

/**
 * 认证方法
 */
export type AuthMethod = "password" | "code" | "oauth";

/**
 * 认证流程状态
 */
export interface AuthFlowState {
  // 当前步骤
  step: AuthStep;
  // 认证模式
  mode: AuthMode;
  // 选择的认证方法
  method: AuthMethod | null;
  // 用户邮箱
  email: string;
  // 用户姓名
  name: string;
  // 用户是否设置过密码
  hasPassword: boolean;
  // 加载状态
  isLoading: boolean;
  // 错误信息
  error: string | null;
  // 历史步骤栈(用于返回)
  history: AuthStep[];
}

/**
 * 认证流程 Hook
 */
export function useAuthFlow() {
  const [state, setState] = useState<AuthFlowState>({
    step: "email",
    mode: "unknown",
    method: null,
    email: "",
    name: "",
    hasPassword: false,
    isLoading: false,
    error: null,
    history: [],
  });

  /**
   * 设置加载状态
   */
  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  /**
   * 设置错误
   */
  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error, isLoading: false }));
  }, []);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * 导航到新步骤
   */
  const navigateTo = useCallback((step: AuthStep, addToHistory: boolean = true) => {
    setState((prev) => ({
      ...prev,
      step,
      error: null,
      history: addToHistory ? [...prev.history, prev.step] : prev.history,
    }));
  }, []);

  /**
   * 返回上一步
   */
  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.history.length === 0) {
        return prev;
      }

      const newHistory = [...prev.history];
      const previousStep = newHistory.pop()!;

      return {
        ...prev,
        step: previousStep,
        history: newHistory,
        error: null,
      };
    });
  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setState({
      step: "email",
      mode: "unknown",
      method: null,
      email: "",
      name: "",
      hasPassword: false,
      isLoading: false,
      error: null,
      history: [],
    });
  }, []);

  /**
   * 步骤 1: 提交邮箱,检查是否已注册
   */
  const submitEmail = useCallback(async (email: string, name?: string) => {
    setLoading(true);
    clearError();

    try {
      const response = await authAPI.checkEmailExists(email);

      setState((prev) => ({
        ...prev,
        email,
        name: name || prev.name,
        mode: response.exists ? "login" : "signup",
        hasPassword: response.has_password || false,
        isLoading: false,
      }));

      // 导航到方法选择页
      navigateTo("method-selection");

      return response.exists;
    } catch (error: any) {
      setError(error.translationKey || "auth.unknownError");
      return null;
    }
  }, [setLoading, clearError, navigateTo, setError]);

  /**
   * 步骤 2: 选择认证方法
   */
  const selectMethod = useCallback((method: AuthMethod) => {
    setState((prev) => ({ ...prev, method, error: null }));

    if (method === "password") {
      // 登录模式且用户未设置密码 -> 引导用户设置密码(创建密码页面)
      // 注册模式 -> 创建密码
      // 登录模式且已设置密码 -> 输入密码登录
      if (state.mode === "signup" || (state.mode === "login" && !state.hasPassword)) {
        navigateTo("create-password");
      } else {
        navigateTo("password-input");
      }
    } else if (method === "code") {
      navigateTo("code-input");
    }
  }, [state.mode, state.hasPassword, navigateTo]);

  /**
   * 步骤 3a: 密码登录
   */
  const loginWithPassword = useCallback(async (password: string) => {
    setLoading(true);
    clearError();

    try {
      const response = await authAPI.loginWithPassword(state.email, password);
      AuthHelpers.handleLoginSuccess(response);
      return true;
    } catch (error: any) {
      setError(error.translationKey || "auth.invalidCredentials");
      return false;
    }
  }, [state.email, setLoading, clearError, setError]);

  /**
   * 步骤 3b: 密码注册(需要先验证密码强度)
   */
  const createPasswordAndSendCode = useCallback(async (password: string) => {
    setLoading(true);
    clearError();

    try {
      // 可选: 调用后端验证密码强度
      // await authAPI.validatePasswordStrength(password);

      // 发送验证码
      await authAPI.sendVerificationCode(state.email, "signup");

      // 暂存密码(在内存中)
      setState((prev) => ({ ...prev, isLoading: false }));

      // 导航到验证码输入页
      navigateTo("code-input");

      return password; // 返回密码供后续使用
    } catch (error: any) {
      setError(error.translationKey || "auth.unknownError");
      return null;
    }
  }, [state.email, setLoading, clearError, setError, navigateTo]);

  /**
   * 步骤 4a: 验证码登录
   */
  const loginWithCode = useCallback(async (code: string) => {
    setLoading(true);
    clearError();

    try {
      const response = await authAPI.loginWithCode(state.email, code);
      AuthHelpers.handleLoginSuccess(response);
      return true;
    } catch (error: any) {
      setError(error.translationKey || "auth.verificationCodeInvalid");
      return false;
    }
  }, [state.email, setLoading, clearError, setError]);

  /**
   * 步骤 4b: 验证码注册(仅验证码)
   */
  const signupWithCode = useCallback(async (code: string) => {
    setLoading(true);
    clearError();

    try {
      const response = await authAPI.signupWithCode(
        state.email,
        code,
        state.name
      );
      AuthHelpers.handleLoginSuccess(response);
      return true;
    } catch (error: any) {
      setError(error.translationKey || "auth.verificationCodeInvalid");
      return false;
    }
  }, [state.email, state.name, setLoading, clearError, setError]);

  /**
   * 步骤 4c: 验证码注册(密码+验证码)
   */
  const signupWithPasswordAndCode = useCallback(
    async (password: string, code: string) => {
      setLoading(true);
      clearError();

      try {
        const response = await authAPI.signupWithPassword(
          state.email,
          password,
          code,
          state.name
        );
        AuthHelpers.handleLoginSuccess(response);
        return true;
      } catch (error: any) {
        setError(error.translationKey || "auth.verificationCodeInvalid");
        return false;
      }
    },
    [state.email, state.name, setLoading, clearError, setError]
  );

  /**
   * 发送验证码
   */
  const sendVerificationCode = useCallback(async () => {
    setLoading(true);
    clearError();

    try {
      const purpose = state.mode === "signup" ? "signup" : "login";
      await authAPI.sendVerificationCode(state.email, purpose);
      setState((prev) => ({ ...prev, isLoading: false }));
      return true;
    } catch (error: any) {
      setError(error.translationKey || "auth.unknownError");
      return false;
    }
  }, [state.email, state.mode, setLoading, clearError, setError]);

  /**
   * 忘记密码 - 切换到验证码流程
   */
  const forgotPassword = useCallback(() => {
    setState((prev) => ({ ...prev, method: "code", error: null }));
    navigateTo("code-input");
  }, [navigateTo]);

  /**
   * Google OAuth 登录
   */
  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    clearError();

    try {
      const authUrl = await authAPI.initiateGoogleOAuth();
      // 跳转到 Google OAuth
      if (typeof window !== "undefined") {
        window.location.href = authUrl;
      }
    } catch (error: any) {
      setError(error.translationKey || "auth.unknownError");
    }
  }, [setLoading, clearError, setError]);

  /**
   * 判断是否可以返回
   */
  const canGoBack = state.history.length > 0;

  return {
    // 状态
    ...state,
    canGoBack,

    // 导航
    navigateTo,
    goBack,
    reset,

    // 流程操作
    submitEmail,
    selectMethod,
    loginWithPassword,
    createPasswordAndSendCode,
    loginWithCode,
    signupWithCode,
    signupWithPasswordAndCode,
    sendVerificationCode,
    forgotPassword,
    loginWithGoogle,

    // 工具函数
    setError,
    clearError,
  };
}

"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthFlow, useVerificationTimer, useFormError, type AuthMethod } from "@/hooks/auth";
import { AuthHelpers, AuthToken } from "@/lib/auth-api";
import { EmailStep } from "@/components/auth/steps/email-step";
import { MethodSelectionStep } from "@/components/auth/steps/method-selection-step";
import { PasswordStep } from "@/components/auth/steps/password-step";
import { CodeStep } from "@/components/auth/steps/code-step";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * 统一认证页面
 * 支持邮箱验证码和密码两种方式的登录/注册
 */
export default function AuthPage() {
  const { t } = useTranslation();
  const authFlow = useAuthFlow();
  const timer = useVerificationTimer({ duration: 60 });
  const { showError, showSuccess } = useFormError();

  // 存储密码(用于密码注册流程)
  const [tempPassword, setTempPassword] = useState<string>("");

  /**
   * 步骤 1: 提交邮箱
   */
  const handleEmailSubmit = async (email: string) => {
    const exists = await authFlow.submitEmail(email);
    if (exists === null && authFlow.error) {
      showError(authFlow.error);
    }
  };

  /**
   * 步骤 2: 选择认证方法
   */
  const handleMethodSelect = async (method: AuthMethod) => {
    authFlow.selectMethod(method);

    // 如果选择验证码,自动发送
    if (method === "code") {
      const success = await authFlow.sendVerificationCode();
      if (success) {
        timer.start();
        showSuccess("auth.verificationCodeSent");
      } else if (authFlow.error) {
        showError(authFlow.error);
      }
    }
  };

  /**
   * 步骤 3a: 密码登录
   */
  const handlePasswordLogin = async (password: string) => {
    const success = await authFlow.loginWithPassword(password);
    if (!success && authFlow.error) {
      showError(authFlow.error);
    }
    // 成功会自动跳转
  };

  /**
   * 步骤 3b: 创建密码并发送验证码
   */
  const handlePasswordCreate = async (password: string) => {
    const result = await authFlow.createPasswordAndSendCode(password);
    if (result) {
      setTempPassword(password);
      timer.start();
      showSuccess("auth.verificationCodeSent");
    } else if (authFlow.error) {
      showError(authFlow.error);
    }
  };

  /**
   * 步骤 4: 验证码验证
   */
  const handleCodeSubmit = async (code: string) => {
    let success = false;

    if (authFlow.mode === "login") {
      // 登录
      success = await authFlow.loginWithCode(code);
    } else if (tempPassword) {
      // 密码注册
      success = await authFlow.signupWithPasswordAndCode(tempPassword, code);
    } else {
      // 验证码注册
      success = await authFlow.signupWithCode(code);
    }

    if (!success && authFlow.error) {
      showError(authFlow.error);
    }
    // 成功会自动跳转
  };

  /**
   * 重新发送验证码
   */
  const handleResendCode = async () => {
    const success = await authFlow.sendVerificationCode();
    if (success) {
      timer.start();
      showSuccess("auth.verificationCodeSent");
    } else if (authFlow.error) {
      showError(authFlow.error);
    }
  };

  /**
   * 忘记密码
   */
  const handleForgotPassword = async () => {
    authFlow.forgotPassword();
    const success = await authFlow.sendVerificationCode();
    if (success) {
      timer.start();
      showSuccess("auth.verificationCodeSent");
    } else if (authFlow.error) {
      showError(authFlow.error);
    }
  };

  /**
   * Google OAuth 登录
   */
  const handleGoogleLogin = async () => {
    await authFlow.loginWithGoogle();
    if (authFlow.error) {
      showError(authFlow.error);
    }
  };

  /**
   * 动画配置
   */
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  // 已登录用户访问认证页时，直接跳转到目标页
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (AuthToken.isAuthenticated()) {
      const target = AuthHelpers.consumePostLoginRedirect() || "/";
      window.location.href = target;
    }
  }, []);

  return (
    <div className="w-full max-w-md relative">
      {/* 返回按钮 */}
      {authFlow.canGoBack && (
        <button
          type="button"
          onClick={authFlow.goBack}
          disabled={authFlow.isLoading}
          className="absolute -top-12 left-0 group flex items-center gap-1.5 text-sm font-medium auth-secondary hover:text-foreground transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>{t("common.back")}</span>
        </button>
      )}

      {/* 步骤内容 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={authFlow.step}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {/* 邮箱输入 */}
          {authFlow.step === "email" && (
            <EmailStep
              onSubmit={handleEmailSubmit}
              onGoogleLogin={handleGoogleLogin}
              isLoading={authFlow.isLoading}
              defaultEmail={authFlow.email}
            />
          )}

          {/* 方法选择 */}
          {authFlow.step === "method-selection" && (
            <MethodSelectionStep
              email={authFlow.email}
              mode={authFlow.mode}
              hasPassword={authFlow.hasPassword}
              onSelectMethod={handleMethodSelect}
              isLoading={authFlow.isLoading}
            />
          )}

          {/* 密码输入(登录) */}
          {authFlow.step === "password-input" && (
            <PasswordStep
              email={authFlow.email}
              mode="login"
              onSubmit={handlePasswordLogin}
              onForgotPassword={handleForgotPassword}
              isLoading={authFlow.isLoading}
            />
          )}

          {/* 创建密码(注册) */}
          {authFlow.step === "create-password" && (
            <PasswordStep
              email={authFlow.email}
              mode="signup"
              onSubmit={handlePasswordCreate}
              isLoading={authFlow.isLoading}
            />
          )}

          {/* 验证码输入 */}
          {authFlow.step === "code-input" && (
            <CodeStep
              email={authFlow.email}
              mode={authFlow.mode}
              onSubmit={handleCodeSubmit}
              onResendCode={handleResendCode}
              isLoading={authFlow.isLoading}
              countdown={timer.seconds}
              canResend={timer.canResend}
              error={authFlow.error}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

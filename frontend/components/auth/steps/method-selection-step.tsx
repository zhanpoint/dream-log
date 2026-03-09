"use client";

import { useState } from "react";
import { useTranslation } from "@/node_modules/react-i18next";
import { Button } from "@/components/ui/button";
import { Mail, KeyRound, AlertCircle } from "lucide-react";
import type { AuthMode, AuthMethod } from "@/hooks/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MethodSelectionStepProps {
  email: string;
  mode: AuthMode;
  hasPassword: boolean;
  onSelectMethod: (method: AuthMethod) => void;
  isLoading?: boolean;
}

export function MethodSelectionStep({
  email,
  mode,
  hasPassword,
  onSelectMethod,
  isLoading = false,
}: MethodSelectionStepProps) {
  const { t } = useTranslation();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const isLogin = mode === "login";
  const titleKey = isLogin ? "auth.welcomeBack" : "auth.welcomeToApp";
  const subtitleKey = isLogin ? "auth.chooseMethod" : "auth.chooseSignupMethod";
  const codeLabelKey = isLogin
    ? "auth.useVerificationCodeLogin"
    : "auth.useVerificationCodeSignup";
  const passwordLabelKey = isLogin
    ? "auth.usePasswordLogin"
    : "auth.usePasswordSignup";

  const handlePasswordClick = () => {
    // 如果是登录模式但用户未设置密码,显示对话框
    if (isLogin && !hasPassword) {
      setShowPasswordDialog(true);
      return;
    }
    // 否则直接选择密码方式
    onSelectMethod("password");
  };

  const handleSetPassword = () => {
    setShowPasswordDialog(false);
    // 切换到创建密码流程
    onSelectMethod("password");
  };

  const handleUseCode = () => {
    setShowPasswordDialog(false);
    // 使用验证码登录
    onSelectMethod("code");
  };

  return (
    <>
    <div className="w-full max-w-md space-y-8">
      {/* 标题 */}
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t(titleKey)}
        </h1>
        <p className="text-sm auth-secondary">{t(subtitleKey)}</p>
      </div>

      {/* 方法选择 */}
      <div className="space-y-3">
        {/* 验证码方式 */}
        <button
          onClick={() => onSelectMethod("code")}
          disabled={isLoading}
          className="w-full group relative overflow-hidden rounded-lg border-2 auth-card p-5 text-left transition-all duration-300 hover:border-primary/50 hover:auth-card-hover hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <span className="text-foreground">{t(codeLabelKey)}</span>
          </div>
        </button>

        {/* 密码方式 */}
        <button
          onClick={handlePasswordClick}
          disabled={isLoading}
          className="w-full group relative overflow-hidden rounded-lg border-2 auth-card p-5 text-left transition-all duration-300 hover:border-primary/50 hover:auth-card-hover hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <span className="text-foreground">{t(passwordLabelKey)}</span>
          </div>
        </button>
      </div>

      {/* 未设置密码提示对话框 */}
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              {t("auth.passwordNotSet")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {t("auth.passwordNotSetDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleUseCode}>
              {t("auth.useCodeInstead")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSetPassword}>
              {t("auth.setPasswordNow")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}

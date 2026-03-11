"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { VerificationCodeInput } from "@/components/auth";
import type { AuthMode } from "@/hooks/auth";

interface CodeStepProps {
  email: string;
  mode: AuthMode;
  onSubmit: (code: string) => Promise<void>;
  onResendCode: () => Promise<void>;
  isLoading?: boolean;
  countdown?: number;
  canResend?: boolean;
  error?: string | null;
}

export function CodeStep({
  email,
  mode,
  onSubmit,
  onResendCode,
  isLoading = false,
  countdown = 0,
  canResend = true,
  error = null,
}: CodeStepProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");

  const isLogin = mode === "login";

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleCodeComplete = async (completeCode: string) => {
    await onSubmit(completeCode);
  };

  const handleResend = async () => {
    if (canResend && !isLoading) {
      setCode(""); // 清空验证码
      await onResendCode();
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      {/* 标题 */}
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("auth.enterVerificationCode", { email })}
        </h1>
        <p className="text-sm auth-tertiary">
          {t("auth.verificationCodeSent")} {email}
        </p>
      </div>

      {/* 验证码输入 */}
      <div className="space-y-4">
        <VerificationCodeInput
          value={code}
          onChange={handleCodeChange}
          onComplete={handleCodeComplete}
          disabled={isLoading}
          error={!!error}
        />

        {/* 错误提示 */}
        {error && (
          <p className="text-sm text-destructive text-center">
            {t(error)}
          </p>
        )}

        {/* 重新发送 */}
        <div className="text-center">
          {canResend ? (
            <button
              onClick={handleResend}
              disabled={isLoading}
              className="text-sm text-primary hover:text-primary/80 hover:underline transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("auth.resendCode")}
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("auth.resendCodeIn", { seconds: countdown })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

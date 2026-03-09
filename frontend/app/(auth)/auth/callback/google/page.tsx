"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authAPI, AuthHelpers } from "@/lib/auth";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/node_modules/react-i18next";

/** 防止 Strict Mode 下重复请求：OAuth code 仅能使用一次 */
let _callbackProcessed = false;

function GoogleCallbackContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (_callbackProcessed) return;
    _callbackProcessed = true;

    const handleCallback = async () => {
      // 获取授权码
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");

      // 检查是否有错误
      if (errorParam) {
        _callbackProcessed = false;
        setError(
          errorParam === "access_denied"
            ? "用户取消了授权"
            : "授权失败,请重试"
        );
        return;
      }

      // 检查是否有授权码
      if (!code) {
        _callbackProcessed = false;
        setError("未获取到授权码");
        return;
      }

      try {
        // 调用后端处理 OAuth 回调
        const response = await authAPI.handleGoogleOAuthCallback(code);

        // 登录成功,跳转到首页（成功后无需重置 _callbackProcessed，页面将跳转）
        AuthHelpers.handleLoginSuccess(response, "/");
      } catch (err: any) {
        _callbackProcessed = false;
        console.error("Google OAuth callback error:", err);
        setError(err.translationKey || "auth.unknownError");
      }
    };

    handleCallback();
  }, [searchParams]);

  // 加载状态
  if (!error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {t("common.loading")}
        </p>
        <p className="text-sm text-muted-foreground">
          正在完成 Google 登录...
        </p>
      </div>
    );
  }

  // 错误状态
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 max-w-md mx-auto p-4">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">登录失败</h1>
        <p className="text-muted-foreground">
          {t(error.startsWith("auth.") ? error : "auth.unknownError")}
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push("/")}>
          {t("auth.backToHome")}
        </Button>
        <Button onClick={() => router.push("/auth")}>
          重新登录
        </Button>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">加载中...</p>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}

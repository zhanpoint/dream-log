"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AuthHelpers, type AuthResponse } from "@/lib/auth";

interface OAuthCallbackPageProps {
  provider: "google" | "wechat";
  processingKey: string;
  handleCallback: (params: URLSearchParams) => Promise<AuthResponse>;
}

const processedProviders = new Set<OAuthCallbackPageProps["provider"]>();

function OAuthCallbackContent({
  provider,
  processingKey,
  handleCallback,
}: OAuthCallbackPageProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (processedProviders.has(provider)) return;
    processedProviders.add(provider);

    const run = async () => {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        processedProviders.delete(provider);
        setError(errorParam === "access_denied" ? "auth.oauthCancelled" : "auth.oauthFailed");
        return;
      }

      if (!code) {
        processedProviders.delete(provider);
        setError("auth.oauthMissingCode");
        return;
      }

      try {
        const response = await handleCallback(searchParams);
        AuthHelpers.handleLoginSuccess(response, "/");
      } catch (err: any) {
        processedProviders.delete(provider);
        console.error(`${provider} OAuth callback error:`, err);
        setError(err.translationKey || "auth.unknownError");
      }
    };

    run();
  }, [handleCallback, provider, searchParams]);

  if (!error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t("common.loading")}</p>
        <p className="text-sm text-muted-foreground">{t(processingKey)}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 max-w-md mx-auto p-4">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">{t("auth.loginFailed")}</h1>
        <p className="text-muted-foreground">
          {t(error.startsWith("auth.") ? error : "auth.unknownError")}
        </p>
        {(error === "auth.oauthMissingCode" || error === "auth.oauthMissingState") && (
          <p className="text-sm text-muted-foreground">
            {t("auth.oauthRetryHint")}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="oauth-error-btn oauth-error-btn-outline"
          onClick={() => router.push("/")}
        >
          {t("auth.backToHome")}
        </Button>
        <Button
          className="oauth-error-btn oauth-error-btn-primary"
          onClick={() => router.push("/auth")}
        >
          {t("auth.retryLogin")}
        </Button>
      </div>
    </div>
  );
}

export function OAuthCallbackPage(props: OAuthCallbackPageProps) {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      }
    >
      <OAuthCallbackContent {...props} />
    </Suspense>
  );
}

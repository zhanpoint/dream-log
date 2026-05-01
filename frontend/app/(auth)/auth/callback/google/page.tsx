"use client";

import { authAPI } from "@/lib/auth";
import { OAuthCallbackPage } from "@/components/auth/oauth-callback-page";

export default function GoogleCallbackPage() {
  return (
    <OAuthCallbackPage
      provider="google"
      processingKey="auth.googleLoginProcessing"
      handleCallback={(params) => {
        const code = params.get("code");
        if (!code) {
          return Promise.reject({ translationKey: "auth.oauthMissingCode" });
        }
        return authAPI.handleGoogleOAuthCallback(code);
      }}
    />
  );
}

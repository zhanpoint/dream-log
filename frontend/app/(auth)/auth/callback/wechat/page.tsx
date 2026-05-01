"use client";

import { authAPI } from "@/lib/auth";
import { OAuthCallbackPage } from "@/components/auth/oauth-callback-page";

export default function WeChatCallbackPage() {
  return (
    <OAuthCallbackPage
      provider="wechat"
      processingKey="auth.wechatLoginProcessing"
      handleCallback={(params) => {
        const code = params.get("code");
        const state = params.get("state");
        if (!code) {
          return Promise.reject({ translationKey: "auth.oauthMissingCode" });
        }
        if (!state) {
          return Promise.reject({ translationKey: "auth.oauthMissingState" });
        }
        return authAPI.handleWeChatOAuthCallback(code, state);
      }}
    />
  );
}

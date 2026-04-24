import { persistCreateDraftForExternalExit } from "@/lib/dream-create-draft-bridge";
import { api } from "./api";
import { handleAuthError, AuthError } from "./auth-error-handler";
import type { UserProfile } from "./user-api";

/**
 * 用户信息接口
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  username?: string | null;
  avatar?: string | null;
  createdAt: string;
  // 注册方式（用于判断是否设置过密码等）
  registration_method?: "email" | "code" | "google" | string;
}

/**
 * 认证响应接口
 */
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  refresh_token?: string;
  user: User;
}

function normalizeAuthResponse(response: AuthResponse): AuthResponse {
  return {
    ...response,
    refreshToken: response.refreshToken ?? response.refresh_token,
  };
}

/**
 * 邮箱状态检查响应
 */
export interface EmailCheckResponse {
  exists: boolean;
  registered: boolean;
  has_password?: boolean; // 是否设置过密码(仅当exists=true时有值)
}

/**
 * 验证码目的
 */
export type VerificationPurpose = "signup" | "login" | "reset" | "change_email";

/**
 * 认证 API 服务类
 */
class AuthAPIService {
  /**
   * 检查邮箱是否已存在
   */
  async checkEmailExists(email: string): Promise<EmailCheckResponse> {
    try {
      const response = await api.post<EmailCheckResponse>("/auth/check-email", {
        email,
      });
      return response.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 发送验证码
   */
  async sendVerificationCode(
    email: string,
    purpose: VerificationPurpose = "signup"
  ): Promise<void> {
    try {
      await api.post("/auth/send-code", {
        email,
        purpose,
      });
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 验证验证码(仅验证,不登录)
   */
  async verifyCode(email: string, code: string): Promise<boolean> {
    try {
      const response = await api.post<{ valid: boolean }>("/auth/verify-code", {
        email,
        code,
      });
      return response.data.valid;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 使用验证码注册
   */
  async signupWithCode(
    email: string,
    code: string,
    name?: string
  ): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>("/auth/signup/code", {
        email,
        code,
        name,
      });
      return response.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 使用密码注册(需要验证码确认)
   */
  async signupWithPassword(
    email: string,
    password: string,
    code: string,
    name?: string
  ): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>("/auth/signup/password", {
        email,
        password,
        code,
        name,
      });
      return normalizeAuthResponse(response.data);
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 使用密码登录
   */
  async loginWithPassword(
    email: string,
    password: string
  ): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>("/auth/login/password", {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 使用验证码登录
   */
  async loginWithCode(email: string, code: string): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>("/auth/login/code", {
        email,
        code,
      });
      return response.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 验证密码强度(后端验证)
   */
  async validatePasswordStrength(password: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    try {
      const response = await api.post<{ valid: boolean; errors: string[] }>(
        "/auth/validate-password",
        {
          password,
        }
      );
      return normalizeAuthResponse(response.data);
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 重置密码 - 发送验证码
   */
  async sendResetPasswordCode(email: string): Promise<void> {
    try {
      await api.post("/auth/reset-password/send-code", {
        email,
      });
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 重置密码 - 使用验证码设置新密码
   */
  async resetPasswordWithCode(
    email: string,
    code: string,
    newPassword: string
  ): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>(
        "/auth/reset-password/verify",
        {
          email,
          code,
          newPassword,
        }
      );
      return normalizeAuthResponse(response.data);
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 获取 Google OAuth 授权 URL
   */
  async initiateGoogleOAuth(): Promise<string> {
    try {
      const response = await api.get<{ authUrl: string }>(
        "/auth/oauth/google/init"
      );
      return response.data.authUrl;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 处理 Google OAuth 回调
   */
  async handleGoogleOAuthCallback(code: string): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>(
        "/auth/oauth/google/callback",
        {
          code,
        }
      );
      return normalizeAuthResponse(response.data);
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // 登出失败也要清除本地 token
      console.error("Logout error:", error);
    }
  }

  /**
   * 刷新 Token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>("/auth/refresh", {
        refreshToken,
      });
      return normalizeAuthResponse(response.data);
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<User>("/auth/me");
      return response.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }
}

/**
 * 导出单例
 */
export const authAPI = new AuthAPIService();

/**
 * 认证 Token 管理
 */
export const AuthToken = {
  /**
   * 存储 token
   */
  set(token: string, refreshToken?: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", token);
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      }
    }
  },

  /**
   * 获取 access token
   */
  get(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  },

  /**
   * 获取 refresh token
   */
  getRefresh(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refresh_token");
    }
    return null;
  },

  /**
   * 清除 token
   */
  clear(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  },

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return !!this.get();
  },
};

/**
 * 用户信息管理
 */
export const AuthUser = {
  /**
   * 存储用户信息并触发更新事件
   */
  set(user: User | UserProfile): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(user));
      // 触发全局用户更新事件
      window.dispatchEvent(
        new CustomEvent("auth:user-updated", { detail: user })
      );
    }
  },

  /**
   * 获取用户信息
   */
  get(): User | null {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  /**
   * 清除用户信息
   */
  clear(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
    }
  },
};

/**
 * 认证辅助函数
 */
export const AuthHelpers = {
  /**
   * 记录登录后跳转地址
   */
  setPostLoginRedirect(redirectUrl: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("post_login_redirect", redirectUrl);
    }
  },

  /**
   * 读取并清除登录后跳转地址
   */
  consumePostLoginRedirect(): string | null {
    if (typeof window !== "undefined") {
      const redirectUrl = localStorage.getItem("post_login_redirect");
      if (redirectUrl) {
        localStorage.removeItem("post_login_redirect");
      }
      return redirectUrl;
    }
    return null;
  },

  /**
   * 处理登录成功
   */
  handleLoginSuccess(response: AuthResponse, redirectUrl?: string): void {
    // 存储 token
    AuthToken.set(response.token, response.refreshToken);

    // 存储用户信息
    AuthUser.set(response.user);

    // 跳转
    if (typeof window !== "undefined") {
      const storedRedirect = this.consumePostLoginRedirect();
      const target = redirectUrl || storedRedirect || "/";
      window.location.href = target;
    }
  },

  /**
   * 处理登出
   */
  async handleLogout(redirectUrl: string = "/auth"): Promise<void> {
    try {
      await persistCreateDraftForExternalExit();
      await authAPI.logout();
    } finally {
      // 清除本地数据
      AuthToken.clear();
      AuthUser.clear();

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("auth:user-updated", { detail: null })
        );
        window.location.href = redirectUrl;
      }
    }
  },

  /**
   * 检查并刷新 token
   */
  async checkAndRefreshToken(): Promise<boolean> {
    const refreshToken = AuthToken.getRefresh();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await authAPI.refreshToken(refreshToken);
      AuthToken.set(response.token, response.refreshToken);
      AuthUser.set(response.user);
      return true;
    } catch {
      // 刷新失败,清除 token
      AuthToken.clear();
      AuthUser.clear();

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("auth:user-updated", { detail: null })
        );
      }

      return false;
    }
  },
};

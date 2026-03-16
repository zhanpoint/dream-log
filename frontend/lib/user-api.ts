import { api } from "./api";
import { handleAuthError } from "./auth-error-handler";

/**
 * 用户资料接口
 */
export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  birthday: string | null;
  registration_method: string;
  bookmarks_visibility: "private" | "friends" | "public";
  created_communities_visibility: "private" | "friends" | "public";
  joined_communities_visibility: "private" | "friends" | "public";
  preferred_locale?: PreferredLocale | null;
  created_at: string;
}

export type PreferredLocale = "cn" | "en" | "ja";

/**
 * 更新个人资料请求
 */
export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
  birthday?: string;
  bookmarks_visibility?: "private" | "friends" | "public";
  created_communities_visibility?: "private" | "friends" | "public";
  joined_communities_visibility?: "private" | "friends" | "public";
  preferred_locale?: PreferredLocale;
}

/**
 * 头像上传签名响应
 */
export interface AvatarUploadSignature {
  upload_url: string;
  access_url: string;
  file_key: string;
  expires_in: number;
}

/**
 * 用户名检查响应
 */
export interface UsernameCheckResponse {
  available: boolean;
  message?: string;
}

/**
 * 用户 API 服务类
 */
class UserAPIService {
  /**
   * 获取当前用户完整信息
   */
  async getCurrentUser(): Promise<UserProfile> {
    try {
      const response = await api.get<UserProfile>("/user/me");
      return response.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 更新个人资料
   */
  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    try {
      const response = await api.patch<UserProfile>("/user/profile", data);
      return response.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 设置语言偏好（用于定时周报等无请求头场景）
   */
  async setPreferredLocale(preferred_locale: PreferredLocale): Promise<void> {
    try {
      await api.patch("/user/profile", { preferred_locale });
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 获取头像上传签名
   */
  async getAvatarUploadSignature(
    fileName: string,
    contentType: string = "image/jpeg"
  ): Promise<AvatarUploadSignature> {
    try {
      const response = await api.post<AvatarUploadSignature>(
        "/user/avatar/signature",
        {
          file_name: fileName,
          content_type: contentType,
        }
      );
      return response.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 更新头像URL
   */
  async updateAvatar(avatarUrl: string): Promise<UserProfile> {
    try {
      const response = await api.put<UserProfile>("/user/avatar", {
        avatar_url: avatarUrl,
      });
      return response.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 修改密码
   */
  async changePassword(
    oldPassword: string | null,
    newPassword: string,
    verificationCode?: string
  ): Promise<void> {
    try {
      await api.put("/user/password", {
        old_password: oldPassword,
        new_password: newPassword,
        verification_code: verificationCode,
      });
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 修改邮箱
   */
  async changeEmail(
    newEmail: string,
    verificationCode: string
  ): Promise<UserProfile> {
    try {
      const response = await api.put<UserProfile>("/user/email", {
        new_email: newEmail,
        verification_code: verificationCode,
      });
      return response.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 检查用户名是否可用
   */
  async checkUsername(username: string): Promise<UsernameCheckResponse> {
    try {
      const response = await api.post<UsernameCheckResponse>(
        "/user/username/check",
        { username }
      );
      return response.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  /**
   * 上传文件到 OSS
   */
  async uploadToOSS(
    uploadUrl: string,
    file: Blob,
    contentType: string
  ): Promise<void> {
    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": contentType,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OSS upload failed:", response.status, errorText);
        throw new Error(`文件上传失败: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("文件上传失败");
    }
  }
}

/**
 * 导出单例
 */
export const userAPI = new UserAPIService();

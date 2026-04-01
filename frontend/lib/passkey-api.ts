import { api } from "@/lib/api";
import { handleAuthError } from "@/lib/auth-error-handler";
import type { AuthResponse } from "@/lib/auth-api";

export interface PasskeyOptions {
  ceremony_id: string;
  publicKey: Record<string, unknown>;
}

export interface PasskeyItem {
  credential_id: string;
  name: string | null;
  aaguid: string | null;
  transports: string[] | null;
  backup_eligible: boolean | null;
  backed_up: boolean | null;
  created_at: string;
  last_used_at: string | null;
}

function normalizeAuthResponse(data: any): AuthResponse {
  return {
    token: data.token,
    refreshToken: data.refreshToken ?? data.refresh_token,
    user: data.user,
  };
}

class PasskeyAPIService {
  async getAuthenticationOptions(): Promise<PasskeyOptions> {
    try {
      const res = await api.post<PasskeyOptions>("/auth/passkey/authentication/options");
      return res.data;
    } catch (e) {
      throw handleAuthError(e);
    }
  }

  async verifyAuthentication(ceremony_id: string, credential: Record<string, unknown>): Promise<AuthResponse> {
    try {
      const res = await api.post("/auth/passkey/authentication/verify", { ceremony_id, credential });
      return normalizeAuthResponse(res.data);
    } catch (e) {
      throw handleAuthError(e);
    }
  }

  async enrollSendCode(): Promise<void> {
    try {
      await api.post("/auth/passkey/enroll/send-code");
    } catch (e) {
      throw handleAuthError(e);
    }
  }

  async enrollVerifyCode(code: string): Promise<void> {
    try {
      await api.post("/auth/passkey/enroll/verify-code", { code });
    } catch (e) {
      throw handleAuthError(e);
    }
  }

  async getRegistrationOptions(): Promise<PasskeyOptions> {
    try {
      const res = await api.post<PasskeyOptions>("/auth/passkey/registration/options");
      return res.data;
    } catch (e) {
      throw handleAuthError(e);
    }
  }

  async verifyRegistration(ceremony_id: string, credential: Record<string, unknown>): Promise<void> {
    try {
      await api.post("/auth/passkey/registration/verify", { ceremony_id, credential });
    } catch (e) {
      throw handleAuthError(e);
    }
  }

  async listPasskeys(): Promise<PasskeyItem[]> {
    try {
      const res = await api.get<PasskeyItem[]>("/auth/passkey");
      return res.data;
    } catch (e) {
      throw handleAuthError(e);
    }
  }

  async renamePasskey(credential_id: string, name: string): Promise<void> {
    try {
      await api.patch(`/auth/passkey/${encodeURIComponent(credential_id)}`, { name });
    } catch (e) {
      throw handleAuthError(e);
    }
  }

  async deletePasskey(credential_id: string): Promise<void> {
    try {
      await api.delete(`/auth/passkey/${encodeURIComponent(credential_id)}`);
    } catch (e) {
      throw handleAuthError(e);
    }
  }
}

export const passkeyAPI = new PasskeyAPIService();


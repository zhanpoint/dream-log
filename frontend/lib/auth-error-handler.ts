import { AxiosError } from "axios";

/**
 * 认证错误代码映射
 */
export enum AuthErrorCode {
  // 邮箱相关
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
  EMAIL_NOT_FOUND = "EMAIL_NOT_FOUND",
  EMAIL_INVALID = "EMAIL_INVALID",

  // 密码相关
  PASSWORD_INVALID = "PASSWORD_INVALID",
  PASSWORD_TOO_WEAK = "PASSWORD_TOO_WEAK",
  PASSWORD_REQUIRED = "PASSWORD_REQUIRED",

  // 验证码相关
  CODE_INVALID = "CODE_INVALID",
  CODE_EXPIRED = "CODE_EXPIRED",
  CODE_REQUIRED = "CODE_REQUIRED",
  CODE_SEND_FAILED = "CODE_SEND_FAILED",

  // 认证相关
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  UNAUTHORIZED = "UNAUTHORIZED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  ACCOUNT_BLOCKED = "ACCOUNT_BLOCKED",
  OAUTH_NOT_CONFIGURED = "OAUTH_NOT_CONFIGURED",
  PASSKEY_UNAVAILABLE = "PASSKEY_UNAVAILABLE",

  // 限流
  TOO_MANY_ATTEMPTS = "TOO_MANY_ATTEMPTS",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // 网络和系统
  NETWORK_ERROR = "NETWORK_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * 错误代码到翻译键的映射
 */
const errorCodeToTranslationKey: Record<string, string> = {
  [AuthErrorCode.EMAIL_ALREADY_EXISTS]: "auth.emailAlreadyExists",
  [AuthErrorCode.EMAIL_NOT_FOUND]: "auth.emailNotFound",
  [AuthErrorCode.EMAIL_INVALID]: "auth.emailInvalid",

  [AuthErrorCode.PASSWORD_INVALID]: "auth.invalidCredentials",
  [AuthErrorCode.PASSWORD_TOO_WEAK]: "auth.passwordTooWeak",
  [AuthErrorCode.PASSWORD_REQUIRED]: "auth.passwordRequired",

  [AuthErrorCode.CODE_INVALID]: "auth.verificationCodeInvalid",
  [AuthErrorCode.CODE_EXPIRED]: "auth.verificationCodeExpired",
  [AuthErrorCode.CODE_REQUIRED]: "auth.codeRequired",
  [AuthErrorCode.CODE_SEND_FAILED]: "auth.unknownError",

  [AuthErrorCode.INVALID_CREDENTIALS]: "auth.invalidCredentials",
  [AuthErrorCode.UNAUTHORIZED]: "auth.invalidCredentials",
  [AuthErrorCode.TOKEN_EXPIRED]: "auth.invalidCredentials",
  [AuthErrorCode.ACCOUNT_BLOCKED]: "auth.accountBlocked",
  [AuthErrorCode.OAUTH_NOT_CONFIGURED]: "auth.oauthNotConfigured",
  [AuthErrorCode.PASSKEY_UNAVAILABLE]: "auth.passkeyUnavailable",

  [AuthErrorCode.TOO_MANY_ATTEMPTS]: "auth.tooManyAttempts",
  [AuthErrorCode.RATE_LIMIT_EXCEEDED]: "auth.tooManyAttempts",

  [AuthErrorCode.NETWORK_ERROR]: "auth.networkError",
  [AuthErrorCode.SERVER_ERROR]: "auth.unknownError",
  [AuthErrorCode.UNKNOWN_ERROR]: "auth.unknownError",
};

/**
 * 认证错误类
 */
export class AuthError extends Error {
  code: AuthErrorCode;
  translationKey: string;
  originalError?: any;

  constructor(
    code: AuthErrorCode,
    message?: string,
    originalError?: any
  ) {
    super(message || code);
    this.name = "AuthError";
    this.code = code;
    this.translationKey = errorCodeToTranslationKey[code] || "auth.unknownError";
    this.originalError = originalError;
  }
}

/**
 * 从后端错误响应解析错误代码
 */
function parseErrorCode(error: AxiosError): AuthErrorCode {
  const status = error.response?.status;
  const errorCode = (error.response?.data as any)?.code;
  const errorMessage = String(
    (error.response?.data as any)?.detail ??
      (error.response?.data as any)?.message ??
      ""
  );
  const normalizedMessage = errorMessage.toLowerCase();

  // 优先使用后端返回的错误代码
  if (errorCode && Object.values(AuthErrorCode).includes(errorCode)) {
    return errorCode as AuthErrorCode;
  }

  if (
    (normalizedMessage.includes("oauth") && errorMessage.includes("未配置")) ||
    normalizedMessage.includes("oauth not configured")
  ) {
    return AuthErrorCode.OAUTH_NOT_CONFIGURED;
  }

  if (errorMessage.includes("通行密钥")) {
    return AuthErrorCode.PASSKEY_UNAVAILABLE;
  }

  // 根据 HTTP 状态码判断
  switch (status) {
    case 400:
      // 根据错误消息判断具体错误
      if (normalizedMessage.includes("email")) {
        if (normalizedMessage.includes("exists")) {
          return AuthErrorCode.EMAIL_ALREADY_EXISTS;
        }
        if (normalizedMessage.includes("invalid")) {
          return AuthErrorCode.EMAIL_INVALID;
        }
        if (normalizedMessage.includes("not found")) {
          return AuthErrorCode.EMAIL_NOT_FOUND;
        }
      }
      if (normalizedMessage.includes("password")) {
        if (normalizedMessage.includes("weak")) {
          return AuthErrorCode.PASSWORD_TOO_WEAK;
        }
        return AuthErrorCode.PASSWORD_INVALID;
      }
      if (normalizedMessage.includes("code") || normalizedMessage.includes("verification")) {
        if (normalizedMessage.includes("expired")) {
          return AuthErrorCode.CODE_EXPIRED;
        }
        if (normalizedMessage.includes("invalid")) {
          return AuthErrorCode.CODE_INVALID;
        }
      }
      return AuthErrorCode.UNKNOWN_ERROR;

    case 401:
      return AuthErrorCode.INVALID_CREDENTIALS;

    case 403:
      return AuthErrorCode.ACCOUNT_BLOCKED;

    case 404:
      if (errorMessage.includes("通行密钥")) {
        return AuthErrorCode.PASSKEY_UNAVAILABLE;
      }
      return AuthErrorCode.EMAIL_NOT_FOUND;

    case 429:
      return AuthErrorCode.TOO_MANY_ATTEMPTS;

    case 500:
    case 502:
    case 503:
      return AuthErrorCode.SERVER_ERROR;

    default:
      return AuthErrorCode.UNKNOWN_ERROR;
  }
}

/**
 * 处理认证错误
 */
export function handleAuthError(error: any): AuthError {
  // 网络错误
  if (!error.response && error.request) {
    return new AuthError(
      AuthErrorCode.NETWORK_ERROR,
      "Network connection failed",
      error
    );
  }

  // Axios 错误（FastAPI 用 detail，常见 API 用 message）
  if (error.isAxiosError) {
    const axiosError = error as AxiosError;
    const data = (axiosError.response?.data as any) || {};
    const errorCode = parseErrorCode(axiosError);
    const errorMessage = data.detail ?? data.message;

    return new AuthError(errorCode, errorMessage, error);
  }

  // 已经是 AuthError
  if (error instanceof AuthError) {
    return error;
  }

  // 其他未知错误
  return new AuthError(
    AuthErrorCode.UNKNOWN_ERROR,
    error.message || "Unknown error occurred",
    error
  );
}

/**
 * 获取错误的翻译键
 */
export function getErrorTranslationKey(error: any): string {
  if (error instanceof AuthError) {
    return error.translationKey;
  }

  const authError = handleAuthError(error);
  return authError.translationKey;
}

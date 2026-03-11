/**
 * 认证模块统一导出
 * 
 * 使用示例:
 * ```typescript
 * import { authAPI, AuthToken, AuthHelpers } from "@/lib/auth";
 * 
 * // 检查邮箱是否存在
 * const { exists } = await authAPI.checkEmailExists(email);
 * 
 * // 发送验证码
 * await authAPI.sendVerificationCode(email, "signup");
 * 
 * // 登录
 * const response = await authAPI.loginWithPassword(email, password);
 * AuthHelpers.handleLoginSuccess(response);
 * 
 * // 登出
 * await AuthHelpers.handleLogout();
 * ```
 */

// API 服务
export {
  authAPI,
  AuthToken,
  AuthUser,
  AuthHelpers,
  type User,
  type AuthResponse,
  type EmailCheckResponse,
  type VerificationPurpose,
} from "../auth-api";

// 验证 Schemas
export {
  emailSchema,
  nameSchema,
  passwordSchema,
  verificationCodeSchema,
  signupFormSchema,
  passwordLoginSchema,
  passwordSignupSchema,
  codeAuthSchema,
  getPasswordStrength,
  type EmailFormData,
  type NameFormData,
  type PasswordFormData,
  type VerificationCodeFormData,
  type SignupFormData,
  type PasswordLoginFormData,
  type PasswordSignupFormData,
  type CodeAuthFormData,
} from "../auth-schemas";

// 错误处理
export {
  AuthError,
  AuthErrorCode,
  handleAuthError,
  getErrorTranslationKey,
} from "../auth-error-handler";

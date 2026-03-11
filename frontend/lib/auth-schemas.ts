import { z } from "zod";

/**
 * 邮箱验证 Schema
 */
export const emailSchema = z.object({
  email: z
    .string()
    .min(1, "auth.emailRequired")
    .email("auth.emailInvalid"),
});

/**
 * 姓名验证 Schema
 */
export const nameSchema = z.object({
  name: z.string().min(1, "auth.nameRequired").max(50, "姓名不能超过 50 个字符"),
});

/**
 * 密码强度验证函数
 */
function validatePasswordStrength(password: string): boolean {
  // 至少 8 个字符
  if (password.length < 8) {
    return false;
  }

  // 检查包含的字符类型
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  // 至少包含 3 种类型
  const typeCount = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(
    Boolean
  ).length;

  return typeCount >= 3;
}

/**
 * 密码验证 Schema
 */
export const passwordSchema = z.object({
  password: z
    .string()
    .min(8, "auth.passwordTooShort")
    .refine(validatePasswordStrength, {
      message: "auth.passwordTooWeak",
    }),
});

/**
 * 验证码验证 Schema
 */
export const verificationCodeSchema = z.object({
  code: z
    .string()
    .length(6, "auth.codeRequired")
    .regex(/^\d{6}$/, "auth.verificationCodeInvalid"),
});

/**
 * 完整注册表单 Schema (邮箱 + 姓名)
 */
export const signupFormSchema = emailSchema.merge(nameSchema);

/**
 * 密码登录 Schema
 */
export const passwordLoginSchema = emailSchema.merge(passwordSchema);

/**
 * 密码注册 Schema (需要验证码)
 */
export const passwordSignupSchema = emailSchema
  .merge(passwordSchema)
  .merge(verificationCodeSchema);

/**
 * 验证码登录/注册 Schema
 */
export const codeAuthSchema = emailSchema.merge(verificationCodeSchema);

/**
 * 类型导出
 */
export type EmailFormData = z.infer<typeof emailSchema>;
export type NameFormData = z.infer<typeof nameSchema>;
export type PasswordFormData = z.infer<typeof passwordSchema>;
export type VerificationCodeFormData = z.infer<typeof verificationCodeSchema>;
export type SignupFormData = z.infer<typeof signupFormSchema>;
export type PasswordLoginFormData = z.infer<typeof passwordLoginSchema>;
export type PasswordSignupFormData = z.infer<typeof passwordSignupSchema>;
export type CodeAuthFormData = z.infer<typeof codeAuthSchema>;

/**
 * 密码强度验证辅助函数
 */
export function getPasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
  strength: number; // 0-5
} {
  const errors: string[] = [];
  let strength = 0;

  // 长度检查
  if (password.length < 8) {
    errors.push("auth.passwordTooShort");
  } else {
    strength++;
  }

  // 字符类型检查
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (hasUppercase) strength++;
  if (hasLowercase) strength++;
  if (hasNumber) strength++;
  if (hasSpecial) strength++;

  const typeCount = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(
    Boolean
  ).length;

  if (typeCount < 3 && password.length >= 8) {
    errors.push("auth.passwordTooWeak");
  }

  return {
    isValid: password.length >= 8 && typeCount >= 3,
    errors,
    strength,
  };
}

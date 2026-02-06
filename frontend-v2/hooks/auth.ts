/**
 * 认证相关 Hooks 统一导出
 * 
 * @example
 * ```tsx
 * import { useAuthFlow, useVerificationTimer, useFormError } from "@/hooks/auth";
 * 
 * function AuthPage() {
 *   const authFlow = useAuthFlow();
 *   const timer = useVerificationTimer({ duration: 60 });
 *   const { showError, showSuccess } = useFormError();
 *   
 *   // ... 使用这些 hooks
 * }
 * ```
 */

export { useAuthFlow } from "./use-auth-flow";
export type {
  AuthStep,
  AuthMode,
  AuthMethod,
  AuthFlowState,
} from "./use-auth-flow";

export { useVerificationTimer } from "./use-verification-timer";
export type { VerificationTimerOptions } from "./use-verification-timer";

export { useFormError } from "./use-form-error";

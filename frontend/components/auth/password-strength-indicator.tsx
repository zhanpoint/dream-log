"use client";

import * as React from "react";
import { useTranslation } from "@/node_modules/react-i18next";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  id: string;
  translationKey: string;
  test: (password: string) => boolean;
}

const getRequirements = (): PasswordRequirement[] => [
  {
    id: "length",
    translationKey: "auth.passwordReqLength",
    test: (pwd) => pwd.length >= 8,
  },
  {
    id: "uppercase",
    translationKey: "auth.passwordReqUppercase",
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    id: "lowercase",
    translationKey: "auth.passwordReqLowercase",
    test: (pwd) => /[a-z]/.test(pwd),
  },
  {
    id: "number",
    translationKey: "auth.passwordReqNumber",
    test: (pwd) => /[0-9]/.test(pwd),
  },
  {
    id: "special",
    translationKey: "auth.passwordReqSpecial",
    test: (pwd) => /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  },
];

export function PasswordStrengthIndicator({
  password,
  className,
}: PasswordStrengthIndicatorProps) {
  const { t } = useTranslation();
  const requirements = getRequirements();
  
  const metRequirements = requirements.map((req) => ({
    ...req,
    met: req.test(password),
  }));

  // 计算满足的类型数量(除了长度之外)
  const typeRequirements = metRequirements.slice(1);
  const metTypes = typeRequirements.filter((req) => req.met).length;

  // 密码强度: 需要至少 8 位且包含至少 3 种类型
  const isLengthMet = metRequirements[0].met;
  const isStrong = isLengthMet && metTypes >= 3;

  // 计算强度等级 (0-4)
  const strengthLevel = metRequirements.filter((req) => req.met).length;

  const getStrengthColor = () => {
    if (strengthLevel === 0) return "bg-gray-200 dark:bg-gray-700";
    if (strengthLevel <= 2) return "bg-red-500";
    if (strengthLevel <= 3) return "bg-yellow-500";
    if (strengthLevel <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (strengthLevel === 0) return "";
    if (strengthLevel <= 2) return t("auth.passwordStrengthWeak");
    if (strengthLevel <= 3) return t("auth.passwordStrengthFair");
    if (strengthLevel <= 4) return t("auth.passwordStrengthGood");
    return t("auth.passwordStrengthStrong");
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* 强度条 */}
      {password && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < strengthLevel
                    ? getStrengthColor()
                    : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            ))}
          </div>
          {strengthLevel > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("auth.passwordStrength")}: {getStrengthText()}
            </p>
          )}
        </div>
      )}

      {/* 要求列表 */}
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("auth.passwordRequirements")}:</p>
        <ul className="space-y-1.5">
          {metRequirements.map((req) => (
            <li
              key={req.id}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors",
                req.met
                  ? "text-green-600 dark:text-green-500"
                  : "text-muted-foreground"
              )}
            >
              {req.met ? (
                <Check className="h-4 w-4 flex-shrink-0" />
              ) : (
                <X className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{t(req.translationKey)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 验证结果提示 */}
      {password && !isStrong && password.length > 0 && (
        <div className="text-sm text-destructive">
          {!isLengthMet
            ? t("auth.passwordTooShort")
            : t("auth.passwordTooWeak")}
        </div>
      )}
    </div>
  );
}

// 导出验证函数供表单使用
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("密码至少需要 8 个字符");
  }

  const typeTests = [
    { test: /[A-Z]/.test(password), label: "大写字母" },
    { test: /[a-z]/.test(password), label: "小写字母" },
    { test: /[0-9]/.test(password), label: "数字" },
    { test: /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), label: "特殊符号" },
  ];

  const metTypes = typeTests.filter((t) => t.test).length;

  if (metTypes < 3) {
    errors.push(
      `密码需要包含至少 3 种字符类型(大写字母、小写字母、数字、特殊符号),当前只包含 ${metTypes} 种`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

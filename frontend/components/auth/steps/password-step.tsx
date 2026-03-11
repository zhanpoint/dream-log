"use client";

import { useState } from "react";
import { useForm, type ControllerRenderProps, type FieldValues } from "@/lib/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2, Eye, EyeOff } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordStrengthIndicator } from "@/components/auth";
import { passwordSchema, type PasswordFormData } from "@/lib/auth";
import type { AuthMode } from "@/hooks/auth";

interface PasswordStepProps {
  email: string;
  mode: AuthMode;
  onSubmit: (password: string) => Promise<void>;
  onForgotPassword?: () => void;
  isLoading?: boolean;
}

export function PasswordStep({
  email,
  mode,
  onSubmit,
  onForgotPassword,
  isLoading = false,
}: PasswordStepProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const isLogin = mode === "login";
  const isSignup = mode === "signup";

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
    },
  });

  const password = form.watch("password");

  const handleSubmit = async (data: PasswordFormData) => {
    await onSubmit(data.password);
  };

  return (
    <div className="w-full max-w-md space-y-8">
      {/* 标题 */}
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {isLogin ? t("auth.welcomeBack") : t("auth.createPassword")}
        </h1>
      </div>

      {/* 密码表单 */}
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }: { field: ControllerRenderProps<PasswordFormData, "password"> & FieldValues }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder={
                        isSignup
                          ? t("auth.newPasswordPlaceholder")
                          : t("auth.passwordPlaceholder")
                      }
                      type={showPassword ? "text" : "password"}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      autoFocus
                      disabled={isLoading}
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 登录模式:忘记密码链接 */}
          {isLogin && onForgotPassword && (
            <div className="text-right">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-primary hover:text-primary/80 transition-colors duration-200 disabled:opacity-50"
                disabled={isLoading}
              >
                {t("auth.forgotPassword")}
              </button>
            </div>
          )}

          {/* 注册模式:密码强度指示器 */}
          {isSignup && password && (
            <PasswordStrengthIndicator password={password} />
          )}

          <Button
            type="submit"
            className="w-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
            disabled={isLoading}
            size="lg"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.continue")}
          </Button>
        </form>
      </Form>
    </div>
  );
}

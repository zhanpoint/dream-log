"use client";

import { useForm, type ControllerRenderProps, type FieldValues } from "@/lib/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleOAuthButton } from "@/components/auth";
import { emailSchema, type EmailFormData } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface EmailStepProps {
  onSubmit: (email: string, name?: string) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  isLoading?: boolean;
  defaultEmail?: string;
}

export function EmailStep({
  onSubmit,
  onGoogleLogin,
  isLoading = false,
  defaultEmail = "",
}: EmailStepProps) {
  const { t } = useTranslation();

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: defaultEmail,
    },
  });

  const handleSubmit = async (data: EmailFormData) => {
    await onSubmit(data.email);
  };

  return (
    <div className="w-full max-w-md space-y-8">
      {/* 标题 */}
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t("auth.welcomeToApp")}
        </h1>
      </div>

      {/* Google OAuth */}
      <GoogleOAuthButton onLogin={onGoogleLogin} disabled={isLoading} />

      {/* 分隔线 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t-2 border-border/80 dark:border-white/20" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 auth-divider-text">
            {t("auth.orContinueWith")}
          </span>
        </div>
      </div>

      {/* 邮箱表单 */}
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }: { field: ControllerRenderProps<EmailFormData, "email"> & FieldValues }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder={t("auth.emailPlaceholder")}
                    type="email"
                    autoComplete="email"
                    autoFocus
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className={cn(
              "w-full",
              "transition-all duration-300 ease-out",
              "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
            )}
            disabled={isLoading}
            size="lg"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.continue")}
          </Button>
        </form>
      </Form>

      {/* 服务条款 */}
      <p className="text-center text-xs text-muted-foreground">
        {t("auth.termsAgree")}{" "}
        <a href="/terms" className="underline underline-offset-4 hover:text-primary">
          {t("auth.terms")}
        </a>{" "}
        {t("auth.and")}{" "}
        <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
          {t("auth.privacy")}
        </a>
      </p>
    </div>
  );
}



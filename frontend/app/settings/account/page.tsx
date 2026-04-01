"use client";

import { useState } from "react";
import { useForm, type ControllerRenderProps, type FieldValues } from "@/lib/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrengthIndicator, validatePasswordStrength } from "@/components/auth/password-strength-indicator";
import { userAPI } from "@/lib/user-api";
import { authAPI } from "@/lib/auth-api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { AuthUser } from "@/lib/auth-api";
import { PasskeysSection } from "@/components/settings/passkeys-section";

const formSchema = z
  .object({
    oldPassword: z.string().optional(),
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
    verificationCode: z.string().regex(/^\d{6}$/).optional(),
  });

type FormValues = z.infer<typeof formSchema>;

export default function AccountPage() {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [useCode, setUseCode] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const currentUser = AuthUser.get();
  const hasPassword = currentUser?.registration_method === "email";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
      verificationCode: "",
    },
  });

  const watchedNewPassword = form.watch("newPassword");
  const watchedOldPassword = form.watch("oldPassword");
  const watchedConfirmPassword = form.watch("confirmPassword");

  // 检查新旧密码是否相同
  const isSameAsOld = watchedOldPassword && watchedNewPassword && watchedOldPassword === watchedNewPassword;

  // 检查确认密码错误（只有在输入了新密码后才校验）
  const getConfirmPasswordError = () => {
    if (!watchedNewPassword) {
      return null; // 没有输入新密码时不显示错误
    }
    if (!watchedConfirmPassword) {
      return t("settings.account.confirmPasswordRequired");
    }
    if (watchedNewPassword !== watchedConfirmPassword) {
      return t("settings.account.confirmPasswordMismatch");
    }
    return null;
  };

  const confirmPasswordError = getConfirmPasswordError();

  const handleSendCode = async () => {
    if (!currentUser?.email) return;

    setIsSendingCode(true);
    try {
      await authAPI.sendVerificationCode(currentUser.email, "reset");
      toast.success(t("settings.email.codeSent"));
    } catch (error: any) {
      toast.error(error.message || t("settings.email.sendCodeError"));
    } finally {
      setIsSendingCode(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    // 验证所有必填字段
    if (useCode) {
      if (!values.verificationCode || values.verificationCode.length !== 6) {
        toast.error(t("settings.email.codeInvalid"));
        return;
      }
    } else if (hasPassword) {
      if (!values.oldPassword) {
        toast.error(t("settings.account.passwordRequired"));
        return;
      }
    }

    if (!values.newPassword || values.newPassword.length < 8) {
      toast.error(t("settings.account.passwordMinLength"));
      return;
    }

    if (!values.confirmPassword) {
      toast.error(t("settings.account.confirmPasswordRequired"));
      return;
    }

    if (values.newPassword !== values.confirmPassword) {
      toast.error(t("settings.account.confirmPasswordMismatch"));
      return;
    }

    // 检查新旧密码是否相同
    if (values.oldPassword && values.newPassword === values.oldPassword) {
      toast.error(t("settings.account.passwordSameAsOld"));
      return;
    }

    // 检查密码强度
    const validation = validatePasswordStrength(values.newPassword);
    if (!validation.isValid) {
      toast.error(t("settings.account.passwordStrengthNotMet"));
      return;
    }

    setIsSaving(true);
    try {
      await userAPI.changePassword(
        useCode ? null : values.oldPassword || null,
        values.newPassword,
        useCode ? values.verificationCode : undefined
      );

      toast.success(t("settings.account.passwordChangeSuccess"));
      form.reset();
    } catch (error: any) {
      toast.error(error.message || t("settings.account.passwordChangeError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("settings.account.title")}</h1>
      </div>

      {/* 邮箱管理 */}
      <div className="border-2 border-border/60 rounded-lg p-8">
        <h2 className="text-lg font-semibold mb-6">{t("settings.email.title")}</h2>
        
        {/* 当前邮箱 */}
        <div className="mb-6 max-w-[880px]">
          <label className="block text-base font-medium mb-4">{t("settings.email.currentEmail")}</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              value={currentUser?.email || ""}
              disabled
              className="h-10 w-full opacity-75"
            />
          </div>
        </div>

        <div className="border-t border-border/60 pt-6">
          <h3 className="text-base font-semibold mb-6">{t("settings.email.changeEmail")}</h3>
          <EmailChangeForm />
        </div>
      </div>

      {/* 密码管理 */}
      <div className="border border-border/60 rounded-lg p-8 hover:border-border/80 transition-all duration-200">
        <h2 className="text-lg font-semibold mb-6">
          {t("settings.account.changePassword")}
        </h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 验证方式切换 */}
            {hasPassword && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={!useCode ? "default" : undefined}
                  size="sm"
                  onClick={() => setUseCode(false)}
                  className={!useCode ? "hover:scale-105 hover:shadow-md transition-all duration-200" : "border border-input bg-background text-foreground hover:bg-muted/50 hover:scale-105 hover:shadow-sm transition-all duration-200"}
                >
                  {t("settings.account.useOldPassword")}
                </Button>
                <Button
                  type="button"
                  variant={useCode ? "default" : undefined}
                  size="sm"
                  onClick={() => setUseCode(true)}
                  className={useCode ? "hover:scale-105 hover:shadow-md transition-all duration-200" : "border border-input bg-background text-foreground hover:bg-muted/50 hover:scale-105 hover:shadow-sm transition-all duration-200"}
                >
                  {t("settings.account.useVerificationCode")}
                </Button>
              </div>
            )}

            {/* 旧密码或验证码 */}
            {!useCode && hasPassword ? (
              <FormField
                control={form.control}
                name="oldPassword"
                render={({ field }: { field: ControllerRenderProps<FormValues, "oldPassword"> & FieldValues }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="block text-base font-medium mb-4">{t("settings.account.currentPassword")}</FormLabel>
                    <FormControl>
                      <div className="w-full max-w-[420px]">
                        <PasswordInput 
                          placeholder={t("settings.account.currentPasswordPlaceholder")}
                          className="h-10 placeholder:text-muted-foreground hover:border-input/80 hover:shadow-md transition-all duration-200" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="verificationCode"
                render={({ field }: { field: ControllerRenderProps<FormValues, "verificationCode"> & FieldValues }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="block text-base font-medium mb-4">{t("settings.email.verificationCode")}</FormLabel>
                    <div className="flex gap-2 w-full max-w-[420px]">
                      <FormControl>
                        <Input
                          placeholder={t("settings.email.codePlaceholder")}
                          maxLength={6}
                          className="h-10 placeholder:text-muted-foreground hover:border-input/80 hover:shadow-md transition-all duration-200"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        onClick={handleSendCode}
                        disabled={isSendingCode}
                        className="h-10 whitespace-nowrap border border-input bg-background text-foreground hover:bg-muted/50 hover:scale-105 hover:shadow-md transition-all duration-200 disabled:hover:scale-100 disabled:hover:shadow-none"
                      >
                        {isSendingCode ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t("settings.email.sendCode")
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 新密码 */}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }: { field: ControllerRenderProps<FormValues, "newPassword"> & FieldValues }) => (
                <FormItem className="space-y-4 w-full max-w-[420px]">
                  <FormLabel className="block text-base font-medium mb-4">{t("settings.account.newPassword")}</FormLabel>
                  <FormControl>
                    <PasswordInput 
                      placeholder={t("settings.account.newPasswordPlaceholder")}
                      className="h-10 placeholder:text-muted-foreground hover:border-input/80 hover:shadow-md transition-all duration-200" 
                      {...field} 
                    />
                  </FormControl>
                  {/* 新旧密码相同提示 */}
                  {isSameAsOld && (
                    <p className="text-sm text-destructive">{t("settings.account.passwordSameAsOld")}</p>
                  )}
                  <FormMessage />
                  {/* 密码强度指示器 */}
                  {watchedNewPassword && !isSameAsOld && (
                    <PasswordStrengthIndicator password={watchedNewPassword} />
                  )}
                </FormItem>
              )}
            />

            {/* 确认新密码 */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }: { field: ControllerRenderProps<FormValues, "confirmPassword"> & FieldValues }) => (
                <FormItem className="space-y-4 w-full max-w-[420px]">
                  <FormLabel className="block text-base font-medium mb-4">{t("settings.account.confirmPassword")}</FormLabel>
                  <FormControl>
                    <PasswordInput 
                      placeholder={t("settings.account.confirmPasswordPlaceholder")}
                      className="h-10 placeholder:text-muted-foreground hover:border-input/80 hover:shadow-md transition-all duration-200" 
                      {...field} 
                    />
                  </FormControl>
                  {/* 确认密码错误提示 */}
                  {confirmPasswordError && (
                    <p className="text-sm text-destructive">{confirmPasswordError}</p>
                  )}
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="min-w-[100px] hover:scale-105 hover:shadow-lg transition-all duration-200"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* 通行密钥管理 */}
      <PasskeysSection />
    </div>
  );
}

// 邮箱修改表单组件
function EmailChangeForm() {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const emailFormSchema = z.object({
    newEmail: z.string().email(),
    verificationCode: z.string().regex(/^\d{6}$/),
  });

  type EmailFormValues = z.infer<typeof emailFormSchema>;

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      newEmail: "",
      verificationCode: "",
    },
  });

  const watchedEmail = emailForm.watch("newEmail");

  const handleSendCode = async () => {
    if (!watchedEmail) {
      toast.error(t("settings.email.enterNewEmail"));
      return;
    }

    setIsSendingCode(true);
    try {
      await authAPI.sendVerificationCode(watchedEmail, "signup");
      toast.success(t("settings.email.codeSentToNew"));
    } catch (error: any) {
      toast.error(error.message || t("settings.email.sendCodeError"));
    } finally {
      setIsSendingCode(false);
    }
  };

  const onSubmit = async (values: EmailFormValues) => {
    setIsSaving(true);
    try {
      const updatedUser = await userAPI.changeEmail(
        values.newEmail,
        values.verificationCode
      );

      AuthUser.set(updatedUser);
      toast.success(t("settings.email.emailChangeSuccess"));
      emailForm.reset();
    } catch (error: any) {
      toast.error(error.message || t("settings.email.emailChangeError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...emailForm}>
      <form onSubmit={emailForm.handleSubmit(onSubmit)} className="space-y-6">
        {/* 新邮箱和验证码 - 同一行 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[880px]">
          <FormField
            control={emailForm.control}
            name="newEmail"
            render={({ field }: { field: ControllerRenderProps<EmailFormValues, "newEmail"> & FieldValues }) => (
              <FormItem className="flex-1 space-y-4">
                <FormLabel className="block text-base font-medium mb-4">{t("settings.email.newEmail")}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="new@example.com" className="h-10 placeholder:text-muted-foreground hover:border-input/80 hover:shadow-md transition-all duration-200" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={emailForm.control}
            name="verificationCode"
            render={({ field }: { field: ControllerRenderProps<EmailFormValues, "verificationCode"> & FieldValues }) => (
              <FormItem className="flex-1 space-y-4">
                <FormLabel className="block text-base font-medium mb-4">{t("settings.email.verificationCode")}</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder={t("settings.email.codePlaceholder")}
                      maxLength={6}
                      className="h-10 placeholder:text-muted-foreground hover:border-input/80 hover:shadow-md transition-all duration-200"
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isSendingCode || !watchedEmail}
                    className="h-10 whitespace-nowrap border border-input bg-background text-foreground hover:bg-muted/50 hover:scale-105 hover:shadow-md transition-all duration-200 disabled:hover:scale-100 disabled:hover:shadow-none disabled:opacity-50"
                  >
                    {isSendingCode ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("settings.email.sendCode")
                    )}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSaving}
            className="min-w-[100px] hover:scale-105 hover:shadow-lg transition-all duration-200"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

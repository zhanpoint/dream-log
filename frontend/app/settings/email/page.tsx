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
import { userAPI } from "@/lib/user-api";
import { authAPI, AuthUser, AuthHelpers } from "@/lib/auth-api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  newEmail: z.string().email("请输入有效的邮箱地址"),
  verificationCode: z.string().regex(/^\d{6}$/, "验证码必须是6位数字"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EmailPage() {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const currentUser = AuthUser.get();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newEmail: "",
      verificationCode: "",
    },
  });

  const watchedEmail = form.watch("newEmail");

  const handleSendCode = async () => {
    if (!watchedEmail) {
      toast.error("请先输入新邮箱地址");
      return;
    }

    setIsSendingCode(true);
    try {
      await authAPI.sendVerificationCode(watchedEmail, "change_email");
      toast.success("验证码已发送到新邮箱");
    } catch (error: any) {
      toast.error(error.message || "发送验证码失败");
    } finally {
      setIsSendingCode(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const updatedUser = await userAPI.changeEmail(
        values.newEmail,
        values.verificationCode
      );

      AuthUser.set(updatedUser);
      toast.success(t("settings.email.emailChangeSuccess"));
      form.reset();
    } catch (error: any) {
      toast.error(error.message || t("settings.email.emailChangeError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("settings.email.title")}</h1>
        <p className="text-muted-foreground">{t("settings.email.subtitle")}</p>
      </div>

      <div className="border rounded-lg p-6">
        <div className="space-y-6">
          {/* 当前邮箱 */}
          <div>
            <label className="text-sm font-medium">
              {t("settings.email.currentEmail")}
            </label>
            <div className="mt-1.5">
              <Input value={currentUser?.email || ""} disabled />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">{t("settings.email.changeEmail")}</h3>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* 新邮箱 */}
                <FormField
                  control={form.control}
                  name="newEmail"
                  render={({ field }: { field: ControllerRenderProps<FormValues, "newEmail"> & FieldValues }) => (
                    <FormItem>
                      <FormLabel>{t("settings.email.newEmail")}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="new@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 验证码 */}
                <FormField
                  control={form.control}
                  name="verificationCode"
                  render={({ field }: { field: ControllerRenderProps<FormValues, "verificationCode"> & FieldValues }) => (
                    <FormItem>
                      <FormLabel>
                        {t("settings.email.verificationCode")}
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder={t("settings.email.codePlaceholder")}
                            maxLength={6}
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSendCode}
                          disabled={isSendingCode || !watchedEmail}
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

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("common.save")}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}

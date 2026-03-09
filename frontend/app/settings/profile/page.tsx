"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { UserAvatar } from "@/components/user-avatar";
import { AvatarUploadModal } from "@/components/settings/avatar-upload-modal";
import { BirthdaySelect } from "@/components/ui/birthday-select";
import { userAPI, type UserProfile } from "@/lib/user-api";
import { AuthUser } from "@/lib/auth-api";
import { toast } from "sonner";
import { useTranslation } from "@/node_modules/react-i18next";
import { Loader2, Camera, CheckCircle2, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

const USER_CACHE_TTL = 5 * 60 * 1000;
const userCache: {
  data: UserProfile | null;
  expiresAt: number;
  inflight: Promise<UserProfile> | null;
} = {
  data: null,
  expiresAt: 0,
  inflight: null,
};

const getCachedUser = () =>
  userCache.data && Date.now() < userCache.expiresAt ? userCache.data : null;

const setCachedUser = (data: UserProfile) => {
  userCache.data = data;
  userCache.expiresAt = Date.now() + USER_CACHE_TTL;
};

const formSchema = z.object({
  username: z
    .string()
    .min(3, "用户名至少3个字符")
    .max(20, "用户名最多20个字符")
    .optional()
    .or(z.literal("")),
  bio: z.string().max(100, "个人简介最多100个字符").optional(),
  birthday: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProfilePage() {
  const { t } = useTranslation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      bio: "",
      birthday: "",
    },
  });

  const watchedUsername = form.watch("username");
  const debouncedUsername = useDebounce(watchedUsername, 500);

  const applyUserData = (userData: UserProfile) => {
    setUser(userData);
    form.reset({
      username: userData.username || "",
      bio: userData.bio || "",
      birthday: userData.birthday ? formatDate(userData.birthday) : "",
    });
  };

  // 加载用户信息
  useEffect(() => {
    loadUserData();

    // 监听用户更新事件
    const handleUserUpdated = (event: CustomEvent) => {
      if (event.detail) {
        setUser(event.detail);
        setCachedUser(event.detail);
      }
    };

    window.addEventListener("auth:user-updated", handleUserUpdated as EventListener);
    return () => window.removeEventListener("auth:user-updated", handleUserUpdated as EventListener);
  }, []);

  // 检查用户名可用性
  useEffect(() => {
    if (
      debouncedUsername &&
      debouncedUsername !== user?.username &&
      debouncedUsername.length >= 3
    ) {
      checkUsername(debouncedUsername);
    } else {
      setUsernameCheckStatus("idle");
    }
  }, [debouncedUsername, user?.username]);

  const loadUserData = async () => {
    try {
      const cached = getCachedUser();
      if (cached) {
        applyUserData(cached);
        return;
      }

      if (!userCache.inflight) {
        userCache.inflight = userAPI
          .getCurrentUser()
          .then((userData) => {
            setCachedUser(userData);
            return userData;
          })
          .finally(() => {
            userCache.inflight = null;
          });
      }

      const userData = await userCache.inflight;
      applyUserData(userData);
    } catch (error: any) {
      toast.error("加载用户信息失败");
    } finally {
      setIsLoading(false);
    }
  };

  const checkUsername = async (username: string) => {
    setUsernameCheckStatus("checking");
    try {
      const result = await userAPI.checkUsername(username);
      setUsernameCheckStatus(result.available ? "available" : "taken");
    } catch (error) {
      setUsernameCheckStatus("idle");
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const updatedUser = await userAPI.updateProfile({
        username: values.username || undefined,
        bio: values.bio || undefined,
        birthday: values.birthday || undefined,
      });

      setUser(updatedUser);
      setCachedUser(updatedUser);
      AuthUser.set(updatedUser);
      toast.success(t("settings.profile.updateSuccess"));
    } catch (error: any) {
      toast.error(error.message || t("settings.profile.updateError"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <div>用户信息加载失败</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("settings.profile.title")}</h1>
      </div>

      {/* 统一的个人资料卡片 */}
      <div className="border border-border/60 rounded-lg p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* 头像和基本信息区域 - 左右布局 */}
            <div className="flex items-start gap-6">
              {/* 左侧：头像 */}
              <div 
                className="relative w-28 h-28 cursor-pointer group flex-shrink-0" 
                onClick={() => setIsAvatarModalOpen(true)}
                title={t("settings.profile.changeAvatar")}
              >
                <UserAvatar
                  userId={user.id}
                  avatar={user.avatar}
                  username={user.username}
                  size="xl"
                  className="w-28 h-28"
                />
                {/* 右下角相机图标徽章 */}
                <div className="absolute -bottom-0.5 -right-0.5 bg-primary rounded-full p-1.5 border-2 border-background shadow-lg group-hover:scale-110 transition-transform">
                  <Camera className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              </div>

              {/* 右侧：用户名和生日 - 水平排列 */}
              <div className="flex-1 flex gap-6 pt-1">
                {/* 用户名 */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="flex-1 max-w-xs space-y-6">
                      <FormLabel className="block text-base font-medium mb-3">
                        {t("settings.profile.username")}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder={t("settings.profile.usernamePlaceholder")}
                            className="h-10 placeholder:text-muted-foreground hover:border-input/80 hover:shadow-md transition-all duration-200"
                            {...field}
                          />
                          {usernameCheckStatus !== "idle" && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {usernameCheckStatus === "checking" && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                              {usernameCheckStatus === "available" && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                              {usernameCheckStatus === "taken" && (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      {usernameCheckStatus === "available" && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("settings.profile.usernameAvailable")}
                        </p>
                      )}
                      {usernameCheckStatus === "taken" && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {t("settings.profile.usernameTaken")}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 生日 */}
                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => (
                    <FormItem className="flex-1 space-y-6">
                      <FormLabel className="block text-base font-medium mb-3">
                        {t("settings.profile.birthday")}
                      </FormLabel>
                      <FormControl>
                        <BirthdaySelect
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 分隔线 */}
            <div className="border-t border-border/60" />

            {/* 个人简介 - 独立区域 */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem className="space-y-6">
                  <FormLabel className="block text-base font-medium mb-3">
                    {t("settings.profile.bio")}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <textarea
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-all duration-200 ease-out placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none hover:border-input/80 hover:shadow-md"
                        placeholder={t("settings.profile.bioPlaceholder")}
                        {...field}
                      />
                      <div className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                        {field.value?.length || 0}/100
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 保存按钮 - 右对齐，无分隔线 */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={
                  isSaving || usernameCheckStatus === "taken" ||
                  usernameCheckStatus === "checking"
                }
                className="min-w-[100px] hover:scale-105 hover:shadow-lg transition-all duration-200"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />
    </div>
  );
}

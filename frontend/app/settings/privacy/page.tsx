"use client";

import { useEffect, useState } from "react";
import { userAPI, type UserProfile } from "@/lib/user-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type Visibility = "private" | "friends" | "public";

export default function PrivacySettingsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    userAPI
      .getCurrentUser()
      .then(setProfile)
      .catch(() => toast.error(t("settings.privacy.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const updateVisibility = async (key: "bookmarks_visibility" | "created_communities_visibility" | "joined_communities_visibility", value: Visibility) => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await userAPI.updateProfile({ [key]: value });
      setProfile(updated);
      toast.success(t("settings.privacy.saveSuccess"));
    } catch {
      toast.error(t("settings.privacy.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("settings.privacy.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.privacy.subtitle")}</p>
      </div>

      <div className="rounded-lg border border-border/60 p-6 space-y-5">
        {[
          { key: "bookmarks_visibility", label: t("settings.privacy.items.bookmarks") },
          { key: "created_communities_visibility", label: t("settings.privacy.items.createdCommunities") },
          { key: "joined_communities_visibility", label: t("settings.privacy.items.joinedCommunities") },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
            </div>
            <Select
              value={profile[item.key as keyof UserProfile] as Visibility}
              onValueChange={(v) => updateVisibility(item.key as "bookmarks_visibility" | "created_communities_visibility" | "joined_communities_visibility", v as Visibility)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">{t("settings.privacy.visibility.private")}</SelectItem>
                <SelectItem value="friends">{t("settings.privacy.visibility.friends")}</SelectItem>
                <SelectItem value="public">{t("settings.privacy.visibility.public")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}

      </div>
    </div>
  );
}

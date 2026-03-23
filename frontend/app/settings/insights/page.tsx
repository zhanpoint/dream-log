"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { insightAPI, type InsightSettings } from "@/lib/insight-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Award, BarChart3, Bell, Calendar, CalendarDays, GitCompare, Loader2, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const DEFAULT_SETTINGS: InsightSettings = {
  monthly_report_enabled: true,
  weekly_report_enabled: true,
  annual_report_enabled: true,
  show_comparison: false,
  notify_on_reports: true,
};

export default function InsightSettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<InsightSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleaningAll, setCleaningAll] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await insightAPI.getSettings();
        setSettings(data);
      } catch {
        toast.error(t("settings.insights.loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateField = async (field: keyof InsightSettings, value: boolean) => {
    if (!settings) return;
    const updated = { ...settings, [field]: value };
    setSettings(updated);

    setSaving(true);
    try {
      await insightAPI.updateSettings({ [field]: value });
    } catch {
      toast.error(t("settings.insights.saveFailed"));
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setSaving(true);
    try {
      const updated = await insightAPI.updateSettings(DEFAULT_SETTINGS);
      setSettings(updated);
      toast.success(t("settings.insights.restoreSuccess"));
    } catch {
      toast.error(t("settings.insights.restoreFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const count = await insightAPI.cleanup();
      toast.success(t("settings.insights.cleanupSuccess", { count }));
    } catch {
      toast.error(t("settings.insights.cleanupFailed"));
    } finally {
      setCleaning(false);
    }
  };

  const handleCleanupAll = async () => {
    setCleaningAll(true);
    try {
      // TODO: 需要添加 cleanupAll API
      toast.success(t("settings.insights.cleanupAllSuccess"));
    } catch {
      toast.error(t("settings.insights.cleanupFailed"));
    } finally {
      setCleaningAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return <div>{t("settings.insights.loadFailedText")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            {t("settings.insights.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("settings.insights.subtitle")}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 hover:bg-primary/10 hover:border-primary/50 transition-colors">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              {t("settings.insights.restoreDefaults")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("settings.insights.restoreDefaultsTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("settings.insights.restoreDefaultsDesc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetDefaults} disabled={saving}>
                {t("common.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* 定期报告 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {t("settings.insights.periodicReports")}
          </CardTitle>
          <CardDescription>
            {t("settings.insights.periodicReportsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 三个报告开关 - 同一行，简洁布局 */}
          <div className="flex items-center justify-between gap-6">
            {/* 周报 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/[0.15] dark:hover:bg-white/[0.15] transition-colors group">
              <Calendar className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
              <Label htmlFor="weekly-enabled" className="text-sm cursor-pointer">{t("settings.insights.enableWeekly")}</Label>
              <Switch
                id="weekly-enabled"
                checked={settings.weekly_report_enabled ?? true}
                onCheckedChange={(v) => updateField("weekly_report_enabled", v)}
              />
            </div>

            {/* 月报 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/[0.15] dark:hover:bg-white/[0.15] transition-colors group">
              <CalendarDays className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              <Label htmlFor="monthly-enabled" className="text-sm cursor-pointer">{t("settings.insights.enableMonthly")}</Label>
              <Switch
                id="monthly-enabled"
                checked={settings.monthly_report_enabled}
                onCheckedChange={(v) => updateField("monthly_report_enabled", v)}
              />
            </div>

            {/* 年度回顾 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/[0.15] dark:hover:bg-white/[0.15] transition-colors group">
              <Award className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <Label htmlFor="annual-enabled" className="text-sm cursor-pointer">{t("settings.insights.enableAnnual")}</Label>
              <Switch
                id="annual-enabled"
                checked={settings.annual_report_enabled ?? true}
                onCheckedChange={(v) => updateField("annual_report_enabled", v)}
              />
            </div>
          </div>

          <Separator />

          {/* 变化对比 */}
          <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/[0.15] dark:hover:bg-white/[0.15] transition-colors">
            <div className="flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-blue-500" />
              <div>
                <Label htmlFor="show-comparison" className="text-sm cursor-pointer">{t("settings.insights.showComparison")}</Label>
                <p className="text-xs text-muted-foreground">{t("settings.insights.showComparisonDesc")}</p>
              </div>
            </div>
            <Switch
              id="show-comparison"
              checked={settings.show_comparison ?? false}
              onCheckedChange={(v) => updateField("show_comparison", v)}
            />
          </div>

          <Separator />

          {/* 统一通知开关 */}
          <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/[0.15] dark:hover:bg-white/[0.15] transition-colors">
            <Label htmlFor="notify-reports" className="flex items-center gap-1.5 cursor-pointer">
              <Bell className="h-3.5 w-3.5 text-blue-500" />
              {t("settings.insights.notifyReports")}
            </Label>
            <Switch
              id="notify-reports"
              checked={settings.notify_on_reports ?? true}
              onCheckedChange={(v) => updateField("notify_on_reports", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 数据管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-500" />
            {t("settings.insights.dataManagement")}
          </CardTitle>
          <CardDescription>
            {t("settings.insights.dataManagementDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.insights.cleanupOld")}</p>
              <p className="text-xs text-muted-foreground">
                {t("settings.insights.cleanupOldDesc")}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cleaning}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800 transition-all min-w-[80px]"
                >
                  {cleaning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("settings.insights.cleanup")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.insights.cleanupOldTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.insights.cleanupOldConfirm")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCleanup} disabled={cleaning}>
                    {t("settings.insights.confirmCleanup")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.insights.cleanupAll")}</p>
              <p className="text-xs text-muted-foreground">
                {t("settings.insights.cleanupAllDesc")}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={cleaningAll}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800 transition-all min-w-[80px]"
                >
                  {cleaningAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("settings.insights.cleanup")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.insights.cleanupAllTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.insights.cleanupAllConfirm")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCleanupAll} disabled={cleaningAll}>
                    {t("settings.insights.confirmCleanup")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

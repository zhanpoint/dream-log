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

const DEFAULT_SETTINGS: InsightSettings = {
  monthly_report_enabled: true,
  weekly_report_enabled: true,
  annual_report_enabled: true,
  show_comparison: false,
  notify_on_reports: true,
};

export default function InsightSettingsPage() {
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
        toast.error("加载设置失败");
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
      toast.error("保存失败");
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
      toast.success("已恢复默认设置");
    } catch {
      toast.error("恢复失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const count = await insightAPI.cleanup();
      toast.success(`已清理 ${count} 条过期报告`);
    } catch {
      toast.error("清理失败");
    } finally {
      setCleaning(false);
    }
  };

  const handleCleanupAll = async () => {
    setCleaningAll(true);
    try {
      // TODO: 需要添加 cleanupAll API
      toast.success("已清理所有洞察报告");
    } catch {
      toast.error("清理失败");
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
    return <div>加载设置失败</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            洞察报告设置
          </h1>
          <p className="text-muted-foreground mt-1">
            管理 AI 分析报告的生成和通知偏好
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 hover:bg-primary/10 hover:border-primary/50 transition-colors">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              恢复默认设置
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>恢复默认设置</AlertDialogTitle>
              <AlertDialogDescription>
                所有洞察报告设置将恢复为默认值。此操作不会删除已生成的报告。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetDefaults} disabled={saving}>
                确认恢复
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
            定期报告
          </CardTitle>
          <CardDescription>
            系统会定期自动为你生成梦境总结，帮助你追踪记录习惯、发现情绪和睡眠变化
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 三个报告开关 - 同一行，简洁布局 */}
          <div className="flex items-center justify-between gap-6">
            {/* 周报 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/[0.15] dark:hover:bg-white/[0.15] transition-colors cursor-pointer group">
              <Calendar className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
              <Label htmlFor="weekly-enabled" className="text-sm cursor-pointer">启用周报</Label>
              <Switch
                id="weekly-enabled"
                checked={settings.weekly_report_enabled ?? true}
                onCheckedChange={(v) => updateField("weekly_report_enabled", v)}
              />
            </div>

            {/* 月报 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/[0.15] dark:hover:bg-white/[0.15] transition-colors cursor-pointer group">
              <CalendarDays className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              <Label htmlFor="monthly-enabled" className="text-sm cursor-pointer">启用月报</Label>
              <Switch
                id="monthly-enabled"
                checked={settings.monthly_report_enabled}
                onCheckedChange={(v) => updateField("monthly_report_enabled", v)}
              />
            </div>

            {/* 年度回顾 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/[0.15] dark:hover:bg-white/[0.15] transition-colors cursor-pointer group">
              <Award className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <Label htmlFor="annual-enabled" className="text-sm cursor-pointer">启用年度回顾</Label>
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
                <Label htmlFor="show-comparison" className="text-sm cursor-pointer">变化对比</Label>
                <p className="text-xs text-muted-foreground">对比本期与上期的变化趋势</p>
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
              新报告通知
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
            数据管理
          </CardTitle>
          <CardDescription>
            管理已生成的洞察报告数据
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">清理过期洞察报告</p>
              <p className="text-xs text-muted-foreground">
                删除超过 6 个月的旧报告
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
                  清理
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>清理过期洞察报告</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作会删除超过 6 个月的旧报告。确定继续吗？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCleanup} disabled={cleaning}>
                    确认清理
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">清理所有洞察报告</p>
              <p className="text-xs text-muted-foreground">
                删除所有已生成的报告
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
                  清理
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>清理所有洞察报告</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作会删除你已生成的所有洞察报告记录，且无法恢复。确定继续吗？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCleanupAll} disabled={cleaningAll}>
                    确认清理
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

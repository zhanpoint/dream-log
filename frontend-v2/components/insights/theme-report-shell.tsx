"use client";

import { DeleteReportButton } from "@/components/insights/delete-report-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { insightAPI, type Insight, type InsightSettings } from "@/lib/insight-api";
import {
  AlertCircle,
  ArrowLeft,
  Lightbulb,
  Loader2,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ThemeReportType = "EMOTION_HEALTH" | "SLEEP_QUALITY" | "THEME_PATTERN";

interface ThemeReportShellProps {
  reportType: ThemeReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  renderReport: (insight: Insight, showComparison: boolean) => React.ReactNode;
}

export function ThemeReportShell({
  reportType,
  title,
  description,
  icon,
  renderReport,
}: ThemeReportShellProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const insightIdFromUrl = searchParams.get("id");
  
  const [insight, setInsight] = useState<Insight | null>(null);
  const [settings, setSettings] = useState<InsightSettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    insightAPI.getSettings().then(setSettings).catch(() => {});
  }, []);

  // Load insight from URL if id is provided
  useEffect(() => {
    if (insightIdFromUrl) {
      setLoading(true);
      insightAPI
        .getById(insightIdFromUrl)
        .then((data) => {
          setInsight(data);
          if (!data.is_read) {
            insightAPI.markAsRead(insightIdFromUrl).catch(() => {});
          }
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : "加载报告失败";
          toast.error(msg);
          setInsight(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [insightIdFromUrl]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 头部 */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/insights">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-lg border-border/60 hover:border-primary/50 hover:bg-primary/10 hover:scale-105 hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <ArrowLeft className="h-4 w-4 text-foreground group-hover:text-primary transition-colors" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{title}</h1>
              <p className="text-sm text-muted-foreground truncate">{description}</p>
            </div>
          </div>
        </div>
        {insight && (
          <DeleteReportButton
            insightId={insight.id}
            redirectTo={pathname ?? "/insights"}
            className="h-9 w-9 p-0 rounded-lg shrink-0"
          />
        )}
      </div>

      {/* 报告内容 */}
      {loading && (
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">正在加载报告...</p>
        </div>
      )}

      {!loading && !insight && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="flex justify-center mb-4">{icon}</div>
          <p className="text-sm">未找到报告，请返回洞察页面生成</p>
        </div>
      )}

      {!loading && insight && renderReport(insight, settings?.show_comparison ?? false)}
    </div>
  );
}

// ========== 通用子组件 ==========

export function ComparisonBanner({
  description,
  trend,
}: {
  description: string | null;
  trend: string | null;
}) {
  if (!description) return null;

  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const colorClass =
    trend === "up" ? "text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800" :
    trend === "down" ? "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800" :
    "text-muted-foreground border-muted bg-muted/30";

  return (
    <div className={cn("flex items-center gap-2 p-3 rounded-lg border text-sm mb-4", colorClass)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{description}</span>
    </div>
  );
}

export function AnomalyAlert({ hasAlert, message }: { hasAlert: boolean; message: string | null }) {
  if (!hasAlert || !message) return null;
  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardContent className="pt-4">
        <div className="flex gap-2">
          <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-sm text-orange-700 dark:text-orange-300">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PositiveFeedback({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Card className="border-green-200 dark:border-green-800">
      <CardContent className="pt-4">
        <div className="flex gap-2">
          <Sparkles className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-300">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecommendationList({
  items,
}: {
  items: Array<{ suggestion: string; action: string; timing?: string }>;
}) {
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          个性化建议
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((r, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50">
            <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div>
              <p className="text-sm font-medium">{r.suggestion}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.action}</p>
              {r.timing && <p className="text-xs text-muted-foreground/70 mt-0.5">时机：{r.timing}</p>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

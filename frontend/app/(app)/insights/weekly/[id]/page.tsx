"use client";

import { EChartsWrapper } from "@/components/charts/echarts-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { insightAPI, type Insight } from "@/lib/insight-api";
import { EMOTION_COLORS, getEmotionLabel } from "@/lib/emotion-utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN, enUS, ja } from "date-fns/locale";
import type { Locale } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Cloud,
  Flame,
  Heart,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { DeleteReportButton } from "@/components/insights/delete-report-button";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// ===== 类型 =====
interface KeyInsight {
  message: string;
}

interface ActionItem {
  action: string;
  why: string;
}

type WeeklyStats = {
  total_dreams?: number;
  avg_sleep_quality?: number;
};

type WeeklyCharts = {
  emotion_distribution?: Record<string, number>;
  sleep_quality_trend?: Array<{ date: string; quality: number }>;
};

type WeeklyAi = {
  weekly_summary?: string;
  key_insights?: KeyInsight[];
  action_items?: ActionItem[];
};

type WeeklyPeriod = {
  week_start?: string;
  week_end?: string;
};

type WeeklyData = {
  statistics?: WeeklyStats;
  ai_analysis?: WeeklyAi;
  charts?: WeeklyCharts;
  period?: WeeklyPeriod;
  record_days?: number;
  streak_days?: number;
};

// ===== 辅助函数 =====
function getDateLocale(lang: string): Locale {
  switch (lang) {
    case "cn":
      return zhCN;
    case "ja":
      return ja;
    case "en":
    default:
      return enUS;
  }
}

function getSleepQualityText(score: number, t: (key: string) => string): string {
  if (score >= 4.5) return t("insights.report.veryGood");
  if (score >= 3.5) return t("insights.report.good");
  if (score >= 2.5) return t("insights.report.average");
  if (score >= 1.5) return t("insights.report.poor");
  return t("insights.report.veryPoor");
}

function getEmotionTextColorClass(emotion: string): string {
  const map: Record<string, string> = {
    joy: "text-amber-500",
    sadness: "text-indigo-500",
    fear: "text-violet-500",
    anger: "text-red-500",
    disgust: "text-emerald-500",
    surprise: "text-orange-500",
    trust: "text-blue-500",
    anticipation: "text-pink-500",
  };

  return map[emotion] ?? "text-slate-500";
}

export default function WeeklyReportPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const { id } = useParams<{ id: string }>();
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await insightAPI.getById(id);
        setInsight(data);
        if (!data.is_read) await insightAPI.markAsRead(id);
      } catch {
        toast.error(t("insights.report.loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, t]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">{t("insights.report.reportNotFound")}</p>
        <Link href="/insights"><Button variant="link" className="mt-2">{t("insights.report.backToInsights")}</Button></Link>
      </div>
    );
  }

  const data = insight.data as WeeklyData;
  const stats: WeeklyStats = data.statistics || {};
  const ai: WeeklyAi = data.ai_analysis || {};
  const charts: WeeklyCharts = data.charts || {};
  const period: WeeklyPeriod = data.period || {};

  const keyInsights = ai.key_insights || [];
  const actionItems = ai.action_items || [];
  const emotionDist = charts.emotion_distribution || {};
  const sleepTrend = charts.sleep_quality_trend || [];
  const recordDays = data.record_days ?? 0;
  const streakDays = data.streak_days ?? 0;

  const weekStart = period.week_start
    ? format(new Date(period.week_start), dateLocale === zhCN || dateLocale === ja ? "M月d日" : "MMM d", {
        locale: dateLocale,
      })
    : "";
  const weekEnd = period.week_end
    ? format(new Date(period.week_end), dateLocale === zhCN || dateLocale === ja ? "M月d日" : "MMM d", {
        locale: dateLocale,
      })
    : "";

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 返回与删除 */}
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
          <h1 className="text-xl font-bold truncate">{t("insights.main.weeklyLabel")}：{weekStart}-{weekEnd}</h1>
        </div>
        <DeleteReportButton insightId={insight.id} redirectTo="/insights" className="h-9 w-9 p-0 rounded-lg shrink-0" />
      </div>

      <div className="space-y-6">
        {/* 关键数据 - 横向统计 */}
        <div className="grid grid-cols-[2fr_1fr] gap-8 py-8 px-4">
          {/* 左侧：数字指标 */}
          <div className="flex items-start justify-around">
            <div className="flex flex-col items-center gap-2">
              <Cloud className="h-5 w-5 text-indigo-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">{Number(stats.total_dreams) || 0}</p>
              <p className="text-xs text-muted-foreground">{t("insights.report.dreamCount")}</p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">
                {getSleepQualityText(Number(stats.avg_sleep_quality) || 0, t)}
              </p>
              <p className="text-xs text-muted-foreground">{t("insights.report.avgSleepQuality")}</p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">{streakDays}</p>
              <p className="text-xs text-muted-foreground">{t("insights.report.streakDays")}</p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">{recordDays}</p>
              <p className="text-xs text-muted-foreground">{t("insights.report.weeklyRecord")}</p>
            </div>
          </div>

          {/* 右侧：主要情绪 */}
          {Object.keys(emotionDist).length > 0 && (
            <div className="flex flex-col pl-8 border-l border-border/50">
              <div className="flex items-center gap-2 h-5 mb-4">
                <Heart className="h-5 w-5 text-rose-500" />
                <p className="text-xs text-muted-foreground">{t("insights.report.mainEmotions")}</p>
              </div>
              <div className="flex flex-col gap-2.5">
                {Object.entries(emotionDist)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .slice(0, 3)
                  .map(([emotion]) => (
                    <div key={emotion} className="flex items-center gap-2 pl-7">
                      <svg className="h-2 w-2 shrink-0" viewBox="0 0 8 8" aria-hidden>
                        <circle cx="4" cy="4" r="4" fill={(EMOTION_COLORS as Record<string, string>)[emotion] || "#94a3b8"} />
                      </svg>
                      <span
                        className={cn("text-sm", getEmotionTextColorClass(emotion))}
                      >
                        {getEmotionLabel(emotion, t)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* AI 总结 */}
        {ai.weekly_summary && (
          <div className="space-y-1 py-2">
            <div className="flex items-center gap-1.5 mb-3 px-1">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("insights.report.weeklySummary")}</h3>
            </div>
            <div className="px-4 py-1">
              <p className="text-base leading-relaxed text-muted-foreground">{String(ai.weekly_summary)}</p>
            </div>
          </div>
        )}

        {/* 核心洞察 */}
        {keyInsights.length > 0 && (
          <div className="space-y-1 py-2">
            <div className="flex items-center gap-1.5 mb-3 px-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("insights.report.coreInsights")}</h3>
            </div>
            <div className="space-y-4">
              {keyInsights.map((insight, i) => (
                <div key={i} className="relative pl-6 py-1">
                  {/* 左侧装饰线 */}
                  <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent rounded-full" />
                  
                  <p className="text-[15px] leading-relaxed text-muted-foreground">
                    {insight.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 睡眠质量趋势图 */}
        {sleepTrend.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-medium">{t("insights.report.sleepQualityTrend")}</h3>
            </div>
            <div className="border rounded-lg p-4">
              <EChartsWrapper
                height={240}
                option={{
                  grid: { top: 20, bottom: 40, left: 50, right: 30 },
                  xAxis: {
                    type: "category",
                    data: sleepTrend.map((d) => format(new Date(d.date), "M/d", { locale: dateLocale })),
                  },
                  yAxis: { 
                    type: "value", 
                    min: 0, 
                    max: 5, 
                    interval: 1,
                    axisLabel: {
                      formatter: (value: number) => {
                        const labels: Record<number, string> = {
                          0: "0",
                          1: t("insights.report.veryPoor"),
                          2: t("insights.report.poor"),
                          3: t("insights.report.average"),
                          4: t("insights.report.good"),
                          5: t("insights.report.veryGood")
                        };
                        return labels[value] || value.toString();
                      }
                    }
                  },
                  series: [{
                    type: "line",
                    data: sleepTrend.map((d) => d.quality),
                    smooth: true,
                    areaStyle: { opacity: 0.2 },
                    lineStyle: { width: 2 },
                    markLine: {
                      data: [{ type: "average", name: t("insights.report.average") }],
                      silent: true,
                    },
                  }],
                  tooltip: { 
                    trigger: "axis",
                    formatter: (params: any) => {
                      const value = params[0].value;
                      const qualityText = getSleepQualityText(value, t);
                      return `${params[0].name}<br/>${t("insights.report.sleepQuality")}: ${qualityText} (${value})`;
                    }
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* 情绪分布饼图 */}
        {Object.keys(emotionDist).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-1">
              <Heart className="h-4 w-4 text-rose-500" />
              <h3 className="text-sm font-medium">{t("insights.report.emotionDistribution")}</h3>
            </div>
            <div className="border rounded-lg p-4">
              <EChartsWrapper
                height={280}
                option={{
                  grid: { bottom: 60 },
                  series: [{
                    type: "pie",
                    radius: ["40%", "70%"],
                    center: ["50%", "42%"],
                    data: Object.entries(emotionDist).map(([k, v]) => ({
                      name: getEmotionLabel(k, t),
                      value: Math.round((v as number) * 100),
                    })),
                    label: { formatter: "{b}: {c}%" },
                  }],
                  tooltip: { trigger: "item", formatter: "{b}: {c}%" },
                  legend: { 
                    bottom: 15, 
                    orient: "horizontal",
                    itemGap: 20,
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* 行动建议 */}
        {actionItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-1">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("insights.report.actionSuggestions")}</h3>
            </div>
            <div className="space-y-3">
              {actionItems.map((item, i) => (
                  <div key={i} className="relative pl-6 py-1">
                    {/* 左侧装饰线 */}
                    <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent rounded-full" />
                    
                    <div className="space-y-1">
                      <p className="text-[15px] leading-relaxed text-foreground">
                        {item.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.why}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 数据不足提示 - 移到底部 */}
        {Number(stats.total_dreams) >= 3 && Number(stats.total_dreams) <= 4 && (
          <div className="mt-8 pt-6 border-t border-border/40">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500/70" />
              <span>{t("insights.report.insufficientDataWeekly")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

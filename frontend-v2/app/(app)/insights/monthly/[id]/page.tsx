"use client";

import { EChartsWrapper } from "@/components/charts/echarts-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { insightAPI, type Insight } from "@/lib/insight-api";
import { EMOTION_COLORS, EMOTION_LABELS, getEmotionLabel } from "@/lib/emotion-utils";
import { format } from "date-fns";
import { zhCN, enUS, ja } from "date-fns/locale";
import type { Locale } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calendar,
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
interface Pattern {
  pattern: string;
  frequency: string;
  impact: string;
}

interface MeaningfulDream {
  date: string;
  why_special: string;
}

type MonthlyStats = {
  total_dreams?: number;
  avg_sleep_quality?: number;
};

type MonthlyCharts = {
  emotion_distribution?: Record<string, number>;
  sleep_quality_trend?: Array<{ date: string; quality: number; vividness?: number }>;
  trigger_frequency?: Array<{ name: string; count: number }>;
  emotion_timeline?: Array<{ date: string; emotion: string; intensity: number }>;
};

type MonthlyAi = {
  patterns?: Pattern[];
  meaningful_dreams?: MeaningfulDream[];
  monthly_summary?: string;
};

type MonthlyPeriod = {
  year?: string | number;
  month?: string | number;
};

type MonthlyData = {
  statistics?: MonthlyStats;
  ai_analysis?: MonthlyAi;
  charts?: MonthlyCharts;
  period?: MonthlyPeriod;
  record_days?: number;
  streak_days?: number;
};

// ===== 辅助函数 =====
function getDateLocale(lang: string): Locale {
  switch (lang) {
    case "zh-CN":
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

function getVividnessText(score: number, t: (key: string) => string): string {
  if (score >= 4.5) return t("insights.report.veryClear");
  if (score >= 3.5) return t("insights.report.clear");
  if (score >= 2.5) return t("insights.report.average");
  if (score >= 1.5) return t("insights.report.blurry");
  return t("insights.report.veryBlurry");
}

function getEmotionIntensityText(score: number, t: (key: string) => string): string {
  if (score >= 4.5) return t("insights.report.veryStrong");
  if (score >= 3.5) return t("insights.report.strong");
  if (score >= 2.5) return t("insights.report.moderate");
  if (score >= 1.5) return t("insights.report.mild");
  return t("insights.report.veryMild");
}

export default function MonthlyReportPage() {
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
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">{t("insights.report.reportNotFound")}</p>
        <Link href="/insights">
          <Button variant="link" className="mt-2">{t("insights.report.backToInsights")}</Button>
        </Link>
      </div>
    );
  }

  const data = insight.data as MonthlyData;
  const stats: MonthlyStats = data.statistics || {};
  const ai: MonthlyAi = data.ai_analysis || {};
  const charts: MonthlyCharts = data.charts || {};
  const period: MonthlyPeriod = data.period || {};

  const patterns = ai.patterns || [];
  const meaningfulDreams = ai.meaningful_dreams || [];
  const emotionDist = charts.emotion_distribution || {};
  const sleepTrend = charts.sleep_quality_trend || [];
  const triggerFreq = charts.trigger_frequency || [];
  const emotionTimeline = charts.emotion_timeline || [];

  // 本月记录天数/连续记录天数都从后端聚合结果中获取
  const recordDays = data.record_days ?? 0;
  const streakDays = data.streak_days ?? 0;

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
          <h1 className="text-xl font-bold truncate">
            {t("insights.report.monthlyReportTitle", { year: period.year, month: period.month })}
          </h1>
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
              <p className="text-2xl font-semibold text-foreground">{stats.total_dreams || 0}</p>
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
              <p className="text-2xl font-semibold text-foreground">{streakDays > 0 ? streakDays : '-'}</p>
              <p className="text-xs text-muted-foreground">{t("insights.report.streakDays")}</p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">{recordDays}</p>
              <p className="text-xs text-muted-foreground">{t("insights.report.monthlyRecord")}</p>
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
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: (EMOTION_COLORS as Record<string, string>)[emotion] || "#94a3b8" }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: (EMOTION_COLORS as Record<string, string>)[emotion] || "#64748b" }}
                      >
                        {getEmotionLabel(emotion, t)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* AI 月度总结 */}
        {ai.monthly_summary && (
          <div className="space-y-1 py-2">
            <div className="flex items-center gap-1.5 mb-3 px-1">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("insights.report.monthlySummary")}</h3>
            </div>
            <div className="px-4 py-1">
              <p className="text-base leading-relaxed text-muted-foreground">{String(ai.monthly_summary)}</p>
            </div>
          </div>
        )}

        {/* 本月规律 */}
        {patterns.length > 0 && (
          <div className="space-y-1 py-2">
            <div className="flex items-center gap-1.5 mb-3 px-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("insights.report.discoveredPatterns")}</h3>
            </div>
            <div className="space-y-4">
              {patterns.map((p, i) => (
                <div key={i} className="relative pl-6 py-1">
                  {/* 左侧装饰线 */}
                  <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent rounded-full" />
                  
                  <div className="space-y-1">
                    <p className="text-[15px] leading-relaxed text-foreground">{p.pattern}</p>
                    {p.impact && (
                      <p className="text-sm text-muted-foreground/80">{t("insights.report.impact")}：{p.impact}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 睡眠质量趋势图 */}
        {sleepTrend.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("insights.report.sleepQualityTrend")}</h3>
            </div>
            <div className="border rounded-lg p-4">
              <EChartsWrapper
                height={280}
                option={{
                  grid: { top: 40, bottom: 40, left: 80, right: 30 },
                  legend: { data: [t("insights.report.sleepQuality"), t("insights.report.dreamVividness")], top: 0, itemGap: 30 },
                  xAxis: {
                    type: "category",
                    data: sleepTrend.map((d) => format(new Date(d.date), "M/d", { locale: zhCN })),
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
                  series: [
                    {
                      name: t("insights.report.sleepQuality"),
                      type: "line",
                      smooth: true,
                      data: sleepTrend.map((d) => d.quality),
                      areaStyle: { opacity: 0.15 },
                    },
                    {
                      name: t("insights.report.dreamVividness"),
                      type: "line",
                      smooth: true,
                      data: sleepTrend.map((d) => d.vividness),
                      lineStyle: { type: "dashed" },
                    },
                  ],
                  tooltip: { 
                    trigger: "axis",
                    formatter: (params: any) => {
                      let result = `${params[0].name}<br/>`;
                      
                      // 睡眠质量
                      if (params[0] && params[0].value !== undefined) {
                        const qualityValue = params[0].value;
                        const qualityText = getSleepQualityText(qualityValue, t);
                        result += `${t("insights.report.sleepQuality")}: ${qualityText}`;
                      }
                      
                      // 梦境清晰度
                      if (params[1] && params[1].value !== undefined) {
                        const vividnessValue = params[1].value;
                        const vividnessText = getVividnessText(vividnessValue, t);
                        result += `<br/>${t("insights.report.dreamVividness")}: ${vividnessText}`;
                      }
                      
                      return result;
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
              <Heart className="h-4 w-4 text-primary" />
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

        {/* 情绪强度时间线 */}
        {emotionTimeline.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("insights.report.emotionTimeline")}</h3>
            </div>
            <div className="border rounded-lg p-4">
              <EChartsWrapper
                height={280}
                option={{
                  grid: { top: 20, bottom: 40, left: 60, right: 30 },
                  tooltip: { 
                    trigger: "axis",
                    formatter: (params: any) => {
                      const value = params[0].value;
                      const intensityText = getEmotionIntensityText(value, t);
                      return `${params[0].name}<br/>${t("insights.report.emotionIntensity")}: ${intensityText}`;
                    }
                  },
                  xAxis: {
                    type: "category",
                    data: emotionTimeline.map((d) => format(new Date(d.date), "M/d", { locale: zhCN })),
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
                          1: t("insights.report.veryMild"),
                          2: t("insights.report.mild"),
                          3: t("insights.report.moderate"),
                          4: t("insights.report.strong"),
                          5: t("insights.report.veryStrong")
                        };
                        return labels[value] || value.toString();
                      }
                    }
                  },
                  series: [{
                    type: "line",
                    smooth: true,
                    data: emotionTimeline.map((d) => d.intensity),
                    areaStyle: { opacity: 0.15 },
                    lineStyle: { color: "#f43f5e" },
                    itemStyle: { color: "#f43f5e" },
                  }],
                }}
              />
            </div>
          </div>
        )}

        {/* 触发因素频率 */}
        {triggerFreq.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-1">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("insights.report.triggerFrequency")}</h3>
            </div>
            <div className="border rounded-lg p-4">
              <EChartsWrapper
                height={250}
                option={{
                  grid: { top: 20, bottom: 60, left: 50, right: 20 },
                  tooltip: { trigger: "axis" },
                  xAxis: {
                    type: "category",
                    data: triggerFreq.map((d) => d.name),
                    axisLabel: { rotate: 30 },
                  },
                  yAxis: { type: "value" },
                  series: [{
                    type: "bar",
                    data: triggerFreq.map((d) => d.count),
                    itemStyle: { borderRadius: [4, 4, 0, 0] },
                  }],
                }}
              />
            </div>
          </div>
        )}

        {/* 难忘梦境 */}
        {meaningfulDreams.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-1">
              <Cloud className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("insights.report.memorableDreams")}</h3>
            </div>
            <div className="space-y-3">
              {meaningfulDreams.map((d, i) => (
                <div key={i} className="relative pl-6 py-1">
                  {/* 左侧装饰线 */}
                  <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent rounded-full" />
                  
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(d.date), dateLocale === zhCN || dateLocale === ja ? "M月d日" : "MMM d", { locale: dateLocale })}
                    </p>
                    <p className="text-[15px] leading-relaxed text-foreground">{d.why_special}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 数据不足提示 - 移到底部 */}
        {Number(stats.total_dreams) >= 5 && Number(stats.total_dreams) < 10 && (
          <div className="mt-8 pt-6 border-t border-border/40">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500/70" />
              <span>{t("insights.report.insufficientDataHint", { count: stats.total_dreams as number })}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

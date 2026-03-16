"use client";

import { Suspense } from "react";
import { EChartsWrapper } from "@/components/charts/echarts-wrapper";
import { ComparisonBanner, ThemeReportShell } from "@/components/insights/theme-report-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Insight } from "@/lib/insight-api";
import { format } from "date-fns";
import { zhCN, enUS, ja } from "date-fns/locale";
import type { Locale } from "date-fns";
import {
  CheckCircle2,
  Lightbulb,
  Moon,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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

// ===== 类型 =====
interface SleepPattern {
  pattern: string;
  impact: string;
  suggestion: string;
}

interface QualityFactor {
  factor: string;
  effect: "positive" | "negative";
  evidence: string;
  action: string;
}

interface SleepTip {
  tip: string;
  timing: string;
  expected: string;
}

interface GoodHabit {
  habit: string;
  benefit: string;
  encouragement: string;
}

interface NotableNight {
  date: string;
  note: string;
}

type SleepAi = {
  sleep_summary?: string;
  sleep_patterns?: SleepPattern[];
  quality_factors?: QualityFactor[];
  sleep_tips?: SleepTip[];
  good_habits?: GoodHabit[];
  notable_nights?: NotableNight[];
  comparison_insight?: string | null;
  sleep_improvement?: string | null;
  weekday_weekend_gap?: string;
};

type SleepCharts = {
  sleep_quality_trend?: Array<{ date: string; quality: number }>;
  weekday_vs_weekend?: { weekday?: number; weekend?: number };
};

type SleepData = {
  ai_analysis?: SleepAi;
  charts?: SleepCharts;
};

function SleepQualityContent() {
  const { t } = useTranslation();
  return (
    <ThemeReportShell
      reportType="SLEEP_QUALITY"
      title={t("insights.theme.sleepLabel")}
      description={t("insights.theme.sleepDesc")}
      icon={<Moon className="h-5 w-5 text-indigo-500" />}
      renderReport={(insight, showComparison) => (
        <SleepReport insight={insight} showComparison={showComparison} />
      )}
    />
  );
}

export default function SleepQualityPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <SleepQualityContent />
    </Suspense>
  );
}

function SleepReport({ insight, showComparison }: { insight: Insight; showComparison: boolean }) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  
  const data = insight.data as SleepData;
  const ai: SleepAi = data.ai_analysis || {};
  const charts: SleepCharts = data.charts || {};

  const sleepPatterns = ai.sleep_patterns || [];
  const qualityFactors = ai.quality_factors || [];
  const sleepTips = ai.sleep_tips || [];
  const goodHabits = ai.good_habits || [];
  const notableNights = ai.notable_nights || [];
  const comparisonInsight = ai.comparison_insight ?? null;
  const sleepImprovement = ai.sleep_improvement ?? null;

  const sleepTrend = charts.sleep_quality_trend || [];
  const weekdayVsWeekend = charts.weekday_vs_weekend || {};
  const weekdayVal = weekdayVsWeekend.weekday ?? 0;
  const weekendVal = weekdayVsWeekend.weekend ?? 0;
  const barDisplayMin = 0.2;
  const weekdayBarVal = weekdayVal === 0 ? barDisplayMin : weekdayVal;
  const weekendBarVal = weekendVal === 0 ? barDisplayMin : weekendVal;

  return (
    <div className="space-y-6">
      {/* 1. AI 睡眠总结 */}
      {ai.sleep_summary && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Moon className="h-4 w-4 text-indigo-500" />
              {t("insights.report.sleepStateSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-[46px] pr-6 pb-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{String(ai.sleep_summary)}</p>
          </CardContent>
        </Card>
      )}

      {/* 2. 与上期对比 */}
      {showComparison && comparisonInsight && (
        <ComparisonBanner description={comparisonInsight} trend={null} />
      )}

      {/* 3. 好习惯 - 先展示正面信息 */}
      {goodHabits.length > 0 && (
        <Card className="border-green-500/40 dark:border-green-500/30 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <Sparkles className="h-4 w-4" />
              {t("insights.report.goodHabitsToKeep")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pl-[46px] pr-6 pb-4">
            {goodHabits.map((h, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5 shrink-0" />
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{h.habit}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{h.benefit}</p>
                  {h.encouragement && (
                    <p className="text-xs text-green-600 dark:text-green-400 italic">{h.encouragement}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 4. 睡眠改善观察 - 紧接着展示成长 */}
      {sleepImprovement && (
        <Card className="border-blue-500/40 dark:border-blue-500/30 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
              {t("insights.report.sleepImprovementObservation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-[46px] pr-6 pb-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{sleepImprovement}</p>
          </CardContent>
        </Card>
      )}

      {/* 5. 睡眠质量趋势图 */}
      {sleepTrend && sleepTrend.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm">{t("insights.report.sleepQualityTrend")}</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            <EChartsWrapper
              height={220}
              option={{
                grid: { top: 30, bottom: 40, left: 50, right: 20 },
                xAxis: {
                  type: "category",
                  data: sleepTrend.map((d) => format(new Date(d.date), dateLocale === zhCN || dateLocale === ja ? "M/d" : "MMM d", { locale: dateLocale })),
                  axisLabel: { rotate: 30, fontSize: 10 },
                },
                yAxis: {
                  type: "value",
                  min: 0,
                  max: 5,
                  interval: 1,
                  splitNumber: 5,
                  axisLabel: {
                    formatter: (v: number) => {
                      if (v === 0) return "";
                      if (v === 1) return getSleepQualityText(1, t);
                      if (v === 2) return getSleepQualityText(2, t);
                      if (v === 3) return getSleepQualityText(3, t);
                      if (v === 4) return getSleepQualityText(4, t);
                      if (v === 5) return getSleepQualityText(5, t);
                      return "";
                    },
                  },
                },
                series: [{
                  type: "line",
                  data: sleepTrend.map((d) => d.quality),
                  smooth: true,
                  areaStyle: { opacity: 0.15 },
                  lineStyle: { width: 2, color: "#6366f1" },
                  itemStyle: { color: "#6366f1" },
                  markLine: {
                    data: [{ type: "average", name: t("insights.report.average") }],
                    silent: true,
                    lineStyle: { type: "dashed" },
                    label: { show: false },
                  },
                }],
                tooltip: {
                  trigger: "axis",
                  formatter: (params: any) => {
                    const p = params[0];
                    const quality = Math.round(p.value);
                    return `${p.axisValue}<br/>${t("insights.report.sleepQuality")}: ${getSleepQualityText(quality, t)}`;
                  },
                },
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* 6. 工作日 vs 周末（避免 weekday/weekend 均为 0 时渲染出数字 0） */}
      {(typeof weekdayVsWeekend.weekday === "number" || typeof weekdayVsWeekend.weekend === "number") && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm">{t("insights.report.weekdayVsWeekend")}</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            <EChartsWrapper
              height={160}
              option={{
                grid: { top: 20, bottom: 30, left: 60, right: 20 },
                xAxis: { type: "value", min: 0, max: 5, interval: 1 },
                yAxis: { type: "category", data: [t("insights.report.weekday"), t("insights.report.weekend")] },
                series: [{
                  type: "bar",
                  data: [weekdayBarVal, weekendBarVal],
                  barWidth: 30,
                  itemStyle: { borderRadius: [0, 4, 4, 0] },
                  label: {
                    show: true,
                    position: "right",
                    formatter: (params: { dataIndex?: number }) =>
                      `${[weekdayVal, weekendVal][params.dataIndex ?? 0]}/5`,
                  },
                }],
                tooltip: { trigger: "axis" },
              }}
            />
            {/* AI 文字分析 */}
            {ai.weekday_weekend_gap && (
              <p className="text-xs text-muted-foreground mt-3 px-1 leading-relaxed">
                {String(ai.weekday_weekend_gap)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 7. 睡眠规律 */}
      {sleepPatterns.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm">{t("insights.report.discoveredSleepPatterns")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-6 pb-4">
            {sleepPatterns.map((p, i) => (
              <div key={i} className="p-3 rounded-lg border border-border/30 dark:border-border/20 space-y-1.5">
                <p className="text-sm font-medium">{p.pattern}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.impact}</p>
                {p.suggestion && (
                  <div className="pt-1.5 border-t border-border/30">
                    <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                      <span className="font-medium">{t("insights.report.suggestion")}：</span>{p.suggestion}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 8. 质量影响因素 */}
      {qualityFactors.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm">{t("insights.report.sleepQualityFactors")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-6 pb-4">
            {qualityFactors.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/30 dark:border-border/20">
                <div className={cn(
                  "p-1 rounded shrink-0",
                  f.effect === "positive" 
                    ? "bg-green-100 dark:bg-green-900/40" 
                    : "bg-orange-100 dark:bg-orange-900/40"
                )}>
                  {f.effect === "positive"
                    ? <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    : <TrendingDown className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{f.factor}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.evidence}</p>
                  {f.action && (
                    <div className="pt-1.5 border-t border-border/30">
                      <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                        <span className="font-medium">{t("insights.report.actionAdvice")}：</span>{f.action}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 9. 值得关注的夜晚 */}
      {notableNights.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500" />
              {t("insights.report.notableNights")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pl-[46px] pr-6 pb-4">
            {notableNights.map((n, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(n.date), dateLocale === zhCN || dateLocale === ja ? "M月d日" : "MMM d", { locale: dateLocale })}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{n.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 10. 改善建议 */}
      {sleepTips.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              {t("insights.report.sleepImprovementTips")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pl-[46px] pr-6 pb-4">
            {sleepTips.map((tip, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <p className="text-sm font-medium leading-relaxed">{tip.tip}</p>
                    {tip.timing && <p className="text-xs text-muted-foreground leading-relaxed">{t("insights.report.executionTime")}：{tip.timing}</p>}
                    {tip.expected && <p className="text-xs text-muted-foreground leading-relaxed">{t("insights.report.expectedEffect")}：{tip.expected}</p>}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

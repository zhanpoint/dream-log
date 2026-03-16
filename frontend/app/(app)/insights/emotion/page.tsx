"use client";

import { Suspense } from "react";
import { EChartsWrapper } from "@/components/charts/echarts-wrapper";
import { ComparisonBanner, ThemeReportShell } from "@/components/insights/theme-report-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Insight } from "@/lib/insight-api";
import { EMOTION_COLORS, getEmotionLabel } from "@/lib/emotion-utils";
import { format } from "date-fns";
import { zhCN, enUS, ja } from "date-fns/locale";
import type { Locale } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Heart,
  Lightbulb,
  Moon,
  Sparkles,
} from "lucide-react";
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

function getEmotionIntensityText(score: number, t: (key: string) => string): string {
  if (score >= 4.5) return t("insights.report.veryStrong");
  if (score >= 3.5) return t("insights.report.strong");
  if (score >= 2.5) return t("insights.report.moderate");
  if (score >= 1.5) return t("insights.report.mild");
  return t("insights.report.veryMild");
}

// ===== 类型 =====
interface DominantFeeling {
  emotion: string;
  percentage: number;
  interpretation: string;
}

interface StressSignal {
  signal: string;
  possible_source: string;
  dream_evidence: string;
  coping_suggestion: string;
}

interface PositiveSign {
  sign: string;
  meaning: string;
  encouragement: string;
}

interface EmotionTip {
  tip: string;
  when: string;
  benefit: string;
  example?: string;
}

interface KeyDream {
  date: string;
  emotion_insight: string;
}

type EmotionAi = {
  emotion_state?: string;
  dominant_feelings?: DominantFeeling[];
  stress_signals?: StressSignal[];
  positive_signs?: PositiveSign[];
  emotion_tips?: EmotionTip[];
  key_dreams?: KeyDream[];
  comparison_insight?: string | null;
  emotional_growth?: string | null;
};

type EmotionCharts = {
  emotion_distribution?: Record<string, number>;
  emotion_timeline?: Array<{ date: string; emotion: string; intensity: number }>;
};

type EmotionData = {
  ai_analysis?: EmotionAi;
  charts?: EmotionCharts;
};

function EmotionHealthContent() {
  const { t } = useTranslation();
  return (
    <ThemeReportShell
      reportType="EMOTION_HEALTH"
      title={t("insights.theme.emotionLabel")}
      description={t("insights.theme.emotionDesc")}
      icon={<Heart className="h-5 w-5 text-rose-500" />}
      renderReport={(insight, showComparison) => (
        <EmotionReport insight={insight} showComparison={showComparison} />
      )}
    />
  );
}

export default function EmotionHealthPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <EmotionHealthContent />
    </Suspense>
  );
}

function EmotionReport({ insight, showComparison }: { insight: Insight; showComparison: boolean }) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const data = insight.data as EmotionData;
  const ai: EmotionAi = data.ai_analysis || {};
  const charts: EmotionCharts = data.charts || {};

  const dominantFeelings = ai.dominant_feelings || [];
  const stressSignals = ai.stress_signals || [];
  const positiveSigns = ai.positive_signs || [];
  const emotionTips = ai.emotion_tips || [];
  const keyDreams = ai.key_dreams || [];
  const comparisonInsight = ai.comparison_insight ?? null;
  const emotionalGrowth = ai.emotional_growth ?? null;

  const emotionDist = charts.emotion_distribution || {};
  const emotionTimeline = charts.emotion_timeline || [];

  return (
    <div className="space-y-6">
      {/* 1. AI 情绪状态总结 - 开门见山，让用户快速了解整体状态 */}
      {ai.emotion_state && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-rose-500" />
              {t("insights.report.emotionStateSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-[46px] pr-6 pb-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{String(ai.emotion_state)}</p>
          </CardContent>
        </Card>
      )}

      {/* 2. 与上期对比 - 紧接着展示变化趋势 */}
      {showComparison && comparisonInsight && (
        <ComparisonBanner description={comparisonInsight} trend={null} />
      )}

      {/* 3. 积极信号 - 先展示正面信息，给用户信心和鼓励 */}
      {positiveSigns.length > 0 && (
        <Card className="border-green-500/40 dark:border-green-500/30 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <Sparkles className="h-4 w-4" />
              {t("insights.report.positiveSigns")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pl-[46px] pr-6 pb-4">
            {positiveSigns.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5 shrink-0" />
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{s.sign}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.meaning}</p>
                  {s.encouragement && (
                    <p className="text-xs text-green-600 dark:text-green-400 italic">{s.encouragement}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 4. 情绪成长观察 - 紧接着展示成长，强化正面感受 */}
      {emotionalGrowth && (
        <Card className="border-blue-500/40 dark:border-blue-500/30 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
              {t("insights.report.emotionalGrowthObservation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-[46px] pr-6 pb-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{emotionalGrowth}</p>
          </CardContent>
        </Card>
      )}

      {/* 5. 高频情绪柱状图 - 数据可视化，直观展示情绪分布 */}
      {Object.keys(emotionDist).length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm">{t("insights.report.highFrequencyEmotions")}</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            <EChartsWrapper
              height={220}
              option={{
                grid: { top: 30, bottom: 40, left: 50, right: 20 },
                xAxis: {
                  type: "category",
                  data: Object.entries(emotionDist)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([k]) => getEmotionLabel(k, t)),
                  axisLabel: { fontSize: 11 },
                },
                yAxis: { 
                  type: "value", 
                  minInterval: 1, 
                  name: t("insights.report.frequency"), 
                  nameTextStyle: { fontSize: 10 },
                  axisLabel: {
                    formatter: (value: number) => Math.round(value).toString()
                  }
                },
                series: [{
                  type: "bar",
                  data: Object.entries(emotionDist)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([k, v]) => ({
                      value: Math.max(1, Math.round(v)),
                      itemStyle: {
                        color: (EMOTION_COLORS as Record<string, string>)[k] || "#e11d48",
                        borderRadius: [4, 4, 0, 0]
                      }
                    })),
                  barMaxWidth: 40,
                  label: {
                    show: true,
                    position: "top",
                    fontSize: 11,
                    formatter: (params: any) => {
                      const val = Math.max(1, Math.round(params.value));
                      return val.toString();
                    }
                  }
                }],
                tooltip: { 
                  trigger: "axis",
                  formatter: (params: any) => {
                    const p = params[0];
                    const val = Math.max(1, Math.round(p.value));
                    return `${p.name}: ${val} ${t("insights.report.times")}`;
                  }
                },
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* 6. 情绪强度趋势 - 时间维度的变化，帮助用户看到波动 */}
      {emotionTimeline.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm">{t("insights.report.emotionIntensityTrend")}</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            <EChartsWrapper
              height={200}
              option={{
                grid: { top: 20, bottom: 40, left: 50, right: 20 },
                xAxis: {
                  type: "category",
                  data: emotionTimeline.map((d) => format(new Date(d.date), "M/d", { locale: dateLocale })),
                  axisLabel: { rotate: 30, fontSize: 10 },
                },
                yAxis: { 
                  type: "value", 
                  min: 0, 
                  max: 5, 
                  name: t("insights.report.intensity"),
                  nameTextStyle: { fontSize: 11 },
                  splitNumber: 5,
                  axisLabel: {
                    fontSize: 10,
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
                  data: emotionTimeline.map((d) => d.intensity || 0),
                  smooth: true,
                  symbol: "circle",
                  symbolSize: 6,
                  lineStyle: { color: "#e11d48", width: 2 },
                  areaStyle: { color: "rgba(225,29,72,0.08)" },
                  itemStyle: { color: "#e11d48" },
                  markLine: {
                    symbol: "none",
                    data: [{ 
                      type: "average", 
                      name: t("insights.report.average"),
                      lineStyle: { 
                        type: "dashed",
                        color: "#e11d48",
                        opacity: 0.5
                      },
                      label: {
                        show: false
                      }
                    }],
                    silent: true
                  }
                }],
                tooltip: {
                  trigger: "axis",
                  formatter: (params: unknown) => {
                    const arr = params as Array<{ dataIndex: number; value: number }>;
                    if (!arr?.length) return "";
                    const item = emotionTimeline[arr[0].dataIndex];
                    const intensityText = getEmotionIntensityText(item?.intensity, t);
                    return `${item?.date}<br/>${getEmotionLabel(item?.emotion, t)}<br/>${t("insights.report.intensity")}: ${intensityText}`;
                  },
                },
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* 7. 主导情绪解读 - 深入分析主要情绪 */}
      {dominantFeelings.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm">{t("insights.report.dominantEmotionInterpretation")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-6 pb-4">
            {dominantFeelings.slice(0, 3).map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/30 dark:border-border/20">
                <span
                  className="text-sm font-medium shrink-0"
                >
                  {getEmotionLabel(f.emotion, t)}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.interpretation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 8. 压力信号 - 需要关注的问题，放在中后部分 */}
      {stressSignals.length > 0 && (
        <Card className="border-orange-500/40 dark:border-orange-500/30 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
              <AlertCircle className="h-4 w-4" />
              {t("insights.report.stressSignals")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pl-[46px] pr-6 pb-4">
            {stressSignals.map((s, i) => (
              <div key={i} className="p-3 rounded-lg space-y-2 border border-orange-500/30">
                <p className="text-sm font-medium">{s.signal}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {s.possible_source && <span>{t("insights.report.possibleSource")}：{s.possible_source}</span>}
                  {s.dream_evidence && (
                    <span className="flex items-center gap-1">
                      <Moon className="h-3 w-3" />{s.dream_evidence}
                    </span>
                  )}
                </div>
                {s.coping_suggestion && (
                  <div className="pt-1 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">{t("insights.report.copingSuggestion")}：</span>{s.coping_suggestion}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 9. 情绪管理建议 - 实用建议，帮助用户改善 */}
      {emotionTips.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              {t("insights.report.emotionManagementTips")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pl-[46px] pr-6 pb-4">
            {emotionTips.map((tip, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg border border-border/30 dark:border-border/20">
                <div className="h-6 w-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="space-y-1.5 flex-1">
                  <p className="text-sm font-medium leading-relaxed">{tip.tip}</p>
                  {tip.when && <p className="text-xs text-muted-foreground leading-relaxed">{t("insights.report.timing")}：{tip.when}</p>}
                  {tip.benefit && <p className="text-xs text-muted-foreground leading-relaxed">{t("insights.report.expectedEffect")}：{tip.benefit}</p>}
                  {tip.example && (
                    <p className="text-xs text-muted-foreground/70 italic leading-relaxed">{t("insights.report.example")}：{tip.example}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 10. 关键梦境解读 - 最后展示具体案例，让用户回顾 */}
      {keyDreams.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Moon className="h-4 w-4 text-primary" />
              {t("insights.report.keyDreamInsights")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pl-[46px] pr-6 pb-4">
            {keyDreams.map((d, i) => (
              <div key={i} className="p-3 rounded-lg border border-border/30 dark:border-border/20 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(d.date), dateLocale === zhCN || dateLocale === ja ? "M月d日" : "MMM d", { locale: dateLocale })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{d.emotion_insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

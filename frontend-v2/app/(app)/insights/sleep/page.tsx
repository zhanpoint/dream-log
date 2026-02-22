"use client";

import { EChartsWrapper } from "@/components/charts/echarts-wrapper";
import { ComparisonBanner, ThemeReportShell } from "@/components/insights/theme-report-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Insight } from "@/lib/insight-api";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
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

// ===== 类型 =====
interface SleepPattern { pattern: string; impact: string; suggestion: string }
interface QualityFactor { factor: string; effect: "positive" | "negative"; evidence: string; action: string }
interface SleepTip { tip: string; timing: string; expected: string }
interface GoodHabit { habit: string; benefit: string; encouragement: string }
interface NotableNight { date: string; note: string }

export default function SleepQualityPage() {
  return (
    <ThemeReportShell
      reportType="SLEEP_QUALITY"
      title="睡眠质量分析"
      description="深度分析睡眠模式、质量因素与改善建议"
      icon={<Moon className="h-5 w-5 text-indigo-500" />}
      renderReport={(insight, showComparison) => (
        <SleepReport insight={insight} showComparison={showComparison} />
      )}
    />
  );
}

function SleepReport({ insight, showComparison }: { insight: Insight; showComparison: boolean }) {
  const data = insight.data as Record<string, unknown>;
  const ai = (data.ai_analysis || {}) as Record<string, unknown>;
  const charts = (data.charts || {}) as Record<string, unknown>;

  const sleepPatterns = (ai.sleep_patterns || []) as SleepPattern[];
  const qualityFactors = (ai.quality_factors || []) as QualityFactor[];
  const sleepTips = (ai.sleep_tips || []) as SleepTip[];
  const goodHabits = (ai.good_habits || []) as GoodHabit[];
  const notableNights = (ai.notable_nights || []) as NotableNight[];
  const comparisonInsight = ai.comparison_insight as string | null | undefined;
  const sleepImprovement = ai.sleep_improvement as string | null | undefined;

  const sleepTrend = (charts.sleep_quality_trend || []) as Array<{ date: string; quality: number }>;
  const weekdayVsWeekend = (charts.weekday_vs_weekend || {}) as { weekday: number; weekend: number };
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
              睡眠状态总结
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
              值得保持的好习惯
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
              睡眠改善观察
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
            <CardTitle className="text-sm">睡眠质量趋势</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            <EChartsWrapper
              height={220}
              option={{
                grid: { top: 30, bottom: 40, left: 50, right: 20 },
                xAxis: {
                  type: "category",
                  data: sleepTrend.map((d) => format(new Date(d.date), "M/d", { locale: zhCN })),
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
                      const labels = ["", "很低", "低", "中", "高", "很高"];
                      return labels[v] || "";
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
                    data: [{ type: "average", name: "平均" }],
                    silent: true,
                    lineStyle: { type: "dashed" },
                    label: { show: false },
                  },
                }],
                tooltip: {
                  trigger: "axis",
                  formatter: (params: any) => {
                    const p = params[0];
                    const labels = ["很低", "很低", "低", "中", "高", "很高"];
                    const quality = Math.round(p.value);
                    return `${p.axisValue}<br/>睡眠质量: ${labels[quality] || quality}`;
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
            <CardTitle className="text-sm">工作日 vs 周末</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            <EChartsWrapper
              height={160}
              option={{
                grid: { top: 20, bottom: 30, left: 60, right: 20 },
                xAxis: { type: "value", min: 0, max: 5, interval: 1 },
                yAxis: { type: "category", data: ["工作日", "周末"] },
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
            <CardTitle className="text-sm">发现的睡眠规律</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-6 pb-4">
            {sleepPatterns.map((p, i) => (
              <div key={i} className="p-3 rounded-lg border border-border/30 dark:border-border/20 space-y-1.5">
                <p className="text-sm font-medium">{p.pattern}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.impact}</p>
                {p.suggestion && (
                  <div className="pt-1.5 border-t border-border/30">
                    <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                      <span className="font-medium">建议：</span>{p.suggestion}
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
            <CardTitle className="text-sm">睡眠质量影响因素</CardTitle>
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
                        <span className="font-medium">行动建议：</span>{f.action}
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
              值得关注的夜晚
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pl-[46px] pr-6 pb-4">
            {notableNights.map((n, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(n.date), "M月d日", { locale: zhCN })}
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
              睡眠改善建议
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
                    {tip.timing && <p className="text-xs text-muted-foreground leading-relaxed">执行时间：{tip.timing}</p>}
                    {tip.expected && <p className="text-xs text-muted-foreground leading-relaxed">预期效果：{tip.expected}</p>}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { EChartsWrapper } from "@/components/charts/echarts-wrapper";
import { ComparisonBanner, ThemeReportShell } from "@/components/insights/theme-report-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Insight } from "@/lib/insight-api";
import { EMOTION_COLORS, EMOTION_LABELS } from "@/lib/emotion-utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle2,
  Heart,
  Lightbulb,
  Moon,
  Sparkles,
} from "lucide-react";

// ===== 类型 =====
interface DominantFeeling { emotion: string; percentage: number; interpretation: string }
interface StressSignal { signal: string; possible_source: string; dream_evidence: string; coping_suggestion: string }
interface PositiveSign { sign: string; meaning: string; encouragement: string }
interface EmotionTip { tip: string; when: string; benefit: string; example?: string }
interface KeyDream { date: string; emotion_insight: string }

export default function EmotionHealthPage() {
  return (
    <ThemeReportShell
      reportType="EMOTION_HEALTH"
      title="情绪健康分析"
      description="深度分析情绪波动、压力来源和调节建议"
      icon={<Heart className="h-5 w-5 text-rose-500" />}
      renderReport={(insight, showComparison) => (
        <EmotionReport insight={insight} showComparison={showComparison} />
      )}
    />
  );
}

function EmotionReport({ insight, showComparison }: { insight: Insight; showComparison: boolean }) {
  const data = insight.data as Record<string, unknown>;
  const ai = (data.ai_analysis || {}) as Record<string, unknown>;
  const charts = (data.charts || {}) as Record<string, unknown>;

  const dominantFeelings = (ai.dominant_feelings || []) as DominantFeeling[];
  const stressSignals = (ai.stress_signals || []) as StressSignal[];
  const positiveSigns = (ai.positive_signs || []) as PositiveSign[];
  const emotionTips = (ai.emotion_tips || []) as EmotionTip[];
  const keyDreams = (ai.key_dreams || []) as KeyDream[];
  const comparisonInsight = ai.comparison_insight as string | null | undefined;
  const emotionalGrowth = ai.emotional_growth as string | null | undefined;

  const emotionDist = (charts.emotion_distribution || {}) as Record<string, number>;
  const emotionTimeline = (charts.emotion_timeline || []) as Array<{ date: string; emotion: string; intensity: number }>;

  return (
    <div className="space-y-6">
      {/* 1. AI 情绪状态总结 - 开门见山，让用户快速了解整体状态 */}
      {ai.emotion_state && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-rose-500" />
              情绪状态总结
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
              积极信号
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
              情绪成长观察
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
            <CardTitle className="text-sm">高频情绪分布</CardTitle>
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
                    .map(([k]) => (EMOTION_LABELS as Record<string, string>)[k] || k),
                  axisLabel: { fontSize: 11 },
                },
                yAxis: { 
                  type: "value", 
                  minInterval: 1, 
                  name: "次数", 
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
                    return `${p.name}: ${val} 次`;
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
            <CardTitle className="text-sm">情绪强度趋势</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            <EChartsWrapper
              height={200}
              option={{
                grid: { top: 20, bottom: 40, left: 50, right: 20 },
                xAxis: {
                  type: "category",
                  data: emotionTimeline.map((d) => format(new Date(d.date), "M/d", { locale: zhCN })),
                  axisLabel: { rotate: 30, fontSize: 10 },
                },
                yAxis: { 
                  type: "value", 
                  min: 0, 
                  max: 5, 
                  name: "强度",
                  splitNumber: 5,
                  axisLabel: {
                    formatter: (value: number) => {
                      const labels = ["0", "很低", "低", "中", "高", "很高"];
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
                      name: "平均",
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
                    const intensityLabels = ["", "很低", "低", "中等", "高", "很高"];
                    const intensityText = intensityLabels[Math.round(item?.intensity)] || item?.intensity;
                    return `${item?.date}<br/>${(EMOTION_LABELS as Record<string, string>)[item?.emotion] || item?.emotion}<br/>强度: ${intensityText}`;
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
            <CardTitle className="text-sm">主导情绪解读</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-6 pb-4">
            {dominantFeelings.slice(0, 3).map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/30 dark:border-border/20">
                <span
                  className="text-sm font-medium shrink-0"
                  style={{ color: (EMOTION_COLORS as Record<string, string>)[f.emotion] || undefined }}
                >
                  {(EMOTION_LABELS as Record<string, string>)[f.emotion] || f.emotion}
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
              压力信号
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pl-[46px] pr-6 pb-4">
            {stressSignals.map((s, i) => (
              <div key={i} className="p-3 rounded-lg space-y-2 border border-orange-500/30">
                <p className="text-sm font-medium">{s.signal}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {s.possible_source && <span>可能来源：{s.possible_source}</span>}
                  {s.dream_evidence && (
                    <span className="flex items-center gap-1">
                      <Moon className="h-3 w-3" />{s.dream_evidence}
                    </span>
                  )}
                </div>
                {s.coping_suggestion && (
                  <div className="pt-1 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">应对建议：</span>{s.coping_suggestion}
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
              情绪管理建议
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
                  {tip.when && <p className="text-xs text-muted-foreground leading-relaxed">时机：{tip.when}</p>}
                  {tip.benefit && <p className="text-xs text-muted-foreground leading-relaxed">预期效果：{tip.benefit}</p>}
                  {tip.example && (
                    <p className="text-xs text-muted-foreground/70 italic leading-relaxed">例如：{tip.example}</p>
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
              关键梦境解读
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pl-[46px] pr-6 pb-4">
            {keyDreams.map((d, i) => (
              <div key={i} className="p-3 rounded-lg border border-border/30 dark:border-border/20 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{format(new Date(d.date), "M月d日", { locale: zhCN })}</span>
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

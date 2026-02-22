"use client";

import { EChartsWrapper } from "@/components/charts/echarts-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { insightAPI, type Insight } from "@/lib/insight-api";
import { EMOTION_COLORS, EMOTION_LABELS } from "@/lib/emotion-utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
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

// ===== 类型 =====
interface Pattern { pattern: string; frequency: string; impact: string }
interface MeaningfulDream { date: string; why_special: string }

// ===== 辅助函数 =====
function getSleepQualityText(score: number): string {
  if (score >= 4.5) return "非常好";
  if (score >= 3.5) return "良好";
  if (score >= 2.5) return "一般";
  if (score >= 1.5) return "较差";
  return "很差";
}

function getVividnessText(score: number): string {
  if (score >= 4.5) return "非常清晰";
  if (score >= 3.5) return "清晰";
  if (score >= 2.5) return "一般";
  if (score >= 1.5) return "模糊";
  return "很模糊";
}

function getEmotionIntensityText(score: number): string {
  if (score >= 4.5) return "非常强烈";
  if (score >= 3.5) return "强烈";
  if (score >= 2.5) return "中等";
  if (score >= 1.5) return "轻微";
  return "很轻微";
}

export default function MonthlyReportPage() {
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
        toast.error("加载报告失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
        <p className="text-muted-foreground">报告不存在</p>
        <Link href="/insights">
          <Button variant="link" className="mt-2">返回报告中心</Button>
        </Link>
      </div>
    );
  }

  const data = insight.data as Record<string, unknown>;
  const stats = (data.statistics || {}) as Record<string, unknown>;
  const ai = (data.ai_analysis || {}) as Record<string, unknown>;
  const charts = (data.charts || {}) as Record<string, unknown>;
  const period = (data.period || {}) as Record<string, string | number>;

  const patterns = (ai.patterns || []) as Pattern[];
  const meaningfulDreams = (ai.meaningful_dreams || []) as MeaningfulDream[];
  const emotionDist = (charts.emotion_distribution || {}) as Record<string, number>;
  const sleepTrend = (charts.sleep_quality_trend || []) as Array<{ date: string; quality: number; vividness?: number }>;
  const triggerFreq = (charts.trigger_frequency || []) as Array<{ name: string; count: number }>;
  const emotionTimeline = (charts.emotion_timeline || []) as Array<{ date: string; emotion: string; intensity: number }>;

  // 本月记录天数/连续记录天数都从后端聚合结果中获取
  const recordDays = (data.record_days as number) || 0;
  const streakDays = (data.streak_days as number) || 0;

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
          <h1 className="text-xl font-bold truncate">{period.year}年{period.month}月梦境月报</h1>
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
              <p className="text-xs text-muted-foreground">梦境总数</p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">
                {getSleepQualityText(Number(stats.avg_sleep_quality) || 0)}
              </p>
              <p className="text-xs text-muted-foreground">平均睡眠质量</p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">{streakDays > 0 ? streakDays : '-'}</p>
              <p className="text-xs text-muted-foreground">连续记录天数</p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">{recordDays}</p>
              <p className="text-xs text-muted-foreground">本月记录</p>
            </div>
          </div>

          {/* 右侧：主要情绪 */}
          {Object.keys(emotionDist).length > 0 && (
            <div className="flex flex-col pl-8 border-l border-border/50">
              <div className="flex items-center gap-2 h-5 mb-4">
                <Heart className="h-5 w-5 text-rose-500" />
                <p className="text-xs text-muted-foreground">主要情绪</p>
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
                        {(EMOTION_LABELS as Record<string, string>)[emotion] || emotion}
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
              <h3 className="text-sm font-medium">本月总结</h3>
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
              <h3 className="text-sm font-medium">发现的规律</h3>
            </div>
            <div className="space-y-4">
              {patterns.map((p, i) => (
                <div key={i} className="relative pl-6 py-1">
                  {/* 左侧装饰线 */}
                  <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent rounded-full" />
                  
                  <div className="space-y-1">
                    <p className="text-[15px] leading-relaxed text-foreground">{p.pattern}</p>
                    {p.impact && (
                      <p className="text-sm text-muted-foreground/80">影响：{p.impact}</p>
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
              <h3 className="text-sm font-medium">睡眠质量趋势</h3>
            </div>
            <div className="border rounded-lg p-4">
              <EChartsWrapper
                height={280}
                option={{
                  grid: { top: 40, bottom: 40, left: 50, right: 30 },
                  legend: { data: ["睡眠质量", "梦境清晰度"], top: 0 },
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
                          1: "很差",
                          2: "较差",
                          3: "一般",
                          4: "良好",
                          5: "非常好"
                        };
                        return labels[value] || value.toString();
                      }
                    }
                  },
                  series: [
                    {
                      name: "睡眠质量",
                      type: "line",
                      smooth: true,
                      data: sleepTrend.map((d) => d.quality),
                      areaStyle: { opacity: 0.15 },
                    },
                    {
                      name: "梦境清晰度",
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
                        const qualityText = getSleepQualityText(qualityValue);
                        result += `睡眠质量: ${qualityText}`;
                      }
                      
                      // 梦境清晰度
                      if (params[1] && params[1].value !== undefined) {
                        const vividnessValue = params[1].value;
                        const vividnessText = getVividnessText(vividnessValue);
                        result += `<br/>梦境清晰度: ${vividnessText}`;
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
              <h3 className="text-sm font-medium">情绪分布</h3>
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
                      name: (EMOTION_LABELS as Record<string, string>)[k] || k,
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
              <h3 className="text-sm font-medium">情绪强度时间线</h3>
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
                      const intensityText = getEmotionIntensityText(value);
                      return `${params[0].name}<br/>情绪强度: ${intensityText}`;
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
                          1: "很轻微",
                          2: "轻微",
                          3: "中等",
                          4: "强烈",
                          5: "非常强烈"
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
              <h3 className="text-sm font-medium">触发因素频率</h3>
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
              <h3 className="text-sm font-medium">难忘梦境</h3>
            </div>
            <div className="space-y-3">
              {meaningfulDreams.map((d, i) => (
                <div key={i} className="relative pl-6 py-1">
                  {/* 左侧装饰线 */}
                  <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent rounded-full" />
                  
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(d.date), "M月d日", { locale: zhCN })}
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
              <span>记录更多梦境可获得更深入的分析（当月已记录 {stats.total_dreams as number} 条）</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

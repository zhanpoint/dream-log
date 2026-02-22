"use client";

import { EChartsWrapper } from "@/components/charts/echarts-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { insightAPI, type Insight } from "@/lib/insight-api";
import { EMOTION_COLORS, EMOTION_LABELS } from "@/lib/emotion-utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
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

// ===== 类型 =====
interface KeyInsight { message: string }
interface ActionItem { action: string; why: string }

export default function WeeklyReportPage() {
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
        <p className="text-muted-foreground">报告不存在</p>
        <Link href="/insights"><Button variant="link" className="mt-2">返回报告中心</Button></Link>
      </div>
    );
  }

  const data = insight.data as Record<string, unknown>;
  const stats = (data.statistics || {}) as Record<string, unknown>;
  const ai = (data.ai_analysis || {}) as Record<string, unknown>;
  const charts = (data.charts || {}) as Record<string, unknown>;
  const period = (data.period || {}) as Record<string, string>;

  const keyInsights = (ai.key_insights || []) as KeyInsight[];
  const actionItems = (ai.action_items || []) as ActionItem[];
  const emotionDist = (charts.emotion_distribution || {}) as Record<string, number>;
  const sleepTrend = (charts.sleep_quality_trend || []) as Array<{ date: string; quality: number }>;
  const recordDays = (data.record_days as number) || 0;
  const streakDays = (data.streak_days as number) || 0;

  const weekStart = period.week_start ? format(new Date(period.week_start), "M月d日", { locale: zhCN }) : "";
  const weekEnd = period.week_end ? format(new Date(period.week_end), "M月d日", { locale: zhCN }) : "";

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
          <h1 className="text-xl font-bold truncate">周报：{weekStart}-{weekEnd}</h1>
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
              <p className="text-xs text-muted-foreground">梦境总数</p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">
                <SleepQualityText value={Number(stats.avg_sleep_quality) || 0} />
              </p>
              <p className="text-xs text-muted-foreground">平均睡眠质量</p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">{streakDays}</p>
              <p className="text-xs text-muted-foreground">连续记录天数</p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">{recordDays}</p>
              <p className="text-xs text-muted-foreground">本周记录</p>
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

        {/* AI 总结 */}
        {ai.weekly_summary && (
          <div className="space-y-1 py-2">
            <div className="flex items-center gap-1.5 mb-3 px-1">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">本周总结</h3>
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
              <h3 className="text-sm font-medium">核心洞察</h3>
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
              <h3 className="text-sm font-medium">睡眠质量趋势</h3>
            </div>
            <div className="border rounded-lg p-4">
              <EChartsWrapper
                height={240}
                option={{
                  grid: { top: 20, bottom: 40, left: 50, right: 30 },
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
                  series: [{
                    type: "line",
                    data: sleepTrend.map((d) => d.quality),
                    smooth: true,
                    areaStyle: { opacity: 0.2 },
                    lineStyle: { width: 2 },
                    markLine: {
                      data: [{ type: "average", name: "平均" }],
                      silent: true,
                    },
                  }],
                  tooltip: { 
                    trigger: "axis",
                    formatter: (params: any) => {
                      const value = params[0].value;
                      const labels: Record<number, string> = {
                        1: "很差",
                        2: "较差",
                        3: "一般",
                        4: "良好",
                        5: "非常好"
                      };
                      const qualityText = value >= 4.5 ? "非常好" :
                                         value >= 3.5 ? "良好" :
                                         value >= 2.5 ? "一般" :
                                         value >= 1.5 ? "较差" : "很差";
                      return `${params[0].name}<br/>睡眠质量: ${qualityText} (${value})`;
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

        {/* 行动建议 */}
        {actionItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-1">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">行动建议</h3>
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
              <span>记录更多梦境，下次分析会更准确</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SleepQualityText({ value }: { value: number }) {
  const getQualityText = (score: number): string => {
    if (score >= 4.5) return "非常好";
    if (score >= 3.5) return "良好";
    if (score >= 2.5) return "一般";
    if (score >= 1.5) return "较差";
    return "很差";
  };

  return <>{getQualityText(value)}</>;
}

"use client";

import { EChartsWrapper } from "@/components/charts/echarts-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { insightAPI, type Insight } from "@/lib/insight-api";
import { EMOTION_COLORS, EMOTION_LABELS } from "@/lib/emotion-utils";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Cloud,
  Flame,
  Heart,
  Moon,
  Mountain,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { DeleteReportButton } from "@/components/insights/delete-report-button";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

// 睡眠质量文字映射
const SLEEP_QUALITY_TEXT: Record<number, string> = {
  5: "非常好",
  4: "良好",
  3: "一般",
  2: "较差",
  1: "很差",
};

// 获取睡眠质量文字
const getSleepQualityText = (quality: number): string => {
  const rounded = Math.round(quality);
  return SLEEP_QUALITY_TEXT[rounded] || "一般";
};

// ===== 类型 =====
interface GrowthMilestone { milestone: string; month: string | number; meaning: string }
interface BestMoment { month: number; moment: string }
interface FeaturedDream { id: string; date: string; title: string; summary: string; vividness: number; reason?: string }

export default function AnnualReportPage() {
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
        <Skeleton className="h-[350px]" />
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
  const period = (data.period || {}) as Record<string, number>;

  const growthMilestones = (ai.growth_milestones || []) as GrowthMilestone[];
  const bestMoments = (ai.best_moments || []) as BestMoment[];
  const yearKeywords = (ai.year_keywords || []) as string[];
  const featuredDreams = (data.featured_dreams || []) as FeaturedDream[];
  const monthlyDist = ((charts.monthly_distribution || []) as Array<{ month: string; count: number }>);
  const emotionDist = ((stats.emotion_distribution || {}) as Record<string, number>);

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
          <h1 className="text-xl font-bold truncate">{insight.title}</h1>
        </div>
        <DeleteReportButton insightId={insight.id} redirectTo="/insights" className="h-9 w-9 p-0 rounded-lg shrink-0" />
      </div>

      {/* 年度故事 */}
      {ai.year_story && (
        <Card className="mb-6 bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed font-medium">{String(ai.year_story)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="data" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="data">年度数据</TabsTrigger>
          <TabsTrigger value="months">每月亮点</TabsTrigger>
          <TabsTrigger value="dreams">精选梦境</TabsTrigger>
          <TabsTrigger value="growth">成长轨迹</TabsTrigger>
        </TabsList>

        {/* ===== 年度数据 ===== */}
        <TabsContent value="data" className="space-y-4">
          {/* 关键数据 - 横向统计 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 py-4">
            <div className="flex flex-col items-center gap-2">
              <Cloud className="h-5 w-5 text-indigo-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">{stats.total_dreams || 0}</p>
              <p className="text-xs text-muted-foreground">总记录数</p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">{stats.record_days || 0}</p>
              <p className="text-xs text-muted-foreground">记录天数</p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">{stats.max_streak || 0}天</p>
              <p className="text-xs text-muted-foreground">最长连续</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Moon className="h-5 w-5 text-blue-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">
                {stats.avg_sleep_quality ? getSleepQualityText(stats.avg_sleep_quality) : '-'}
              </p>
              <p className="text-xs text-muted-foreground">平均睡眠</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500 mb-1" />
              <p className="text-2xl font-semibold text-foreground">{stats.best_sleep_month || '-'}月</p>
              <p className="text-xs text-muted-foreground">最佳睡眠</p>
            </div>
          </div>

          {/* 月度分布图 */}
          {monthlyDist.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 px-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">每月梦境记录</h3>
              </div>
              <div className="border rounded-lg p-4">
                <EChartsWrapper
                  height={240}
                  option={{
                    grid: { top: 20, bottom: 40, left: 40, right: 20 },
                    xAxis: {
                      type: "category",
                      data: MONTH_NAMES,
                      axisLabel: { fontSize: 11 },
                    },
                    yAxis: { type: "value", minInterval: 1 },
                    series: [{
                      type: "bar",
                      data: MONTH_NAMES.map((_, i) => {
                        const item = monthlyDist.find((d) => String(d.month) === String(i + 1));
                        return item?.count || 0;
                      }),
                      itemStyle: { borderRadius: [4, 4, 0, 0] },
                      barWidth: '40%',
                    }],
                    tooltip: { trigger: "axis" },
                  }}
                />
              </div>
            </div>
          )}

          {/* 情绪分布 */}
          {Object.keys(emotionDist).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 px-1">
                <Heart className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">年度情绪分布</h3>
              </div>
              <div className="border rounded-lg p-4">
                <EChartsWrapper
                  height={240}
                  option={{
                    series: [{
                      type: "pie",
                      radius: ["35%", "65%"],
                      data: Object.entries(emotionDist).map(([k, v]) => ({
                        name: (EMOTION_LABELS as Record<string, string>)[k] || k,
                        value: v,
                        itemStyle: { color: (EMOTION_COLORS as Record<string, string>)[k] },
                      })),
                      label: { 
                        formatter: (params: any) => {
                          return `${params.name}: ${params.value}`;
                        }
                      },
                    }],
                    tooltip: { 
                      trigger: "item", 
                      formatter: (params: any) => {
                        return `${params.name}: ${params.value}次`;
                      }
                    },
                    legend: { bottom: 0, orient: "horizontal", textStyle: { fontSize: 11 } },
                  }}
                />
              </div>
            </div>
          )}

          {/* 年度关键词 */}
          {yearKeywords.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 px-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">年度关键词</h3>
              </div>
              <div className="flex flex-wrap gap-2.5 px-1">
                {yearKeywords.map((kw, i) => (
                  <Badge 
                    key={i}
                    variant="outline" 
                    className="text-sm px-3 py-1 font-normal cursor-default transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-primary/10 hover:border-primary/50 border-border/60 rounded-full"
                    style={{
                      animation: `fadeIn 0.4s ease-out ${i * 0.08}s both`,
                    }}
                  >
                    {kw}
                  </Badge>
                ))}
              </div>
              <style jsx>{`
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                    transform: translateY(10px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
            </div>
          )}
        </TabsContent>

        {/* ===== 每月亮点 ===== */}
        <TabsContent value="months" className="space-y-3">
          {bestMoments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无每月亮点数据</p>
          ) : (
            <div className="relative py-4">
              {/* 中央时间线 */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20 -translate-x-1/2" />
              
              <div className="space-y-12">
                {bestMoments
                  .sort((a, b) => (a.month || 0) - (b.month || 0))
                  .map((s, i) => {
                    const isLeft = i % 2 === 0;
                    const colors = [
                      { dot: 'bg-blue-500', glow: 'shadow-blue-500/50', text: 'text-blue-500' },
                      { dot: 'bg-purple-500', glow: 'shadow-purple-500/50', text: 'text-purple-500' },
                      { dot: 'bg-pink-500', glow: 'shadow-pink-500/50', text: 'text-pink-500' },
                      { dot: 'bg-orange-500', glow: 'shadow-orange-500/50', text: 'text-orange-500' },
                      { dot: 'bg-green-500', glow: 'shadow-green-500/50', text: 'text-green-500' },
                      { dot: 'bg-cyan-500', glow: 'shadow-cyan-500/50', text: 'text-cyan-500' },
                      { dot: 'bg-rose-500', glow: 'shadow-rose-500/50', text: 'text-rose-500' },
                      { dot: 'bg-amber-500', glow: 'shadow-amber-500/50', text: 'text-amber-500' },
                      { dot: 'bg-indigo-500', glow: 'shadow-indigo-500/50', text: 'text-indigo-500' },
                      { dot: 'bg-teal-500', glow: 'shadow-teal-500/50', text: 'text-teal-500' },
                      { dot: 'bg-violet-500', glow: 'shadow-violet-500/50', text: 'text-violet-500' },
                      { dot: 'bg-fuchsia-500', glow: 'shadow-fuchsia-500/50', text: 'text-fuchsia-500' },
                    ];
                    const color = colors[i % colors.length];
                    
                    return (
                      <div key={i} className="relative flex items-center">
                        {/* 左侧布局：卡片在左，月份在右（节点右侧） */}
                        {isLeft && (
                          <>
                            {/* 左侧卡片 */}
                            <div className="w-[calc(50%-20px)]">
                              <Card className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-4 pb-4">
                                  <p className="text-sm text-foreground leading-relaxed">
                                    {s.moment}
                                  </p>
                                </CardContent>
                              </Card>
                            </div>
                            
                            {/* 左侧占位（节点左侧，卡片与节点的间距） */}
                            <div className="w-[20px]" />
                            
                            {/* 中央节点 */}
                            <div className="absolute left-1/2 -translate-x-1/2 z-10">
                              <div className={`h-3 w-3 rounded-full ${color.dot} shadow-lg ${color.glow} ring-4 ring-background`} />
                            </div>
                            
                            {/* 月份（节点右侧，距离较远） */}
                            <div className="w-[20px] flex justify-start pl-4">
                              <span className={`text-base font-normal ${color.text} whitespace-nowrap`}>{s.month}月</span>
                            </div>
                            
                            {/* 右侧占位 */}
                            <div className="w-[calc(50%-20px)]" />
                          </>
                        )}
                        
                        {/* 右侧布局：月份在左（节点左侧），卡片在右 */}
                        {!isLeft && (
                          <>
                            {/* 左侧占位 */}
                            <div className="w-[calc(50%-20px)]" />
                            
                            {/* 月份（节点左侧，距离较远） */}
                            <div className="w-[20px] flex justify-end pr-4">
                              <span className={`text-base font-normal ${color.text} whitespace-nowrap`}>{s.month}月</span>
                            </div>
                            
                            {/* 中央节点 */}
                            <div className="absolute left-1/2 -translate-x-1/2 z-10">
                              <div className={`h-3 w-3 rounded-full ${color.dot} shadow-lg ${color.glow} ring-4 ring-background`} />
                            </div>
                            
                            {/* 右侧占位（节点右侧，卡片与节点的间距） */}
                            <div className="w-[20px]" />
                            
                            {/* 右侧卡片 */}
                            <div className="w-[calc(50%-20px)]">
                              <Card className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-4 pb-4">
                                  <p className="text-sm text-foreground leading-relaxed">
                                    {s.moment}
                                  </p>
                                </CardContent>
                              </Card>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ===== 精选梦境 ===== */}
        <TabsContent value="dreams" className="space-y-4">
          {featuredDreams.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无精选梦境</p>
          ) : (
            featuredDreams.map((d) => {
              // 格式化日期为更友好的格式
              const dreamDate = new Date(d.date);
              const formattedDate = `${dreamDate.getMonth() + 1}月${dreamDate.getDate()}日`;
              
              return (
                <Link key={d.id} href={`/dreams/${d.id}`}>
                  <Card className="hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group">
                    <CardContent className="pt-5 pb-4">
                      <div className="space-y-3">
                        {/* 标题和标签行 */}
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-base font-medium group-hover:text-primary transition-colors flex-1">
                            {d.title}
                          </h4>
                          {d.reason && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs px-2.5 py-0.5 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200/50 dark:from-amber-950/30 dark:to-orange-950/30 dark:text-amber-300 dark:border-amber-800/30 shrink-0 font-normal"
                            >
                              {d.reason}
                            </Badge>
                          )}
                        </div>
                        
                        {/* 摘要 */}
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {d.summary}
                        </p>
                        
                        {/* 底部日期 */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </TabsContent>

        {/* ===== 成长轨迹 ===== */}
        <TabsContent value="growth" className="space-y-4">
          {/* 成长里程碑 */}
          {growthMilestones.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Flame className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-medium">成长里程碑</h3>
              </div>
              <div className="space-y-4">
                {growthMilestones.map((m, i) => {
                  const colors = [
                    { badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/30' },
                    { badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/30' },
                    { badge: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800/30' },
                  ];
                  const color = colors[i % colors.length];
                  
                  return (
                    <Card key={i} className="hover:shadow-md transition-shadow border-border/40 dark:border-border/20">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className={`shrink-0 text-xs font-normal ${color.badge}`}>
                            {m.month}月
                          </Badge>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-relaxed">{m.milestone}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{m.meaning}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* 情绪成长 */}
          {ai.emotional_journey && (
            <Card className="hover:shadow-md transition-shadow border-rose-200/40 dark:border-rose-800/20">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <Heart className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium">情绪成长</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{String(ai.emotional_journey)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 睡眠改善 */}
          {ai.sleep_evolution && (
            <Card className="hover:shadow-md transition-shadow border-indigo-200/40 dark:border-indigo-800/20">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <Moon className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium">睡眠改善</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{String(ai.sleep_evolution)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 记录习惯 */}
          {ai.habit_achievement && (
            <Card className="hover:shadow-md transition-shadow border-green-200/40 dark:border-green-800/20">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium">记录习惯</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{String(ai.habit_achievement)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 克服的挑战 */}
          {ai.challenges_overcome && (
            <Card className="hover:shadow-md transition-shadow border-slate-200/40 dark:border-slate-700/20">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <Mountain className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium">克服的挑战</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{String(ai.challenges_overcome)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 新年展望 - 特别突出 */}
          {ai.next_year_vision && (
            <Card className="border-primary/40 dark:border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5 dark:from-primary/10 dark:to-purple-500/10 hover:shadow-lg transition-all">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-primary">新年展望</p>
                    <p className="text-sm text-foreground leading-relaxed font-medium">{String(ai.next_year_vision)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {growthMilestones.length === 0 && !ai.emotional_journey && !ai.sleep_evolution && !ai.habit_achievement && (
            <p className="text-center text-muted-foreground py-8">暂无成长轨迹数据</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

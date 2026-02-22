"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DREAM_TYPE_ICON_MAP,
  DREAM_TYPE_LABEL_MAP,
  EMOTION_COLOR_MAP,
  EMOTION_EMOJI_MAP,
  SLEEP_QUALITIES,
  VIVIDNESS_LEVELS,
} from "@/lib/constants";
import { DreamApi, type DreamDetail } from "@/lib/dream-api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  ArrowLeft,
  Brain,
  Calendar,
  Clock,
  Edit,
  Eye,
  Heart,
  Loader2,
  Moon,
  MoreVertical,
  Sparkles,
  Star,
  Target,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function DreamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dreamId = params.id as string;

  const [dream, setDream] = useState<DreamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDream = useCallback(async () => {
    try {
      const data = await DreamApi.get(dreamId);
      setDream(data);
    } catch {
      toast.error("加载梦境失败");
      router.push("/dreams");
    } finally {
      setLoading(false);
    }
  }, [dreamId, router]);

  useEffect(() => {
    fetchDream();
  }, [fetchDream]);

  const handleAnalyze = async () => {
    if (!dream) return;
    setAnalyzing(true);
    try {
      await DreamApi.triggerAnalysis(dream.id);
      toast.success("AI 分析已加入队列，请稍后刷新查看结果");
      // 刷新数据
      setTimeout(fetchDream, 2000);
    } catch {
      toast.error("触发分析失败");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!dream) return;
    setDeleting(true);
    try {
      await DreamApi.delete(dream.id);
      toast.success("梦境已删除");
      router.push("/dreams");
    } catch {
      toast.error("删除失败");
      setDeleting(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!dream) return;
    try {
      const res = await DreamApi.toggleFavorite(dream.id);
      setDream({ ...dream, is_favorite: res.is_favorite });
    } catch {
      toast.error("操作失败");
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!dream) return null;

  const emotionColor = EMOTION_COLOR_MAP[dream.primary_emotion ?? ""] ?? "#a78bfa";
  const sleepLabel = SLEEP_QUALITIES.find((q) => q.value === String(dream.sleep_quality));
  const vividLabel = VIVIDNESS_LEVELS.find((v) => v.value === String(dream.vividness_level));

  return (
    <div className="min-h-screen">
      {/* 情绪驱动顶部背景 */}
      <div
        className="relative h-48 md:h-64 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${emotionColor}20 0%, ${emotionColor}05 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      {/* 主内容区 */}
      <div className="container max-w-4xl mx-auto px-4 -mt-24 pb-20 relative z-10">
        {/* 返回 + 操作栏 */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/dreams">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              返回列表
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
              title="收藏"
            >
              <Star
                className={cn(
                  "w-4 h-4",
                  dream.is_favorite && "fill-amber-400 text-amber-400",
                )}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => router.push(`/dreams/${dream.id}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ===== 头部信息卡 ===== */}
        <Card className="shadow-2xl backdrop-blur-xl bg-card/90">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl md:text-3xl font-bold mb-3">
                  {dream.title || "无标题梦境"}
                  {dream.title_generated_by_ai && (
                    <Badge variant="secondary" className="ml-2 text-xs align-middle">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI 生成
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(dream.dream_date), "yyyy年M月d日 EEEE", {
                      locale: zhCN,
                    })}
                  </span>
                  {dream.sleep_duration_minutes && (
                    <span className="flex items-center gap-1.5">
                      <Moon className="w-4 h-4" />
                      睡眠 {Math.floor(dream.sleep_duration_minutes / 60)}h
                      {dream.sleep_duration_minutes % 60 > 0 &&
                        `${dream.sleep_duration_minutes % 60}m`}
                    </span>
                  )}
                  {vividLabel && (
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4" />
                      清晰度 {vividLabel.emoji} {vividLabel.label}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    浏览 {dream.view_count}
                  </span>
                </div>
              </div>
            </div>

            {/* 情绪概览 */}
            {dream.primary_emotion && (
              <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-primary/5 to-purple-500/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      主导情绪
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">
                        {EMOTION_EMOJI_MAP[dream.primary_emotion] ?? "💭"}
                      </span>
                      <div>
                        <p className="text-xl font-bold">
                          {dream.primary_emotion}
                        </p>
                        {dream.emotion_intensity && (
                          <Progress
                            value={(dream.emotion_intensity / 5) * 100}
                            className="w-28 mt-1.5"
                          />
                        )}
                      </div>
                    </div>
                    {dream.emotion_residual && (
                      <p className="text-xs text-muted-foreground mt-2">
                        🔸 醒来后仍有情绪残留
                      </p>
                    )}
                  </div>

                  {/* AI 情绪分析 */}
                  {dream.emotions.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">
                        AI 情绪分析
                      </p>
                      <div className="space-y-2">
                        {dream.emotions
                          .sort((a, b) => b.score - a.score)
                          .slice(0, 4)
                          .map((e) => (
                            <div
                              key={e.emotion_type}
                              className="flex items-center gap-2"
                            >
                              <span className="text-sm w-20 truncate">
                                {e.emotion_type}
                              </span>
                              <Progress
                                value={e.score * 100}
                                className="flex-1"
                              />
                              <span className="text-xs text-muted-foreground w-10 text-right">
                                {(e.score * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 标签 + 类型 */}
            <div className="mt-4 flex flex-wrap gap-2">
              {dream.dream_types.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">
                  {DREAM_TYPE_ICON_MAP[t]} {DREAM_TYPE_LABEL_MAP[t] ?? t}
                </Badge>
              ))}
              {dream.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  style={{ borderColor: tag.color ?? undefined }}
                >
                  #{tag.name}
                </Badge>
              ))}
            </div>
          </CardHeader>
        </Card>

        <div className="mt-8 space-y-6">
          {/* ===== 梦境原文 ===== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Moon className="w-5 h-5" />
                梦境叙述
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {dream.content}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ===== 睡眠信息 ===== */}
          {(dream.sleep_quality || dream.sleep_depth) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Moon className="w-5 h-5" />
                  睡眠概况
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {sleepLabel && (
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <span className="text-3xl">{sleepLabel.emoji}</span>
                      <p className="text-sm font-medium mt-1">
                        {sleepLabel.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        睡眠质量
                      </p>
                    </div>
                  )}
                  {dream.sleep_depth && (
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <span className="text-3xl">
                        {["☁️", "🌙", "🌌"][dream.sleep_depth - 1]}
                      </span>
                      <p className="text-sm font-medium mt-1">
                        {["浅睡", "中等", "深睡"][dream.sleep_depth - 1]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        睡眠深度
                      </p>
                    </div>
                  )}
                  {dream.sleep_duration_minutes && (
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">
                        {(dream.sleep_duration_minutes / 60).toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        睡眠时长(小时)
                      </p>
                    </div>
                  )}
                  {dream.sleep_fragmented !== null && (
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <span className="text-3xl">
                        {dream.sleep_fragmented ? "💔" : "💚"}
                      </span>
                      <p className="text-sm font-medium mt-1">
                        {dream.sleep_fragmented ? "碎片化" : "连续"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        睡眠完整性
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== AI 深度解析 ===== */}
          {dream.ai_processed && dream.ai_analysis ? (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI 深度解析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 核心主题 */}
                {dream.ai_analysis.themes && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4" />
                      核心主题
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(dream.ai_analysis.themes as string[]).map(
                        (theme: string) => (
                          <Badge
                            key={theme}
                            variant="secondary"
                            className="text-sm px-3 py-1"
                          >
                            {theme}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* 原型 */}
                {dream.ai_analysis.archetypes && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4" />
                      原型与象征
                    </h4>
                    <div className="space-y-3">
                      {(
                        dream.ai_analysis.archetypes as Array<{
                          name: string;
                          description: string;
                        }>
                      ).map((a) => (
                        <div
                          key={a.name}
                          className="p-3 rounded-lg bg-muted/50"
                        >
                          <p className="font-medium text-sm">{a.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {a.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 洞见 */}
                {dream.ai_analysis.insights && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Brain className="w-4 h-4" />
                      潜意识洞见
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {dream.ai_analysis.insights as string}
                    </p>
                  </div>
                )}

                <Separator />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  重新生成分析
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-primary/30">
              <CardContent className="py-10 text-center">
                <Sparkles className="w-10 h-10 mx-auto text-primary/40 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {dream.ai_processing_status === "PROCESSING"
                    ? "AI 正在分析中..."
                    : "尚未进行 AI 分析"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {dream.ai_processing_status === "PROCESSING"
                    ? "请稍后刷新页面查看分析结果"
                    : "AI 将从心理学和认知科学角度解读你的梦境"}
                </p>
                {dream.ai_processing_status !== "PROCESSING" && (
                  <Button onClick={handleAnalyze} disabled={analyzing}>
                    {analyzing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    开始 AI 分析
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* ===== 现实关联 ===== */}
          {(dream.life_context || dream.user_interpretation) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  与现实的关联
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dream.life_context && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      前一天的背景
                    </p>
                    <p className="text-sm leading-relaxed">
                      {dream.life_context}
                    </p>
                  </div>
                )}
                {dream.reality_correlation && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      关联程度
                    </p>
                    <Badge variant="secondary">
                      {
                        ["🌀 几乎无关", "🤔 可能有关", "🔗 明显相关", "🎯 高度相关"][
                          dream.reality_correlation - 1
                        ]
                      }
                    </Badge>
                  </div>
                )}
                {dream.user_interpretation && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      个人理解
                    </p>
                    <p className="text-sm leading-relaxed italic text-muted-foreground">
                      &ldquo;{dream.user_interpretation}&rdquo;
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ===== 感官体验雷达 ===== */}
          {(dream.sensory_visual ||
            dream.sensory_auditory ||
            dream.sensory_tactile) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  感官体验
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    {
                      label: "视觉",
                      icon: "👁️",
                      value: dream.sensory_visual,
                    },
                    {
                      label: "听觉",
                      icon: "👂",
                      value: dream.sensory_auditory,
                    },
                    {
                      label: "触觉",
                      icon: "✋",
                      value: dream.sensory_tactile,
                    },
                    {
                      label: "嗅觉",
                      icon: "👃",
                      value: dream.sensory_olfactory,
                    },
                    {
                      label: "味觉",
                      icon: "👅",
                      value: dream.sensory_gustatory,
                    },
                    {
                      label: "空间感",
                      icon: "🌐",
                      value: dream.sensory_spatial,
                    },
                  ]
                    .filter((s) => s.value != null)
                    .map((s) => (
                      <div
                        key={s.label}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
                      >
                        <span className="text-lg">{s.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{s.label}</p>
                          <Progress
                            value={(s.value ?? 0) * 100}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// 加载骨架屏
function DetailSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-48 bg-gradient-to-br from-primary/10 to-transparent" />
      <div className="container max-w-4xl mx-auto px-4 -mt-24 pb-20">
        <Card className="shadow-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3 mt-2" />
            <div className="mt-6 p-5 rounded-xl bg-muted/20">
              <Skeleton className="h-16 w-full" />
            </div>
          </CardHeader>
        </Card>
        <div className="mt-8 space-y-6">
          <Card>
            <CardContent className="py-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6 mt-2" />
              <Skeleton className="h-4 w-4/6 mt-2" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

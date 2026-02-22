"use client";

import { DreamTagManager } from "@/components/dream/dream-tag-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import {
  DREAM_TYPE_ICON_MAP,
  DREAM_TYPE_LABEL_MAP,
  SLEEP_QUALITIES,
  VIVIDNESS_LEVELS,
} from "@/lib/constants";
import { DreamApi, type DreamDetail, type Tag } from "@/lib/dream-api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BedDouble,
  Calendar,
  Clock,
  CloudMoon,
  Coffee,
  Download,
  Edit,
  Eye,
  Globe,
  Heart,
  Images,
  Lightbulb,
  Loader2,
  Lock,
  Moon,
  RefreshCw,
  Sparkles,
  Star,
  Sunrise,
  Sunset,
  Tag as TagIcon,
  Target,
  Trash2,
  Users,
  Wand2,
  Waves,
  Zap,
  Link2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type SimilarDreamItem = {
  id: string;
  title: string | null;
  dream_date: string;
  content_preview: string;
};

type SleepAnalysis = {
  analysis_text?: string;
  suggestions?: string[];
};

type DreamAiAnalysis = {
  core_message?: string;
  key_symbols?: Array<{ symbol: string; meaning?: string; life_connection?: string }>;
  insights?: string;
  recommendations?: Array<{
    category?: string;
    title?: string;
    action?: string;
    why?: string;
  }>;
  emotional_summary?: string;
  emotion_interpretation?: string;
  reflection_questions?: string[];
  sleep_analysis?: SleepAnalysis;
};

type ContentStructured = {
  snapshot?: string;
  key_scenes?: string[];
  key_symbols?: string[];
  stress_signals?: string[];
  reflection_questions?: string[];
};

export default function DreamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dreamId = params.id as string;

  const [dream, setDream] = useState<DreamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [similarDreams, setSimilarDreams] = useState<SimilarDreamItem[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [answeringQuestion, setAnsweringQuestion] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reflectionTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const fetchDream = useCallback(async () => {
    try {
      const data = await DreamApi.get(dreamId);
      setDream(data);
      // 从数据库持久化字段恢复已生成图像状态
      if (data.ai_image_url) {
        setGeneratedImage(data.ai_image_url);
      }
      // 始终加载相似梦境（基于 embedding，不依赖 AI 分析）
      DreamApi.getSimilarDreams(dreamId).then(setSimilarDreams).catch(() => {});

      // 同一标签页内仅记录一次浏览，避免刷新/StrictMode 重复计数
      if (typeof window !== "undefined") {
        const viewSessionKey = `dream:viewed:${dreamId}`;
        const viewedInThisTab = sessionStorage.getItem(viewSessionKey) === "1";
        if (!viewedInThisTab) {
          sessionStorage.setItem(viewSessionKey, "1");
          DreamApi.incrementView(dreamId)
            .then((res) => {
              setDream((prev) =>
                prev && prev.id === dreamId
                  ? { ...prev, view_count: res.view_count }
                  : prev
              );
            })
            .catch(() => {
              // 失败时回滚标记，允许后续重试计数
              sessionStorage.removeItem(viewSessionKey);
            });
        }
      }
    } catch {
      toast.error("加载梦境失败");
      router.push("/dreams");
    } finally {
      setLoading(false);
    }
  }, [dreamId, router]);

  useEffect(() => {
    fetchDream();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [fetchDream]);

  // 确保进入编辑状态时，光标自动定位到文本末尾
  useEffect(() => {
    if (answeringQuestion && reflectionTextareaRef.current) {
      const len = reflectionTextareaRef.current.value.length;
      reflectionTextareaRef.current.setSelectionRange(len, len);
    }
  }, [answeringQuestion]);

  const handleAnalyze = async () => {
    if (!dream) return;
    setAnalyzing(true);
    try {
      await DreamApi.triggerAnalysis(dream.id);
      // 移除成功提示，静默触发分析

      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("未登录，无法接收实时通知");
        setAnalyzing(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const eventSource = new EventSource(
        `${apiUrl}/api/dreams/${dream.id}/analysis-stream?token=${encodeURIComponent(token)}`
      );
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("connected", () => {
        console.log("SSE 连接已建立");
      });

      eventSource.addEventListener("dream_analysis_status", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.dream_id === dream.id) {
            const status = data.status;
            if (status === "COMPLETED") {
              eventSource.close();
              eventSourceRef.current = null;
              setAnalyzing(false);
              if (data.similar_dreams?.length) {
                setSimilarDreams(data.similar_dreams);
              }
              fetchDream();
            } else if (status === "FAILED") {
              eventSource.close();
              eventSourceRef.current = null;
              setAnalyzing(false);
              toast.error(data.message || "AI 分析失败");
            }
            // 移除 PROCESSING 状态的提示
          }
        } catch (e) {
          console.error("处理 SSE 事件失败:", e);
        }
      });

      eventSource.onerror = (error) => {
        console.error("SSE 连接错误:", error);
        if (eventSource.readyState === EventSource.CLOSED) {
          eventSource.close();
          eventSourceRef.current = null;
          setAnalyzing(false);
          toast.error("连接中断，请刷新页面查看结果");
        }
      };

      setTimeout(() => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
          eventSourceRef.current = null;
          if (analyzing) {
            setAnalyzing(false);
            toast.info("分析可能仍在进行中，请稍后刷新查看");
          }
        }
      }, 120000);
    } catch {
      toast.error("触发分析失败");
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

  const handleGenerateImage = async () => {
    if (!dream) return;
    setGeneratingImage(true);
    try {
      const res = await DreamApi.generateImage(dream.id);
      setGeneratedImage(res.image_url);
      setDream((prev) => prev ? { ...prev, ai_image_url: res.image_url } : prev);
      toast.success("梦境图像生成成功");
    } catch {
      toast.error("图像生成失败，请稍后重试");
    } finally {
      setGeneratingImage(false);
    }
  };

  // 为标签生成独特的颜色（与可用标签列表保持一致）
  const getTagColor = (tagName: string, index: number) => {
    const colors = [
      "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
      "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
      "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400",
      "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
      "bg-pink-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400",
      "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400",
      "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400",
      "bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400",
      "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
      "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400",
      "bg-lime-500/10 border-lime-500/30 text-lime-600 dark:text-lime-400",
      "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-400",
    ];
    
    // 使用标签名哈希和索引，确保相邻标签颜色不同
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = (Math.abs(hash) + index * 3) % colors.length;
    return colors[colorIndex];
  };

  if (loading) return <DetailSkeleton />;
  if (!dream) return null;

  const sleepLabel = SLEEP_QUALITIES.find((q) => q.value === String(dream.sleep_quality));
  const vividLabel = VIVIDNESS_LEVELS.find((v) => v.value === String(dream.vividness_level));
  const aiAnalysis = (dream.ai_analysis ?? null) as DreamAiAnalysis | null;
  const imageAttachments = (dream.attachments ?? []).filter(
    (att) => att.attachment_type === "IMAGE" || att.attachment_type === "SKETCH"
  );

  return (
    <div className="min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="container max-w-4xl mx-auto px-4 py-8 pb-20"
      >
        {/* 返回按钮 */}
        <div className="mb-4">
          <Link href="/dreams">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-foreground hover:text-foreground dark:hover:text-foreground border-border/60 hover:border-primary/50 hover:bg-primary/10 hover:scale-105 hover:-translate-y-0.5 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              返回列表
            </Button>
          </Link>
        </div>

        {/* ===== 主内容卡片 ===== */}
        <Card className="shadow-lg border-border/60">
          <CardContent className="p-6 space-y-6">
            {/* 标题和操作区 */}
            <div className="flex items-start justify-between gap-4">
              {/* 标题 */}
              <h1 className="text-xl md:text-2xl font-bold flex-1">
                {dream.title || "无标题梦境"}
              </h1>
              
              {/* 右侧操作区 */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* 标签管理 */}
                <DreamTagManager
                  dreamId={dream.id}
                  currentTags={dream.tags}
                  onTagsChange={(tags: Tag[]) => setDream({ ...dream, tags })}
                />
                {/* 操作按钮 */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleFavorite}
                    title="收藏"
                    className="hover:bg-transparent transition-all duration-200 group"
                  >
                    <Star
                      className={cn(
                        "w-5 h-5 transition-all duration-200",
                        dream.is_favorite
                          ? "fill-amber-400 text-amber-400 stroke-amber-400"
                          : "text-muted-foreground group-hover:text-amber-400 group-hover:stroke-amber-400 group-hover:scale-110 group-hover:rotate-6"
                      )}
                      strokeWidth={2}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/dreams/${dream.id}/edit`)}
                    title="编辑"
                    className="hover:bg-transparent transition-all duration-200 group"
                  >
                    <Edit
                      className="w-5 h-5 transition-all duration-200 text-muted-foreground group-hover:text-blue-500 group-hover:stroke-blue-500 group-hover:scale-110"
                      strokeWidth={2}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    disabled={deleting}
                    title="删除"
                    className="hover:bg-transparent transition-all duration-200 group disabled:opacity-50"
                  >
                    <Trash2
                      className="w-5 h-5 transition-all duration-200 text-muted-foreground group-hover:text-destructive group-hover:stroke-destructive group-hover:scale-110"
                      strokeWidth={2}
                    />
                  </Button>
                </div>
              </div>
            </div>

            {/* 已添加的标签 - 显示在标题下方 */}
            {dream.tags && dream.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 -mt-2">
                {dream.tags.map((tag, index) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className={cn("gap-1", getTagColor(tag.name, index))}
                  >
                    <TagIcon className="w-3 h-3" />
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* 元信息 */}
            <div>
              
              {/* 基础信息：日期、时间、浏览、隐私等级 */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  {format(new Date(dream.dream_date), "yyyy年M月d日 EEEE", { locale: zhCN })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  {format(new Date(dream.created_at), "HH:mm")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-green-500" />
                  浏览 {dream.view_count}
                </span>
                {dream.privacy_level && (
                  <span className="flex items-center gap-1.5">
                    {dream.privacy_level === "PRIVATE" && (
                      <>
                        <Lock className="w-4 h-4 text-purple-500" />
                        <span className="text-muted-foreground">仅自己</span>
                      </>
                    )}
                    {dream.privacy_level === "FRIENDS" && (
                      <>
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-muted-foreground">好友可见</span>
                      </>
                    )}
                    {dream.privacy_level === "PUBLIC" && (
                      <>
                        <Globe className="w-4 h-4 text-cyan-500" />
                        <span className="text-muted-foreground">公开</span>
                      </>
                    )}
                  </span>
                )}
              </div>

              {/* 分组信息卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 情绪感受 */}
                {(dream.primary_emotion ||
                  dream.emotion_intensity ||
                  dream.emotion_residual) && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-1.5">
                      <Heart className="w-4 h-4" />
                      情绪感受
                    </h4>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {dream.primary_emotion && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          <span>主导情绪：{dream.primary_emotion}</span>
                        </div>
                      )}
                      {dream.emotion_intensity && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          <span>情绪强度：{["很弱", "轻微", "明显", "强烈", "非常强"][dream.emotion_intensity - 1]}</span>
                        </div>
                      )}
                      {dream.emotion_residual && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Badge variant="outline" className="gap-1 bg-primary/10 border-primary/30 text-primary font-normal text-xs h-5 px-2">
                            <Heart className="w-3 h-3" />
                            醒后仍有情绪残留
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 睡眠信息 */}
                {(dream.sleep_duration_minutes || dream.sleep_start_time || dream.awakening_time || 
                  sleepLabel || dream.sleep_depth || dream.awakening_state || dream.is_nap || dream.sleep_fragmented) && (
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                      <Moon className="w-4 h-4" />
                      睡眠信息
                    </h4>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {dream.sleep_duration_minutes && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>睡眠时长：{Math.floor(dream.sleep_duration_minutes / 60)}h
                          {dream.sleep_duration_minutes % 60 > 0 && `${dream.sleep_duration_minutes % 60}m`}</span>
                        </div>
                      )}
                      {(dream.sleep_start_time || dream.awakening_time) && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>
                            {dream.sleep_start_time && `${format(new Date(dream.sleep_start_time), "HH:mm")}`}
                            {dream.sleep_start_time && dream.awakening_time && " → "}
                            {dream.awakening_time && `${format(new Date(dream.awakening_time), "HH:mm")}`}
                          </span>
                        </div>
                      )}
                      {sleepLabel && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>睡眠感受：{sleepLabel.label}</span>
                        </div>
                      )}
                      {dream.sleep_depth && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>睡眠深度：{["浅睡", "中等", "深睡"][dream.sleep_depth - 1]}</span>
                        </div>
                      )}
                      {dream.awakening_state && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>醒来方式：{
                            dream.awakening_state === "NATURAL" ? "自然醒来" :
                            dream.awakening_state === "ALARM" ? "闹钟唤醒" :
                            dream.awakening_state === "STARTLED" ? "受惊醒来" :
                            dream.awakening_state === "GRADUAL" ? "逐渐清醒" :
                            dream.awakening_state
                          }</span>
                        </div>
                      )}
                      {(dream.is_nap || dream.sleep_fragmented) && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {dream.is_nap && (
                            <Badge variant="outline" className="gap-1 bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-normal text-xs h-5 px-2">
                              <Coffee className="w-3 h-3" />
                              午睡
                            </Badge>
                          )}
                          {dream.sleep_fragmented && (
                            <Badge variant="outline" className="gap-1 bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-normal text-xs h-5 px-2">
                              <Waves className="w-3 h-3" />
                              多次醒来
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 梦境特征 */}
                {(vividLabel || dream.completeness_score !== null || dream.dream_types.length > 0 || dream.lucidity_level) && (
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                    <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      梦境特征
                    </h4>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {vividLabel && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-500 mt-0.5">•</span>
                          <span>梦境清晰度：{vividLabel.label}</span>
                        </div>
                      )}
                      {dream.completeness_score !== null && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-500 mt-0.5">•</span>
                          <span>记忆完整度：{
                            dream.completeness_score <= 20 ? "碎片" :
                            dream.completeness_score <= 40 ? "片段" :
                            dream.completeness_score <= 60 ? "部分完整" :
                            dream.completeness_score <= 80 ? "基本完整" :
                            "完整叙事"
                          }</span>
                        </div>
                      )}
                      {dream.dream_types.length > 0 && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-500 mt-0.5">•</span>
                          <span>梦境类型：{dream.dream_types.map(t => DREAM_TYPE_LABEL_MAP[t] ?? t).join("、")}</span>
                        </div>
                      )}
                      {dream.lucidity_level && dream.lucidity_level >= 3 && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-500 mt-0.5">•</span>
                          <span>清醒梦 (清醒度 {dream.lucidity_level}/5)</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 与现实的关联 - 独占一行 */}
              {(dream.life_context || dream.user_interpretation || dream.reality_correlation) && (
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 mt-3">
                  <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    与现实的关联
                  </h4>
                  <div className="space-y-4">
                    {dream.life_context && (
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1 h-full bg-green-500/30 rounded-full mt-1"></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-sm text-muted-foreground">前一天的背景</p>
                            {dream.reality_correlation && (
                              <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 font-normal text-xs">
                                {["🌀 几乎无关", "🤔 可能有关", "🔗 明显相关", "🎯 高度相关"][
                                  dream.reality_correlation - 1
                                ]}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed text-muted-foreground border-l-2 border-green-500/20 pl-3">{dream.life_context}</p>
                        </div>
                      </div>
                    )}
                    {!dream.life_context && dream.reality_correlation && (
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1 h-full bg-green-500/30 rounded-full mt-1"></div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-1.5">关联程度</p>
                          <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 font-normal">
                            {["🌀 几乎无关", "🤔 可能有关", "🔗 明显相关", "🎯 高度相关"][
                              dream.reality_correlation - 1
                            ]}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {dream.user_interpretation && (
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1 h-full bg-green-500/30 rounded-full mt-1"></div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-1.5">个人理解</p>
                          <p className="text-sm leading-relaxed italic text-muted-foreground border-l-2 border-green-500/20 pl-3">
                            &ldquo;{dream.user_interpretation}&rdquo;
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* 梦境内容 */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-amber-500">
                <Sparkles className="w-4 h-4 text-amber-500" />
                梦境叙述
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {dream.content}
              </p>
            </div>

            {imageAttachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-purple-500">
                    <Images className="w-4 h-4 text-purple-500" />
                    梦境图片
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {imageAttachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.file_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="查看梦境附件图片"
                        title="查看梦境附件图片"
                        className="relative aspect-square rounded-lg overflow-hidden border border-border/60 hover:border-primary/50 transition-colors"
                      >
                        <Image
                          src={attachment.thumbnail_url || attachment.file_url}
                          alt="梦境附件图片"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* AI 梦境图像生成 */}
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-indigo-500">
                <Wand2 className="w-4 h-4 text-indigo-500" />
                AI 梦境图像
              </h3>

              {generatedImage ? (
                <div className="space-y-3">
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-indigo-200/50 dark:border-indigo-700/30 shadow-lg shadow-indigo-500/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={generatedImage}
                      alt="AI 生成的梦境图像"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateImage}
                      disabled={generatingImage}
                      className="gap-1.5 border-muted-foreground/40 dark:border-muted-foreground/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-500 dark:hover:text-white hover:border-indigo-500 hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                      {generatingImage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      重新生成
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-muted-foreground/40 dark:border-muted-foreground/60 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-105 active:scale-95 transition-all duration-200"
                      onClick={async () => {
                        if (!generatedImage) return;
                        try {
                          const resp = await fetch(generatedImage);
                          const blob = await resp.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = blobUrl;
                          a.download = `dream-${dream.id}-image.png`;
                          a.click();
                          URL.revokeObjectURL(blobUrl);
                        } catch {
                          toast.error("下载失败，请长按图片手动保存");
                        }
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      保存图像
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-border/40 bg-muted/20 gap-4">
                  <Wand2 className="w-12 h-12 text-indigo-500 dark:text-indigo-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground mb-1">让梦境跃然纸上</p>
                    <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                      使用 AI 将你的梦境文字转化为一幅栩栩如生的超现实主义梦境画作
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateImage}
                    disabled={generatingImage}
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold shadow-md hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-105 transition-all duration-300 border-0 gap-2"
                  >
                    {generatingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        生成中，请耐心等待...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        生成梦境图像
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ===== 相似梦境（不依赖 AI 分析，创建后即有） ===== */}
        {similarDreams.length > 0 && (
          <Card className="mt-6 border-rose-200/50 dark:border-rose-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                相似的梦境
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {similarDreams.map((sd) => (
                <Link
                  key={sd.id}
                  href={`/dreams/${sd.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/40 dark:border-border/20 hover:border-rose-300/60 dark:hover:border-rose-700/50 hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-all duration-200 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {sd.title || "无标题梦境"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(sd.dream_date), "yyyy年M月d日", { locale: zhCN })}
                    </p>
                    {sd.content_preview && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {sd.content_preview}
                      </p>
                    )}
                  </div>
                  <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-rose-500 rotate-180 flex-shrink-0 mt-0.5 transition-colors" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ===== AI 分析卡片 ===== */}
        <div className="mt-6">
          {dream.ai_processed && aiAnalysis ? (
            <Card className="border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2 text-lg">
                  <Sparkles className="w-6 h-6 text-primary" />
                  AI 深度解析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 0️⃣ 梦境概览：内容总结 */}
                {(() => {
                  const cs = dream.content_structured as ContentStructured | null | undefined;
                  const hasCs = cs && (cs.snapshot || (cs.key_scenes?.length) || (cs.key_symbols?.length) || (cs.stress_signals?.length) || (cs.reflection_questions?.length));
                  return hasCs ? (
                    <div className="relative p-5 rounded-xl bg-transparent dark:bg-transparent border border-purple-200/40 dark:border-purple-700/30 overflow-hidden">
                      <div className="flex items-start gap-3 mb-4">
                        <Sparkles className="w-5 h-5 text-purple-500 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-purple-700 dark:text-purple-400">梦境内容总结</h4>
                        </div>
                      </div>
                      <div className="pl-8 space-y-3">
                        {cs.snapshot && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{cs.snapshot}</p>
                        )}
                        {cs.key_scenes && cs.key_scenes.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-purple-600/90 dark:text-purple-300 mb-2">关键场景</p>
                            <div className="flex flex-wrap gap-1.5">
                              {cs.key_scenes.map((s, i) => (
                                <Badge key={i} variant="secondary" className="text-xs font-normal">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {cs.key_symbols && cs.key_symbols.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-purple-600/90 dark:text-purple-300 mb-2">象征元素</p>
                            <div className="flex flex-wrap gap-1.5">
                              {cs.key_symbols.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs font-normal">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {cs.stress_signals && cs.stress_signals.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-purple-600/90 dark:text-purple-300 mb-2">压力信号</p>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                              {cs.stress_signals.map((s, i) => (
                                <li key={i} className="leading-relaxed">{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {cs.reflection_questions && cs.reflection_questions.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-purple-600/90 dark:text-purple-300 mb-2">反思问题</p>
                            <ul className="text-sm text-muted-foreground space-y-1.5 list-none pl-0">
                              {cs.reflection_questions.map((q, i) => (
                                <li key={i} className="flex gap-1.5">
                                  <span className="text-purple-500 dark:text-purple-400 mt-0.5">·</span>
                                  <span className="leading-relaxed">{q}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* 1️⃣ 情感共鸣层：核心信息 */}
                {aiAnalysis.core_message && (
                  <div className="relative p-5 rounded-xl ai-analysis-card-amber dark:backdrop-blur-md border border-amber-300/60 dark:border-amber-700/30 overflow-hidden">
                    <div className="flex items-start gap-3 mb-4">
                      <Lightbulb className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-amber-700 dark:text-amber-400">梦境想告诉你什么</h4>
                      </div>
                    </div>
                    <div className="pl-8">
                      <p className="text-base text-muted-foreground font-medium leading-relaxed">
                        {aiAnalysis.core_message}
                      </p>
                    </div>
                  </div>
                )}

                {/* 1️⃣ 情感共鸣层：情绪分析 */}
                {(aiAnalysis.emotional_summary || aiAnalysis.emotion_interpretation) && (
                  <div className="relative p-5 rounded-xl ai-analysis-card-violet dark:backdrop-blur-md border border-violet-300/60 dark:border-violet-700/30 overflow-hidden">
                    <div className="flex items-start gap-3 mb-4">
                      <Heart className="w-5 h-5 text-violet-500 dark:text-violet-400 fill-violet-500/20 dark:fill-violet-400/20 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-violet-700 dark:text-violet-400">你的情绪体验</h4>
                      </div>
                    </div>
                    <div className="space-y-4 pl-8">
                      {aiAnalysis.emotional_summary && (
                        <div>
                          <p className="text-sm text-violet-600/90 dark:text-violet-300 mb-2">情绪特征</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{aiAnalysis.emotional_summary}</p>
                        </div>
                      )}
                      {aiAnalysis.emotion_interpretation && (
                        <div>
                          <p className="text-sm text-violet-600/90 dark:text-violet-300 mb-2">情绪解读</p>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                            {aiAnalysis.emotion_interpretation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2️⃣ 核心洞察层：潜意识洞见 */}
                {aiAnalysis.insights && (
                  <div className="relative p-5 rounded-xl bg-transparent dark:bg-transparent border border-cyan-200/40 dark:border-cyan-700/30 overflow-hidden">
                    <div className="flex items-start gap-3 mb-4">
                      <Sparkles className="w-5 h-5 text-cyan-500 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-cyan-700 dark:text-cyan-400">内心深处的想法</h4>
                      </div>
                    </div>
                    <div className="pl-8">
                      <p className="text-sm text-muted-foreground leading-6">
                        {aiAnalysis.insights}
                      </p>
                    </div>
                  </div>
                )}

                {/* 2️⃣ 核心洞察层：关键象征 */}
                {aiAnalysis.key_symbols && aiAnalysis.key_symbols.length > 0 && (
                  <div className="relative p-5 rounded-xl bg-transparent dark:bg-transparent border border-orange-200/40 dark:border-orange-700/30 overflow-hidden">
                    <div className="flex items-start gap-3 mb-4">
                      <Sparkles className="w-5 h-5 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-orange-700 dark:text-orange-400">梦境符号的含义</h4>
                      </div>
                    </div>
                    <div className="pl-8 space-y-3">
                      {aiAnalysis.key_symbols.map((s, idx) => (
                        <div key={`${s.symbol}-${idx}`} className="p-3 rounded-lg bg-transparent dark:bg-transparent border border-border/40 dark:border-border/20">
                          <p className="font-medium text-sm mb-2 text-foreground">{s.symbol}</p>
                          {s.meaning && (
                            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                              含义：{s.meaning}
                            </p>
                          )}
                          {s.life_connection && (
                            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                              生活关联：{s.life_connection}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3️⃣ 实用价值层：个性化建议 */}
                {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                  <div className="relative p-5 rounded-xl bg-transparent dark:bg-transparent border border-green-200/40 dark:border-green-700/30 overflow-hidden">
                    <div className="flex items-start gap-3 mb-4">
                      <Lightbulb className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-green-700 dark:text-green-400">给你的建议</h4>
                      </div>
                    </div>
                    <div className="pl-8 space-y-3">
                      {(aiAnalysis.recommendations as NonNullable<DreamAiAnalysis["recommendations"]>).map(
                        (rec, i) => {
                          return (
                            <div
                              key={i}
                              className="p-3 rounded-lg bg-transparent dark:bg-transparent border border-border/40 dark:border-border/20 space-y-2"
                            >
                              <p className="text-sm font-medium text-foreground">
                                {rec.title || "建议"}
                              </p>
                              {rec.action && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  行动：{rec.action}
                                </p>
                              )}
                              {rec.why && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  原因：{rec.why}
                                </p>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                {/* 3️⃣ 实用价值层：睡眠改善建议 */}
                {aiAnalysis.sleep_analysis && (aiAnalysis.sleep_analysis.analysis_text || (aiAnalysis.sleep_analysis.suggestions?.length ?? 0) > 0) && (
                  <div className="relative p-5 rounded-xl bg-transparent dark:bg-transparent border border-blue-200/40 dark:border-blue-700/30 overflow-hidden">
                    <div className="flex items-start gap-3 mb-4">
                      <Moon className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-blue-700 dark:text-blue-400">睡眠质量分析</h4>
                      </div>
                    </div>
                    <div className="pl-8 space-y-3">
                      {aiAnalysis.sleep_analysis.analysis_text && (
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{aiAnalysis.sleep_analysis.analysis_text}</p>
                      )}
                      {aiAnalysis.sleep_analysis.suggestions && aiAnalysis.sleep_analysis.suggestions.length > 0 && (
                        <div>
                          <p className="text-sm text-blue-600/90 dark:text-blue-300 mb-2">具体建议</p>
                          <ul className="space-y-1.5 list-disc list-inside text-sm text-muted-foreground">
                            {aiAnalysis.sleep_analysis.suggestions.map((s, i) => (
                              <li key={i} className="leading-relaxed">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4️⃣ 深度探索层：自我反思问题 */}
                {aiAnalysis.reflection_questions && aiAnalysis.reflection_questions.length > 0 && (
                  <div className="relative p-5 rounded-xl bg-transparent dark:bg-transparent border border-teal-200/40 dark:border-teal-700/30 overflow-hidden">
                    <div className="flex items-start gap-3 mb-4">
                      <Lightbulb className="w-5 h-5 text-teal-500 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-teal-700 dark:text-teal-400">思考这些问题</h4>
                      </div>
                    </div>
                    <div className="pl-8">
                      <ul className="space-y-4 text-sm">
                        {aiAnalysis.reflection_questions.map((q, idx) => {
                          const existingAnswer =
                            dream.reflection_answers?.find((item) => item.question === q)?.answer ??
                            "";
                          return (
                            <li key={idx} className="space-y-2.5">
                              <div className="flex items-start gap-2">
                                <span className="mt-[3px] text-teal-500 dark:text-teal-400 text-xs">•</span>
                                <span className="text-muted-foreground leading-relaxed">{q}</span>
                              </div>
                              <div className="pl-4">
                                {answeringQuestion === q ? (
                                  <div className="space-y-2">
                                    <div className="relative">
                                      <textarea
                                      ref={reflectionTextareaRef}
                                        className="w-full min-h-[80px] text-sm rounded-lg border border-teal-200 dark:border-teal-700/50 bg-transparent px-3 py-2 pb-6 focus:outline-none focus:ring-2 focus:ring-teal-500/50 placeholder:text-muted-foreground/70 resize-none"
                                        placeholder="写下你的想法..."
                                        value={answerText}
                                        onChange={(e) => setAnswerText(e.target.value)}
                                        maxLength={500}
                                        autoFocus
                                      />
                                      <div className="absolute bottom-2 right-3 text-xs text-muted-foreground/80">
                                        {answerText.length}/500
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        disabled={!answerText.trim() || !dream}
                                        onClick={async () => {
                                          if (!dream || !answerText.trim()) return;
                                          try {
                                            await DreamApi.addReflectionAnswer(dream.id, {
                                              question: q,
                                              answer: answerText.trim(),
                                            });
                                            setAnswerText("");
                                            setAnsweringQuestion(null);
                                            fetchDream();
                                            toast.success("已记录你的想法");
                                          } catch {
                                            toast.error("保存失败，请稍后重试");
                                          }
                                        }}
                                        className="bg-teal-500 hover:bg-teal-600 text-white transition-all duration-200 hover:scale-105"
                                      >
                                        保存
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setAnsweringQuestion(null);
                                          setAnswerText("");
                                        }}
                                        className="text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-105"
                                      >
                                        取消
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    className="w-full text-sm rounded-lg border border-border/40 dark:border-border/20 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 placeholder:text-muted-foreground/70 transition-all"
                                  placeholder={existingAnswer ? "" : "点击输入你的想法..."}
                                  value={existingAnswer}
                                  readOnly
                                    onFocus={() => {
                                      setAnsweringQuestion(q);
                                      setAnswerText(existingAnswer);
                                    }}
                                  />
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 5️⃣ 补充信息层：可能触发因素 */}
                {dream.triggers && dream.triggers.length > 0 && (
                  <div className="relative p-5 rounded-xl bg-transparent dark:bg-transparent border border-yellow-200/40 dark:border-yellow-700/30 overflow-hidden">
                    <div className="flex items-start gap-3 mb-4">
                      <Zap className="w-5 h-5 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-yellow-700 dark:text-yellow-400">可能的触发原因</h4>
                      </div>
                    </div>
                    <div className="pl-8 space-y-3">
                      {dream.triggers.map((t, i) => (
                        <div key={i} className="p-3 rounded-lg bg-transparent dark:bg-transparent border border-border/40 dark:border-border/20">
                          <p className="font-medium text-sm mb-1.5 text-foreground">{t.name}</p>
                          {t.reasoning && (
                            <p className="text-sm text-muted-foreground leading-relaxed">{t.reasoning}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <Button 
                    variant="default"
                    size="lg"
                    className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:from-primary/90 hover:via-purple-500/90 hover:to-pink-500/90 text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/25 hover:scale-105 transition-all duration-300 border-0 px-8" 
                    onClick={handleAnalyze} 
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        AI 分析中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                        重新生成分析
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-[1.5px] border-primary/60 dark:border-primary/50">
              <CardContent className="py-10 text-center">
                <div className="relative inline-block mb-4">
                  <Sparkles className="w-10 h-10 text-primary/70 dark:text-primary/80" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {dream.ai_processing_status === "PROCESSING" ? "AI 正在分析中..." : "探索梦境的深层含义"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {dream.ai_processing_status === "PROCESSING"
                    ? "AI 正在从心理学视角解读你的梦境，请稍候..."
                    : "让 AI 从心理学和认知科学角度，为你揭示梦境背后的潜意识信息"}
                </p>
                {dream.ai_processing_status !== "PROCESSING" && (
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={analyzing}
                    size="lg"
                    className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:from-primary/90 hover:via-purple-500/90 hover:to-pink-500/90 text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/25 hover:scale-105 transition-all duration-300 border-0 px-8"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        AI 分析中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                        开始解读梦境
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      {/* 返回顶部按钮 */}
      <ScrollToTop />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="container max-w-4xl mx-auto px-4 py-8 pb-20">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3 mt-2" />
            <Skeleton className="h-32 w-full mt-6" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

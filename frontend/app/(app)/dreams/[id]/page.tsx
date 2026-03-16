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
import { API_ORIGIN } from "@/lib/api";
import { DreamApi, type DreamDetail, type Tag } from "@/lib/dream-api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { enUS, ja, zhCN } from "date-fns/locale";
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
  Square,
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
import { useTranslation } from "react-i18next";
import { getEmotionLabel } from "@/lib/emotion-utils";

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
  const { t, i18n } = useTranslation();

  const [dream, setDream] = useState<DreamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeCanceling, setAnalyzeCanceling] = useState(false);
  const [similarDreams, setSimilarDreams] = useState<SimilarDreamItem[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [answeringQuestion, setAnsweringQuestion] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageCanceling, setImageCanceling] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const analyzeCancelingRef = useRef(false);
  const imageCancelingRef = useRef(false);
  const imageAbortRef = useRef<AbortController | null>(null);
  const reflectionTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const stopBtnClass =
    "bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white shadow-md shadow-rose-500/20 hover:shadow-lg hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-rose-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background";

  // 根据当前语言获取 date-fns locale
  const getDateLocale = () => {
    switch (i18n.language) {
      case "cn":
        return zhCN;
      case "ja":
        return ja;
      case "en":
        return enUS;
      default:
        return zhCN;
    }
  };

  // 根据语言获取日期格式
  const getDateFormat = () => {
    return i18n.language === "en" ? "MMM d, yyyy EEEE" : "yyyy年M月d日 EEEE";
  };

  // 翻译睡眠质量标签
  const getSleepQualityLabel = (value: string) => {
    const qualityMap: Record<string, string> = {
      "1": t("dreams.new.sleepQuality1"),
      "2": t("dreams.new.sleepQuality2"),
      "3": t("dreams.new.sleepQuality3"),
      "4": t("dreams.new.sleepQuality4"),
      "5": t("dreams.new.sleepQuality5"),
    };
    return qualityMap[value] || "";
  };

  // 翻译清晰度标签
  const getVividnessLabel = (value: string) => {
    const vividnessMap: Record<string, string> = {
      "1": t("dreams.new.vividness1"),
      "2": t("dreams.new.vividness2"),
      "3": t("dreams.new.vividness3"),
      "4": t("dreams.new.vividness4"),
      "5": t("dreams.new.vividness5"),
    };
    return vividnessMap[value] || "";
  };

  const fetchDream = useCallback(async () => {
    try {
      const data = await DreamApi.get(dreamId);
      setDream(data);
      if (data.ai_image_url) {
        setGeneratedImage(data.ai_image_url);
      }

      // 相似梦境和浏览记录均为非关键路径，延迟 300ms 执行，不阻塞主内容渲染
      setTimeout(() => {
        DreamApi.getSimilarDreams(dreamId).then(setSimilarDreams).catch(() => {});

        // 同一标签页内仅记录一次浏览，避免刷新重复计数
        if (typeof window !== "undefined") {
          const viewSessionKey = `dream:viewed:${dreamId}`;
          if (sessionStorage.getItem(viewSessionKey) !== "1") {
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
                sessionStorage.removeItem(viewSessionKey);
              });
          }
        }
      }, 300);
    } catch {
      toast.error(t("dreams.detail.loadFailed"));
      router.push("/dreams");
    } finally {
      setLoading(false);
    }
  }, [dreamId, router]);

  const cleanupConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchDream();
    return () => {
      cleanupConnection();
    };
  }, [fetchDream, cleanupConnection]);

  // 确保进入编辑状态时，光标自动定位到文本末尾
  useEffect(() => {
    if (answeringQuestion && reflectionTextareaRef.current) {
      const len = reflectionTextareaRef.current.value.length;
      reflectionTextareaRef.current.setSelectionRange(len, len);
    }
  }, [answeringQuestion]);

  const handleAnalyze = async (mode: "auto" | "manual" = "manual") => {
    if (!dream) return;
    if (mode === "manual") {
      setAnalyzing(true);
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      if (mode === "manual") {
        toast.error(t("dreams.detail.notLoggedIn"));
      }
      setAnalyzing(false);
      return;
    }

    const apiUrl = API_ORIGIN;

    const scheduleReconnect = () => {
      if (reconnectTimerRef.current || analyzeCancelingRef.current) return;
      if (reconnectAttemptsRef.current >= 3) {
        setAnalyzing(false);
        return;
      }
      const delay = 1500 * (reconnectAttemptsRef.current + 1);
      reconnectTimerRef.current = setTimeout(async () => {
        reconnectTimerRef.current = null;
        reconnectAttemptsRef.current += 1;
        const status = await DreamApi.getAnalysisStatus(dream.id).catch(() => null);
        if (!status) {
          scheduleReconnect();
          return;
        }
        if (status.ai_processing_status === "COMPLETED") {
          cleanupConnection();
          setAnalyzing(false);
          fetchDream();
          return;
        }
        if (status.ai_processing_status === "FAILED") {
          cleanupConnection();
          setAnalyzing(false);
          if (mode === "manual") {
            toast.error(t("dreams.detail.analysisFailed"));
          }
          return;
        }
        connectSse();
      }, delay);
    };

    const handleStatusEvent = (data: any) => {
      if (data.dream_id !== dream.id) return;
      const status = data.status;
      if (status === "COMPLETED") {
        cleanupConnection();
        reconnectAttemptsRef.current = 0;
        setAnalyzing(false);
        setAnalyzeCanceling(false);
        analyzeCancelingRef.current = false;
        if (data.similar_dreams?.length) {
          setSimilarDreams(data.similar_dreams);
        }
        fetchDream();
      } else if (status === "FAILED") {
        cleanupConnection();
        reconnectAttemptsRef.current = 0;
        setAnalyzing(false);
        setAnalyzeCanceling(false);
        analyzeCancelingRef.current = false;
        if (mode === "manual") {
          if (!data?.cancelled) {
            toast.error(data.message || t("dreams.detail.analysisFailed"));
          }
        }
      }
    };

    const connectSse = () => {
      cleanupConnection();
      const eventSource = new EventSource(
        `${apiUrl}/api/dreams/${dream.id}/analysis-stream?token=${encodeURIComponent(token)}`
      );
      eventSourceRef.current = eventSource;
      eventSource.addEventListener("connected", () => {
        reconnectAttemptsRef.current = 0;
      });
      eventSource.addEventListener("dream_analysis_status", (event: MessageEvent) => {
        try {
          handleStatusEvent(JSON.parse(event.data));
        } catch (e) {
          console.error("处理 SSE 事件失败:", e);
        }
      });
      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;
        scheduleReconnect();
      };
    };

    connectSse();

    try {
      await DreamApi.triggerAnalysis(dream.id);
      // 移除成功提示，静默触发分析
    } catch {
      cleanupConnection();
      if (mode === "manual") {
        toast.error(t("dreams.detail.triggerAnalysisFailed"));
      }
      setAnalyzing(false);
      return;
    }

    setTimeout(() => {
      if (eventSourceRef.current) {
        cleanupConnection();
        scheduleReconnect();
      }
    }, 120000);
  };

  const handleStopAnalyze = async () => {
    if (!dream) return;
    if (analyzeCancelingRef.current) return;
    analyzeCancelingRef.current = true;
    setAnalyzeCanceling(true);
    try {
      cleanupConnection();
      setAnalyzing(false);
      await DreamApi.cancelAnalysis(dream.id);
    } catch {
      // ignore cancel errors
    } finally {
      analyzeCancelingRef.current = false;
      setAnalyzeCanceling(false);
    }
  };

  const handleDelete = async () => {
    if (!dream) return;
    setDeleting(true);
    try {
      await DreamApi.delete(dream.id);
      toast.success(t("dreams.detail.deleteSuccess"));
      router.push("/dreams");
    } catch {
      toast.error(t("dreams.detail.deleteFailed"));
      setDeleting(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!dream) return;
    try {
      const res = await DreamApi.toggleFavorite(dream.id);
      setDream({ ...dream, is_favorite: res.is_favorite });
    } catch {
      toast.error(t("dreams.detail.operationFailed"));
    }
  };

  const handleGenerateImage = async () => {
    if (!dream) return;
    imageCancelingRef.current = false;
    setImageCanceling(false);
    setGeneratingImage(true);
    try {
      const controller = new AbortController();
      imageAbortRef.current = controller;
      const res = await DreamApi.generateImage(dream.id, { signal: controller.signal });
      setGeneratedImage(res.image_url);
      setDream((prev) => (prev ? { ...prev, ai_image_url: res.image_url } : prev));
      toast.success(t("dreams.detail.imageGenerateSuccess"));
    } catch (err) {
      // 兜底：若请求超时/网络抖动，但后端已完成生成，主动拉取最新详情避免误报失败
      const maybeAxios = err as any;
      if (imageCancelingRef.current) return;
      if (maybeAxios?.code === "ERR_CANCELED") return;
      if (maybeAxios?.response?.status === 409) return;
      try {
        const latest = await DreamApi.get(dream.id);
        if (latest.ai_image_url) {
          setDream(latest);
          setGeneratedImage(latest.ai_image_url);
          toast.success(t("dreams.detail.imageGenerateSuccess"));
          return;
        }
      } catch {
        // ignore fallback error
      }
      toast.error(t("dreams.detail.imageGenerateFailed"));
    } finally {
      setGeneratingImage(false);
      setImageCanceling(false);
      imageAbortRef.current = null;
    }
  };

  const handleStopGenerateImage = async () => {
    if (!dream) return;
    if (imageCancelingRef.current) return;
    imageCancelingRef.current = true;
    setImageCanceling(true);
    try {
      imageAbortRef.current?.abort();
      imageAbortRef.current = null;
      setGeneratingImage(false);
      await DreamApi.cancelGenerateImage(dream.id);
    } catch {
      // ignore cancel errors
    } finally {
      imageCancelingRef.current = false;
      setImageCanceling(false);
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
              {t("dreams.detail.backToList")}
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
                {dream.title || t("dreams.detail.noTitle")}
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
                    title={t("dreams.detail.favorite")}
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
                    title={t("dreams.detail.edit")}
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
                    title={t("dreams.detail.delete")}
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
                  {format(new Date(dream.dream_date), getDateFormat(), { locale: getDateLocale() })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  {format(new Date(dream.created_at), "HH:mm")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-green-500" />
                  {t("dreams.detail.views")} {dream.view_count}
                </span>
                {dream.privacy_level && (
                  <span className="flex items-center gap-1.5">
                    {dream.privacy_level === "PRIVATE" && (
                      <>
                        <Lock className="w-4 h-4 text-purple-500" />
                        <span className="text-muted-foreground">{t("dreams.detail.onlyMe")}</span>
                      </>
                    )}
                    {dream.privacy_level === "FRIENDS" && (
                      <>
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-muted-foreground">{t("dreams.detail.friendsOnly")}</span>
                      </>
                    )}
                    {dream.privacy_level === "PUBLIC" && (
                      <>
                        <Globe className="w-4 h-4 text-cyan-500" />
                        <span className="text-muted-foreground">{t("dreams.detail.public")}</span>
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
                      {t("dreams.detail.emotionSection")}
                    </h4>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {dream.primary_emotion && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{t("dreams.detail.primaryEmotion")}：{getEmotionLabel(dream.primary_emotion, t)}</span>
                        </div>
                      )}
                      {dream.emotion_intensity && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{t("dreams.detail.emotionIntensity")}：{t(`dreams.detail.emotion${["VeryWeak", "Mild", "Obvious", "Strong", "VeryStrong"][dream.emotion_intensity - 1]}`)}</span>
                        </div>
                      )}
                      {dream.emotion_residual && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Badge variant="outline" className="gap-1 bg-primary/10 border-primary/30 text-primary font-normal text-xs h-5 px-2">
                            <Heart className="w-3 h-3" />
                            {t("dreams.detail.emotionResidual")}
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
                      {t("dreams.detail.sleepSection")}
                    </h4>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {dream.sleep_duration_minutes && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{t("dreams.detail.sleepDuration")}：{Math.floor(dream.sleep_duration_minutes / 60)}h
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
                          <span>{t("dreams.detail.sleepFeeling")}：{getSleepQualityLabel(sleepLabel.value)}</span>
                        </div>
                      )}
                      {dream.sleep_depth && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{t("dreams.detail.sleepDepth")}：{t(`dreams.detail.sleep${["Shallow", "Medium", "Deep"][dream.sleep_depth - 1]}`)}</span>
                        </div>
                      )}
                      {dream.awakening_state && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{t("dreams.detail.awakeningMethod")}：{t(`dreams.detail.awakening${
                            dream.awakening_state === "NATURAL" ? "Natural" :
                            dream.awakening_state === "ALARM" ? "Alarm" :
                            dream.awakening_state === "STARTLED" ? "Startled" :
                            dream.awakening_state === "GRADUAL" ? "Gradual" :
                            "Natural"
                          }`)}</span>
                        </div>
                      )}
                      {(dream.is_nap || dream.sleep_fragmented) && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {dream.is_nap && (
                            <Badge variant="outline" className="gap-1 bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-normal text-xs h-5 px-2">
                              <Coffee className="w-3 h-3" />
                              {t("dreams.detail.nap")}
                            </Badge>
                          )}
                          {dream.sleep_fragmented && (
                            <Badge variant="outline" className="gap-1 bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-normal text-xs h-5 px-2">
                              <Waves className="w-3 h-3" />
                              {t("dreams.detail.multipleAwakenings")}
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
                      {t("dreams.detail.characteristicsSection")}
                    </h4>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {vividLabel && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-500 mt-0.5">•</span>
                          <span>{t("dreams.detail.dreamClarity")}：{getVividnessLabel(vividLabel.value)}</span>
                        </div>
                      )}
                      {dream.completeness_score !== null && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-500 mt-0.5">•</span>
                          <span>{t("dreams.detail.memoryCompleteness")}：{t(`dreams.detail.completeness${
                            dream.completeness_score <= 20 ? "Fragment" :
                            dream.completeness_score <= 40 ? "Segment" :
                            dream.completeness_score <= 60 ? "Partial" :
                            dream.completeness_score <= 80 ? "Basic" :
                            "Complete"
                          }`)}</span>
                        </div>
                      )}
                      {dream.dream_types.length > 0 && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-500 mt-0.5">•</span>
                          <span>{t("dreams.detail.dreamType")}：{dream.dream_types.map(dtype => t(`dreamTypes.${dtype}`) || DREAM_TYPE_LABEL_MAP[dtype] || dtype).join("、")}</span>
                        </div>
                      )}
                      {dream.lucidity_level && dream.lucidity_level >= 3 && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-purple-500 mt-0.5">•</span>
                          <span>{t("dreams.detail.lucidDream")} ({t("dreams.detail.lucidity")} {dream.lucidity_level}/5)</span>
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
                    {t("dreams.detail.realityConnectionSection")}
                  </h4>
                  <div className="space-y-4">
                    {dream.life_context && (
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1 h-full bg-green-500/30 rounded-full mt-1"></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-sm text-muted-foreground">{t("dreams.detail.previousDayContext")}</p>
                            {dream.reality_correlation && (
                              <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 font-normal text-xs">
                                {t(`dreams.detail.correlation${["AlmostNone", "Possible", "Obvious", "High"][dream.reality_correlation - 1]}`)}
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
                          <p className="text-sm text-muted-foreground mb-1.5">{t("dreams.detail.correlationLevel")}</p>
                          <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 font-normal">
                            {t(`dreams.detail.correlation${["AlmostNone", "Possible", "Obvious", "High"][dream.reality_correlation - 1]}`)}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {dream.user_interpretation && (
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-1 h-full bg-green-500/30 rounded-full mt-1"></div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-1.5">{t("dreams.detail.personalUnderstanding")}</p>
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
                {t("dreams.detail.dreamNarration")}
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
                    {t("dreams.detail.dreamImages")}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {imageAttachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.file_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t("dreams.detail.viewAttachment")}
                        title={t("dreams.detail.viewAttachment")}
                        className="relative aspect-square rounded-lg overflow-hidden border border-border/60 hover:border-primary/50 transition-colors"
                      >
                        <Image
                          src={attachment.thumbnail_url || attachment.file_url}
                          alt={t("dreams.detail.viewAttachment")}
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
                {t("dreams.detail.aiDreamImage")}
              </h3>

              {generatedImage ? (
                <div className="space-y-3">
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-indigo-200/50 dark:border-indigo-700/30 shadow-lg shadow-indigo-500/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={generatedImage}
                      alt={t("dreams.detail.aiGeneratedImage")}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generatingImage ? handleStopGenerateImage : handleGenerateImage}
                      disabled={imageCanceling}
                      className={cn(
                        "gap-1.5 border-muted-foreground/40 dark:border-muted-foreground/60 hover:scale-105 active:scale-95 transition-all duration-200",
                        generatingImage
                          ? stopBtnClass
                          : "text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-500 dark:hover:text-white hover:border-indigo-500"
                      )}
                    >
                      {generatingImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {t("common.cancel")}
                          <Square className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          {t("dreams.detail.regenerateImage")}
                        </>
                      )}
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
                          toast.error(t("dreams.detail.downloadFailed"));
                        }
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t("dreams.detail.saveImage")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-border/40 bg-muted/20 gap-4">
                  <Wand2 className="w-12 h-12 text-indigo-500 dark:text-indigo-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground mb-1">{t("dreams.detail.aiImageTitle")}</p>
                    <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                      {t("dreams.detail.aiImageDescription")}
                    </p>
                  </div>
                  <Button
                    onClick={generatingImage ? handleStopGenerateImage : handleGenerateImage}
                    disabled={imageCanceling}
                    className={cn(
                      "text-white font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 border-0 gap-2",
                      generatingImage
                        ? cn("from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600", "bg-gradient-to-r")
                        : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 hover:shadow-indigo-500/25"
                    )}
                  >
                    {generatingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("dreams.detail.generatingPleaseWait")}
                        <span className="mx-1 opacity-70">•</span>
                        {t("common.cancel")}
                        <Square className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        {t("dreams.detail.generateImageButton")}
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
                {t("dreams.detail.similarDreamsTitle")}
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
                      {sd.title || t("dreams.detail.noTitle")}
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
                  {t("dreams.detail.aiAnalysisTitle")}
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
                          <h4 className="text-base font-bold text-purple-700 dark:text-purple-400">{t("dreams.detail.contentSummary")}</h4>
                        </div>
                      </div>
                      <div className="pl-8 space-y-3">
                        {cs.snapshot && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{cs.snapshot}</p>
                        )}
                        {cs.key_scenes && cs.key_scenes.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-purple-600/90 dark:text-purple-300 mb-2">{t("dreams.detail.keyScenes")}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {cs.key_scenes.map((s, i) => (
                                <Badge key={i} variant="secondary" className="text-xs font-normal">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {cs.key_symbols && cs.key_symbols.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-purple-600/90 dark:text-purple-300 mb-2">{t("dreams.detail.symbolicElements")}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {cs.key_symbols.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs font-normal">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {cs.stress_signals && cs.stress_signals.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-purple-600/90 dark:text-purple-300 mb-2">{t("dreams.detail.stressSignals")}</p>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                              {cs.stress_signals.map((s, i) => (
                                <li key={i} className="leading-relaxed">{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {cs.reflection_questions && cs.reflection_questions.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-purple-600/90 dark:text-purple-300 mb-2">{t("dreams.detail.reflectionQuestions")}</p>
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
                        <h4 className="text-base font-bold text-amber-700 dark:text-amber-400">{t("dreams.detail.dreamMessage")}</h4>
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
                        <h4 className="text-base font-bold text-violet-700 dark:text-violet-400">{t("dreams.detail.emotionalExperience")}</h4>
                      </div>
                    </div>
                    <div className="space-y-4 pl-8">
                      {aiAnalysis.emotional_summary && (
                        <div>
                          <p className="text-sm text-violet-600/90 dark:text-violet-300 mb-2">{t("dreams.detail.emotionalCharacteristics")}</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{aiAnalysis.emotional_summary}</p>
                        </div>
                      )}
                      {aiAnalysis.emotion_interpretation && (
                        <div>
                          <p className="text-sm text-violet-600/90 dark:text-violet-300 mb-2">{t("dreams.detail.emotionInterpretation")}</p>
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
                        <h4 className="text-base font-bold text-cyan-700 dark:text-cyan-400">{t("dreams.detail.deepThoughts")}</h4>
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
                        <h4 className="text-base font-bold text-orange-700 dark:text-orange-400">{t("dreams.detail.symbolMeanings")}</h4>
                      </div>
                    </div>
                    <div className="pl-8 space-y-3">
                      {aiAnalysis.key_symbols.map((s, idx) => (
                        <div key={`${s.symbol}-${idx}`} className="p-3 rounded-lg bg-transparent dark:bg-transparent border border-border/40 dark:border-border/20">
                          <p className="font-medium text-sm mb-2 text-foreground">{s.symbol}</p>
                          {s.meaning && (
                            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                              {t("dreams.detail.meaning")}：{s.meaning}
                            </p>
                          )}
                          {s.life_connection && (
                            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                              {t("dreams.detail.lifeConnection")}：{s.life_connection}
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
                        <h4 className="text-base font-bold text-green-700 dark:text-green-400">{t("dreams.detail.recommendationsTitle")}</h4>
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
                                {rec.title || t("dreams.detail.recommendations")}
                              </p>
                              {rec.action && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {t("dreams.detail.action")}：{rec.action}
                                </p>
                              )}
                              {rec.why && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {t("dreams.detail.why")}：{rec.why}
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
                        <h4 className="text-base font-bold text-blue-700 dark:text-blue-400">{t("dreams.detail.sleepAnalysis")}</h4>
                      </div>
                    </div>
                    <div className="pl-8 space-y-3">
                      {aiAnalysis.sleep_analysis.analysis_text && (
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{aiAnalysis.sleep_analysis.analysis_text}</p>
                      )}
                      {aiAnalysis.sleep_analysis.suggestions && aiAnalysis.sleep_analysis.suggestions.length > 0 && (
                        <div>
                          <p className="text-sm text-blue-600/90 dark:text-blue-300 mb-2">{t("dreams.detail.specificSuggestions")}</p>
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
                        <h4 className="text-base font-bold text-teal-700 dark:text-teal-400">{t("dreams.detail.reflectOnQuestions")}</h4>
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
                                        placeholder={t("dreams.detail.writeYourThoughts")}
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
                                            toast.success(t("dreams.detail.thoughtSaved"));
                                          } catch {
                                            toast.error(t("dreams.detail.saveFailed"));
                                          }
                                        }}
                                        className="bg-teal-500 hover:bg-teal-600 text-white transition-all duration-200 hover:scale-105"
                                      >
                                        {t("common.save")}
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
                                        {t("common.cancel")}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    className="w-full text-sm rounded-lg border border-border/40 dark:border-border/20 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 placeholder:text-muted-foreground/70 transition-all"
                                  placeholder={existingAnswer ? "" : t("dreams.detail.clickToEnterThoughts")}
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
                        <h4 className="text-base font-bold text-yellow-700 dark:text-yellow-400">{t("dreams.detail.possibleTriggers")}</h4>
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="lg"
                      className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:from-primary/90 hover:via-purple-500/90 hover:to-pink-500/90 text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/25 hover:scale-105 transition-all duration-300 border-0 px-8"
                      onClick={analyzing ? handleStopAnalyze : () => handleAnalyze("manual")}
                      disabled={analyzeCanceling}
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          {t("dreams.detail.analyzing")}
                          <span className="mx-2 opacity-70">•</span>
                          {t("common.cancel")}
                          <Square className="w-5 h-5 ml-2" />
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                          {t("dreams.detail.regenerateAnalysis")}
                        </>
                      )}
                    </Button>
                  </div>
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
                  {dream.ai_processing_status === "PROCESSING"
                    ? t("dreams.detail.aiProcessingTitle")
                    : t("dreams.detail.aiCallToActionTitle")}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {dream.ai_processing_status === "PROCESSING"
                    ? t("dreams.detail.aiProcessingDescription")
                    : t("dreams.detail.aiCallToActionDescription")}
                </p>
                {dream.ai_processing_status !== "PROCESSING" && (
                  <div className="flex items-center justify-center gap-2">
                  <Button 
                      onClick={analyzing ? handleStopAnalyze : () => handleAnalyze("manual")} 
                      disabled={analyzeCanceling}
                      size="lg"
                      className={cn(
                        "text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border-0 px-8",
                        analyzing
                          ? "bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600"
                          : "bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:from-primary/90 hover:via-purple-500/90 hover:to-pink-500/90 hover:shadow-primary/25"
                      )}
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          {t("dreams.detail.analyzing")}
                          <span className="mx-2 opacity-70">•</span>
                          {t("common.cancel")}
                          <Square className="w-5 h-5 ml-2" />
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                          {t("dreams.detail.startAnalysis")}
                        </>
                      )}
                    </Button>
                  </div>
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

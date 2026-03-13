"use client";

import { DrawingBoard } from "@/components/dream/drawing-board";
import type { UploadedFile } from "@/components/dream/image-upload";
import { VoiceRecorder } from "@/components/dream/voice-recorder";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DREAM_TYPES,
  EMOTION_CATEGORIES,
  EMOTION_COLOR_MAP,
  EMOTION_INTENSITIES,
  LUCIDITY_LEVELS,
  REALITY_CORRELATIONS,
  SLEEP_DEPTHS,
  SLEEP_QUALITIES,
  AWAKENING_STATES,
  VIVIDNESS_LEVELS,
  COMPLETENESS_LEVELS,
} from "@/lib/constants";
import { DreamApi, type CreateDreamPayload, type DreamDetail } from "@/lib/dream-api";
import { communityAPI, type CommunityResponse } from "@/lib/community-api";
import { getEmotionLabel } from "@/lib/emotion-utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  ChevronDown,
  Clock,
  Eye,
  Flame,
  Heart,
  ImagePlus,
  Info,
  Link2,
  Loader2,
  MessageCircle,
  Moon,
  Palette,
  PenTool,
  RotateCw,
  Save,
  Sparkle,
  Sparkles,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type DreamEditorProps = {
  mode?: "create" | "edit";
  initialDream?: DreamDetail | null;
};

export function DreamEditor({ mode = "create", initialDream }: DreamEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(300);
  const [lifeContextHeight, setLifeContextHeight] = useState(80);
  const [userInterpretationHeight, setUserInterpretationHeight] = useState(80);
  const [drawingBoardOpen, setDrawingBoardOpen] = useState(false);
  const [emotionCardOpen, setEmotionCardOpen] = useState(false);
  const [sleepCardOpen, setSleepCardOpen] = useState(false);
  const [featuresCardOpen, setFeaturesCardOpen] = useState(false);
  const [realityCardOpen, setRealityCardOpen] = useState(false);

  useEffect(() => {
    if (contentAreaRef.current) {
      contentAreaRef.current.style.height = `${textareaHeight}px`;
    }
  }, [textareaHeight]);

  useEffect(() => {
    if (lifeContextAreaRef.current) {
      lifeContextAreaRef.current.style.height = `${lifeContextHeight}px`;
    }
  }, [lifeContextHeight]);

  useEffect(() => {
    if (userInterpretationAreaRef.current) {
      userInterpretationAreaRef.current.style.height = `${userInterpretationHeight}px`;
    }
  }, [userInterpretationHeight]);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const lifeContextAreaRef = useRef<HTMLTextAreaElement>(null);
  const userInterpretationAreaRef = useRef<HTMLTextAreaElement>(null);

  // 核心表单状态
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dreamDate, setDreamDate] = useState<Date>(new Date());
  const [dreamTime, setDreamTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  });
  const [isNap, setIsNap] = useState(false);

  // 动态更新当前时间（仅在创建模式下）
  useEffect(() => {
    if (mode !== "create") return;
    const updateTime = () => {
      const now = new Date();
      setDreamTime(
        `${String(now.getHours()).padStart(2, "0")}:${String(
          now.getMinutes()
        ).padStart(2, "0")}`
      );
    };

    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [mode]);

  // 情绪
  const [primaryEmotion, setPrimaryEmotion] = useState("");
  const [emotionIntensity, setEmotionIntensity] = useState("");
  const [emotionResidual, setEmotionResidual] = useState(false);

  // 睡眠
  const [sleepStartTime, setSleepStartTime] = useState("");
  const [awakeningTime, setAwakeningTime] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");
  const [sleepDepth, setSleepDepth] = useState("");
  const [sleepFragmented, setSleepFragmented] = useState(false);
  const [sleepHours, setSleepHours] = useState("");
  const [sleepMinutes, setSleepMinutes] = useState("");
  const [awakeningState, setAwakeningState] = useState("");

  // 梦境特征
  const [dreamTypes, setDreamTypes] = useState<string[]>([]);
  const [lucidityLevel, setLucidityLevel] = useState("");
  const [vividness, setVividness] = useState("");
  const [completenessScore, setCompletenessScore] = useState("");

  // 现实关联
  const [lifeContext, setLifeContext] = useState("");
  const [realityCorrelation, setRealityCorrelation] = useState("");
  const [userInterpretation, setUserInterpretation] = useState("");

  // 隐私与标题元信息
  const [privacyLevel, setPrivacyLevel] = useState<"PRIVATE" | "FRIENDS" | "PUBLIC">(
    "PRIVATE"
  );
  const [titleGeneratedByAI, setTitleGeneratedByAI] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSeekingInterpretation, setIsSeekingInterpretation] = useState(false);
  const [joinedCommunities, setJoinedCommunities] = useState<CommunityResponse[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [shareToCommunityEnabled, setShareToCommunityEnabled] = useState(false);

  // 从 URL 预填（仅创建模式）：?seek=1&privacy=PUBLIC
  useEffect(() => {
    if (mode !== "create") return;

    const seek = searchParams.get("seek");
    const privacy = searchParams.get("privacy");
    const communityId = searchParams.get("communityId");
    const share = searchParams.get("share");

    if (seek === "1" || seek === "true") {
      setIsSeekingInterpretation(true);
    }

    if (privacy === "PUBLIC") {
      setPrivacyLevel("PUBLIC");
    }

    if (communityId) {
      setSelectedCommunityId(communityId);
      setShareToCommunityEnabled(share === "1" || share === "true" || privacy === "PUBLIC");
      setPrivacyLevel("PUBLIC");
    }
  }, [mode, searchParams]);

  useEffect(() => {
    communityAPI
      .getCommunities()
      .then((res) => {
        const memberCommunities = res.items.filter((c) => c.is_member);
        setJoinedCommunities(memberCommunities);

        if (mode === "create") {
          const communityId = searchParams.get("communityId");
          if (communityId && memberCommunities.some((c) => c.id === communityId)) {
            setSelectedCommunityId(communityId);
          }
        }
      })
      .catch(() => {
        // 非阻塞能力：加载失败不影响记录梦境
      });
  }, [mode, searchParams]);

  // 附件
  const [imageFiles, setImageFiles] = useState<UploadedFile[]>([]);
  /** 编辑时用户取消的已有图片附件 ID，保存时从 OSS 删除并移除记录 */
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);

  // 切换编辑的梦境时清空「已取消」列表
  useEffect(() => {
    if (mode === "edit" && initialDream?.id) {
      setRemovedAttachmentIds([]);
    }
  }, [mode, initialDream?.id]);

  /** 编辑时保留的已有图片数（未点取消的），创建时为 0 */
  const existingImageCount =
    mode === "edit" && initialDream?.attachments
      ? initialDream.attachments.filter(
          (att) =>
            (att.attachment_type === "IMAGE" ||
              att.mime_type?.startsWith("image/")) &&
            !removedAttachmentIds.includes(att.id)
        ).length
      : 0;
  const totalImageCount = existingImageCount + imageFiles.length;

  const toggleDreamType = useCallback((type: string) => {
    setDreamTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  // 处理画板保存
  const handleDrawingSave = useCallback(
    (blob: Blob) => {
      if (totalImageCount >= 8) {
        toast.error(t("dreams.new.toast.imageLimit"));
        return;
      }

      const file = new File([blob], `drawing_${Date.now()}.png`, {
        type: "image/png",
      });
      const newFile: UploadedFile = {
        id: `drawing_${Date.now()}_${Math.random()}`,
        file,
        preview: URL.createObjectURL(blob),
      };
      setImageFiles((prev) => [...prev, newFile]);
      toast.success(t("dreams.new.toast.drawingAdded"));
    },
    [totalImageCount]
  );

  // 处理拖曳调整高度
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = textareaHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(300, startHeight + delta);
      setTextareaHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [textareaHeight]);

  // 处理前一天发生了什么的拖曳
  const handleLifeContextMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = lifeContextHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(80, startHeight + delta);
      setLifeContextHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [lifeContextHeight]);

  // 处理你自己的理解的拖曳
  const handleUserInterpretationMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = userInterpretationHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(80, startHeight + delta);
      setUserInterpretationHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [userInterpretationHeight]);

  // 如果是编辑模式，在初次收到 initialDream 时填充表单
  useEffect(() => {
    if (mode !== "edit" || !initialDream) return;

    setTitle(initialDream.title || "");
    setContent(initialDream.content || "");
    setDreamDate(new Date(initialDream.dream_date));

    if (initialDream.dream_time) {
      setDreamTime(initialDream.dream_time.slice(0, 5));
    }

    setIsNap(initialDream.is_nap);

    // 睡眠
    setSleepStartTime(initialDream.sleep_start_time || "");
    setAwakeningTime(initialDream.awakening_time || "");
    setSleepQuality(initialDream.sleep_quality ? String(initialDream.sleep_quality) : "");
    setSleepDepth(initialDream.sleep_depth ? String(initialDream.sleep_depth) : "");
    setSleepFragmented(initialDream.sleep_fragmented ?? false);
    if (initialDream.sleep_duration_minutes != null) {
      const total = initialDream.sleep_duration_minutes;
      setSleepHours(String(Math.floor(total / 60)));
      setSleepMinutes(String(total % 60));
    }
    setAwakeningState(initialDream.awakening_state || "");

    // 情绪
    setPrimaryEmotion(initialDream.primary_emotion || "");
    setEmotionIntensity(
      initialDream.emotion_intensity != null ? String(initialDream.emotion_intensity) : ""
    );
    setEmotionResidual(initialDream.emotion_residual ?? false);

    // 特征
    setDreamTypes(initialDream.dream_types || []);
    setLucidityLevel(
      initialDream.lucidity_level != null ? String(initialDream.lucidity_level) : ""
    );
    setVividness(
      initialDream.vividness_level != null ? String(initialDream.vividness_level) : ""
    );
    setCompletenessScore(
      initialDream.completeness_score != null ? String(initialDream.completeness_score) : ""
    );

    // 现实关联
    setLifeContext(initialDream.life_context || "");
    setRealityCorrelation(
      initialDream.reality_correlation != null ? String(initialDream.reality_correlation) : ""
    );
    setUserInterpretation(initialDream.user_interpretation || "");
    // 元信息
    setPrivacyLevel(
      (initialDream.privacy_level as "PRIVATE" | "FRIENDS" | "PUBLIC") ?? "PRIVATE"
    );
    setTitleGeneratedByAI(initialDream.title_generated_by_ai ?? false);
    setIsAnonymous((initialDream as any).is_anonymous ?? false);
    setIsSeekingInterpretation((initialDream as any).is_seeking_interpretation ?? false);
    setSelectedCommunityId((initialDream as any).community_id ?? "");
    setShareToCommunityEnabled(!!(initialDream as any).community_id);
  }, [mode, initialDream]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error(t("dreams.new.toast.contentRequired"));
      return;
    }

    if (privacyLevel === "PUBLIC" && shareToCommunityEnabled && !selectedCommunityId) {
      toast.error(t("dreams.new.toast.communityRequired"));
      return;
    }

    setSubmitting(true);
    try {
      // 计算睡眠时长
      const hasSleepHours = sleepHours.trim() !== "";
      const hasSleepMinutes = sleepMinutes.trim() !== "";
      const hours = hasSleepHours ? (parseInt(sleepHours, 10) || 0) : 0;
      const mins = hasSleepMinutes ? (parseInt(sleepMinutes, 10) || 0) : 0;
      const sleepDuration = hasSleepHours || hasSleepMinutes ? hours * 60 + mins : undefined;

      // 将 time input(HH:mm) 与梦境日期合并，避免 new Date("HH:mm") 的无效时间错误
      const formatTimeWithDreamDate = (timeValue: string) => {
        if (!timeValue) return undefined;
        const [hoursStr, minutesStr] = timeValue.split(":");
        const hours = Number(hoursStr);
        const minutes = Number(minutesStr);

        if (
          !Number.isInteger(hours) ||
          !Number.isInteger(minutes) ||
          hours < 0 ||
          hours > 23 ||
          minutes < 0 ||
          minutes > 59
        ) {
          return undefined;
        }

        const combined = new Date(dreamDate);
        combined.setHours(hours, minutes, 0, 0);
        return combined.toISOString();
      };

      const payload: CreateDreamPayload = {
        dream_date: format(dreamDate, "yyyy-MM-dd"),
        dream_time: dreamTime || undefined,
        content: content.trim(),
        title: title.trim() || undefined,
        is_nap: isNap || undefined,
        sleep_start_time: formatTimeWithDreamDate(sleepStartTime),
        awakening_time: formatTimeWithDreamDate(awakeningTime),
        primary_emotion: primaryEmotion || undefined,
        emotion_intensity: emotionIntensity ? parseInt(emotionIntensity) : undefined,
        emotion_residual: emotionResidual || undefined,
        sleep_quality: sleepQuality ? parseInt(sleepQuality) : undefined,
        sleep_depth: sleepDepth ? parseInt(sleepDepth) : undefined,
        sleep_fragmented: sleepFragmented || undefined,
        sleep_duration_minutes: sleepDuration,
        awakening_state: awakeningState || undefined,
        dream_types: dreamTypes.length > 0 ? dreamTypes : undefined,
        lucidity_level: lucidityLevel ? parseInt(lucidityLevel) : undefined,
        vividness_level: vividness ? parseInt(vividness) : undefined,
        completeness_score: completenessScore ? parseInt(completenessScore) : undefined,
        life_context: lifeContext.trim() || undefined,
        reality_correlation: realityCorrelation
          ? parseInt(realityCorrelation)
          : undefined,
        user_interpretation: userInterpretation.trim() || undefined,
        privacy_level: privacyLevel,
        title_generated_by_ai: titleGeneratedByAI,
        is_anonymous: isAnonymous || undefined,
        is_seeking_interpretation: isSeekingInterpretation || undefined,
        community_id:
          shareToCommunityEnabled && selectedCommunityId
            ? selectedCommunityId
            : undefined,
      };

      const dream =
        mode === "edit" && initialDream
          ? await DreamApi.update(initialDream.id, payload)
          : await DreamApi.create(payload);

      // 编辑时：先删除用户取消的已有图片（从 OSS 与 DB 移除）
      if (mode === "edit" && initialDream && removedAttachmentIds.length > 0) {
        for (const attId of removedAttachmentIds) {
          try {
            await DreamApi.deleteAttachment(dream.id, attId);
          } catch {
            console.warn("删除已有附件失败:", attId);
          }
        }
      }

      // 上传本次新增的附件图片 (best effort)
      if (imageFiles.length > 0) {
        for (const img of imageFiles) {
          try {
            const presign = await DreamApi.getAttachmentUploadUrl(
              dream.id,
              img.file.name,
              img.file.type
            );
            await DreamApi.uploadToOSS(presign.upload_url, img.file, img.file.type);
            await DreamApi.createAttachment(dream.id, {
              file_url: presign.access_url,
              attachment_type: "IMAGE",
              file_size: img.file.size,
              mime_type: img.file.type,
            });
          } catch {
            // 附件上传失败不影响主流程
            console.warn("附件上传失败:", img.file.name);
          }
        }
      }

      toast.success(
        mode === "edit" ? t("dreams.new.toast.updated") : t("dreams.new.toast.created")
      );

      // 强依赖后端返回的 dream.id，若缺失则直接提示错误
      if (!dream?.id) {
        toast.error(t("dreams.new.toast.missingDreamId"));
        return;
      }

      router.push(`/dreams/${dream.id}`);
    } catch (err: any) {
      const rawDetail = err?.response?.data?.detail;
      let message: string;

      if (typeof rawDetail === "string") {
        message = rawDetail;
      } else if (Array.isArray(rawDetail)) {
        // Pydantic 校验错误数组
        const msgs = rawDetail
          .map((e: any) => e?.msg || e?.type || "")
          .filter(Boolean)
          .join("；");
        message = msgs || t("dreams.new.toast.saveFormInvalid");
      } else if (rawDetail && typeof rawDetail === "object") {
        message = JSON.stringify(rawDetail);
      } else if (err?.message) {
        message = err.message;
      } else {
        message = t("dreams.new.toast.saveFailed");
      }

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 主内容区 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl mx-auto px-4 py-8 space-y-3"
      >
        {/* 顶部标题区 */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dreams">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-lg border-border/60 hover:border-primary/50 hover:bg-primary/10 hover:scale-105 hover:-translate-y-0.5 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 text-foreground hover:text-primary transition-colors" />
            </Button>
          </Link>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-transform duration-200 hover:scale-105">
              <defs>
                <linearGradient id="dreamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899">
                    <animate attributeName="stop-color"
                      values="#ec4899;#f59e0b;#10b981;#3b82f6;#8b5cf6;#ec4899"
                      dur="3s"
                      repeatCount="indefinite" />
                  </stop>
                  <stop offset="20%" stopColor="#f472b6">
                    <animate attributeName="stop-color"
                      values="#f472b6;#fbbf24;#34d399;#60a5fa;#a855f7;#f472b6"
                      dur="3s"
                      repeatCount="indefinite" />
                  </stop>
                  <stop offset="40%" stopColor="#a855f7">
                    <animate attributeName="stop-color"
                      values="#a855f7;#ec4899;#f59e0b;#10b981;#3b82f6;#a855f7"
                      dur="3s"
                      repeatCount="indefinite" />
                  </stop>
                  <stop offset="60%" stopColor="#3b82f6">
                    <animate attributeName="stop-color"
                      values="#3b82f6;#8b5cf6;#ec4899;#f59e0b;#10b981;#3b82f6"
                      dur="3s"
                      repeatCount="indefinite" />
                  </stop>
                  <stop offset="80%" stopColor="#10b981">
                    <animate attributeName="stop-color"
                      values="#10b981;#3b82f6;#8b5cf6;#ec4899;#f59e0b;#10b981"
                      dur="3s"
                      repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#f59e0b">
                    <animate attributeName="stop-color"
                      values="#f59e0b;#10b981;#3b82f6;#8b5cf6;#ec4899;#f59e0b"
                      dur="3s"
                      repeatCount="indefinite" />
                  </stop>
                </linearGradient>
              </defs>
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="1.8"
                stroke="url(#dreamGradient)"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z" 
              />
            </svg>
            {mode === "edit" ? t("dreams.new.titleEdit") : t("dreams.new.titleCreate")}
          </h1>
        </div>

        {/* 日期和时间选择区 */}
        <div className="flex flex-wrap items-center gap-3">
          <DatePicker
            date={dreamDate}
            onDateChange={(date) => date && setDreamDate(date)}
            className="w-auto h-10"
          />
          <div className="relative flex items-center">
            <Clock className="absolute left-3 h-4 w-4 text-foreground pointer-events-none z-10 transition-colors duration-300 group-hover:text-primary" />
            <Input
              type="time"
              value={dreamTime}
              onChange={(e) => setDreamTime(e.target.value)}
              className="group h-10 w-[120px] pl-9 border border-border/60 hover:border-primary/50 hover:scale-[1.02] active:scale-[0.98] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-300 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              placeholder="梦境时间"
            />
          </div>
        </div>

        {/* ===== 核心输入区 ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
        <Card className="border border-border/60 shadow-lg dark:border-border/30 dark:shadow-none">
          <CardContent className="p-6 md:p-8 space-y-6">
            {/* 梦境标题 */}
            <div className="group">
              <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary transition-all duration-300 group-focus-within:text-amber-500 group-focus-within:scale-110 group-focus-within:rotate-12" />
                <span className="transition-colors duration-300 group-focus-within:text-amber-500">{t("dreams.new.dreamTitle")}</span>
                <span className="text-sm text-muted-foreground/70 font-normal">({t("dreams.new.optional")})</span>
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="给你的梦境起个名字吧..."
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      // 用户手动编辑后，不再标记为 AI 生成
                      setTitleGeneratedByAI(false);
                    }}
                    maxLength={50}
                    className="text-sm h-10 border border-border/60 bg-transparent focus-visible:border-amber-500/80 dark:focus-visible:border-amber-400/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_15px_rgba(251,191,36,0.15)] dark:focus-visible:shadow-[0_0_20px_rgba(251,191,36,0.2)] placeholder:text-sm placeholder:text-muted-foreground/90 dark:placeholder:text-foreground placeholder:opacity-100 px-4 py-3 pr-14 rounded-lg transition-all duration-300"
                  />
                  {/* 字数统计 */}
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    {title.length}/50
                  </span>
                </div>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={generatingTitle}
                        onClick={async () => {
                          if (!content.trim()) {
                            toast(t("dreams.new.toast.titleNeedContent"), {
                              icon: "✨",
                              duration: 3000,
                            });
                            return;
                          }
                          setGeneratingTitle(true);
                          try {
                            const result = await DreamApi.generateTitleStandalone(
                              content.trim()
                            );
                            setTitle(result.title);
                            setTitleGeneratedByAI(true);
                            toast.success(t("dreams.new.toast.titleGenerated"));
                          } catch (err: any) {
                            toast.error(
                              err?.response?.data?.detail || t("dreams.new.toast.titleGenerateFailed")
                            );
                          } finally {
                            setGeneratingTitle(false);
                          }
                        }}
                        className="flex-shrink-0 h-10 px-3 gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500 dark:hover:text-amber-400 dark:hover:border-amber-400 transition-all duration-200"
                      >
                        {generatingTitle ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{t("dreams.new.toast.generating")}</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3.5 h-3.5" />
                            <span>{t("dreams.new.aiGenerate")}</span>
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-xs">{t("dreams.new.generateTitleTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* 梦境内容 */}
            <div className="group">
              <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary transition-all duration-300 group-focus-within:text-blue-500 group-focus-within:scale-110" />
                <span className="transition-colors duration-300 group-focus-within:text-blue-500">{t("dreams.new.dreamContent")}</span>
              </Label>
              <div 
                ref={(node) => {
                  containerRef.current = node;
                  contentAreaRef.current = node;
                }}
                className="relative rounded-lg border border-border/60 bg-transparent focus-within:border-blue-500/80 dark:focus-within:border-blue-400/60 focus-within:shadow-[0_0_15px_rgba(59,130,246,0.15)] dark:focus-within:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-shadow duration-300 flex flex-col"
              >
                {/* 文本输入区域 - 可滚动 */}
                <div className="flex-1 overflow-y-auto">
                  <Textarea
                    placeholder="描述你的梦境... 放松，想到什么写什么"
                    value={content}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (newValue.length <= 1000) {
                        setContent(newValue);
                      } else {
                        toast.error(t("dreams.new.toast.contentTooLong"));
                      }
                    }}
                    maxLength={1000}
                    className="text-sm leading-relaxed border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-sm placeholder:text-muted-foreground/90 dark:placeholder:text-foreground placeholder:opacity-100 p-4 rounded-t-lg w-full h-full min-h-full"
                  />
                </div>
                
                {/* 底部操作栏 - 固定 */}
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t border-border/40 bg-gradient-to-t from-background/20 to-transparent rounded-b-lg">
                  <div className="flex items-center gap-2">
                    {/* 图片上传按钮 */}
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        title={t("dreams.new.selectImage")}
                        className="hidden"
                        id="dream-image-input"
                        onChange={(e) => {
                          if (e.target.files) {
                            const remaining = 8 - totalImageCount;
                            const accepted = Array.from(e.target.files)
                              .filter((f) => f.type.startsWith("image/"))
                              .slice(0, remaining)
                              .map((file) => ({
                                id: `file_${Date.now()}_${Math.random()}`,
                                file,
                                preview: URL.createObjectURL(file),
                              }));
                            if (accepted.length) {
                              setImageFiles([...imageFiles, ...accepted]);
                            }
                            e.target.value = "";
                          }
                        }}
                      />
                      <label
                        htmlFor="dream-image-input"
                        className="relative flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200 cursor-pointer hover:scale-110 hover:-translate-y-0.5"
                        title={t("dreams.new.uploadImage")}
                      >
                        <ImagePlus className="w-5 h-5 transition-transform duration-200" />
                        {totalImageCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-medium bg-primary/80 text-primary-foreground rounded-full">
                            {totalImageCount}
                          </span>
                        )}
                      </label>
                    </div>

                    {/* 画板按钮 */}
                    <button
                      type="button"
                      onClick={() => setDrawingBoardOpen(true)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200 hover:scale-110 hover:-translate-y-0.5"
                      title={t("dreams.new.drawingBoard")}
                    >
                      <PenTool className="w-5 h-5" />
                    </button>

                    {/* 语音录制按钮 */}
                    <VoiceRecorder
                      onTranscription={(text) =>
                        setContent((prev) => (prev ? prev + " " + text : text))
                      }
                      className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200 hover:scale-110 hover:-translate-y-0.5"
                    />
                  </div>

                  {/* 字数统计 */}
                  <span className="text-xs text-muted-foreground">
                    {content.length}/1000
                  </span>
                </div>

                {/* 拖曳调整高度的把手 */}
                <div 
                  onMouseDown={handleMouseDown}
                  className="absolute bottom-0 right-0 w-6 h-6 cursor-ns-resize opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-60 bg-[linear-gradient(135deg,transparent_50%,rgba(59,130,246,0.5)_50%)] rounded-br-md" 
                  title={t("dreams.new.dragToResize")}
                />
              </div>

              {/* 图片预览：编辑时已有 + 本次新增共用一个网格，从左到右、自动换行 */}
              {((mode === "edit" &&
                initialDream?.attachments &&
                initialDream.attachments.some(
                  (att) =>
                    att.attachment_type === "IMAGE" ||
                    (att.mime_type && att.mime_type.startsWith("image/"))
                )) ||
                imageFiles.length > 0) && (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {/* 已有图片（仅编辑模式），支持取消；保存时会从 OSS 删除被取消的 */}
                  {mode === "edit" &&
                    initialDream?.attachments
                      ?.filter(
                        (att) =>
                          (att.attachment_type === "IMAGE" ||
                            (att.mime_type && att.mime_type.startsWith("image/"))) &&
                          !removedAttachmentIds.includes(att.id)
                      )
                      .map((att) => (
                        <div
                          key={att.id}
                          className="relative aspect-square rounded-lg overflow-hidden group border border-border"
                        >
                          <Image
                            src={att.thumbnail_url || att.file_url}
                            alt="attachment"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <button
                            type="button"
                            title={t("dreams.new.cancelImage")}
                            onClick={() =>
                              setRemovedAttachmentIds((prev) => [...prev, att.id])
                            }
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                  {/* 本次新增图片（与已有图同一网格，紧挨着右侧排列） */}
                  {imageFiles.map((f) => (
                    <div
                      key={f.id}
                      className="relative aspect-square rounded-lg overflow-hidden group border border-border"
                    >
                      <Image
                        src={f.preview}
                        alt="preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        title={t("dreams.new.deleteImage")}
                        onClick={() => {
                          URL.revokeObjectURL(f.preview);
                          setImageFiles(imageFiles.filter((img) => img.id !== f.id));
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* ===== 提示说明 ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative"
        >
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
            <div className="px-4 py-2 rounded-full bg-primary/5 border border-primary/20">
              <span className="text-xs text-muted-foreground">
                {t("dreams.new.optionalInfo")}
              </span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
          </div>
        </motion.div>

        {/* ===== 情绪与感受 ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
        <Collapsible open={emotionCardOpen} onOpenChange={setEmotionCardOpen}>
        <Card className="overflow-hidden hover:shadow-lg transition-all border border-border/60 border-l-4 border-l-primary/30">
          <CollapsibleTrigger asChild>
            <CardHeader className="flex-row items-center justify-between py-3 cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors border-b border-border/60">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                <CardTitle className="text-base text-primary">{t("dreams.new.emotionSection")}</CardTitle>
              </div>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform duration-200",
                  emotionCardOpen && "rotate-180"
                )}
              />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
          <CardContent className="pt-5 pb-6 space-y-6">
            {/* 步骤1: 主导情绪 */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                {t("dreams.new.emotionQuestion")}
              </Label>
              <div className="space-y-3">
                {EMOTION_CATEGORIES.map((cat) => (
                  <div key={cat.name}>
                    <p className="text-xs font-medium text-foreground mb-2">
                      {t(`dreams.new.${cat.name}Emotions`)}
                    </p>
                    <div className={cn(
                      "flex gap-2",
                      cat.name === "complex" ? "flex-nowrap overflow-x-auto scrollbar-hide" : "flex-wrap"
                    )}>
                      {cat.emotions.map((e) => {
                        const emotionColor = EMOTION_COLOR_MAP[e] || "#a78bfa";
                        const isSelected = primaryEmotion === e;
                        
                        return (
                          <Badge
                            key={e}
                            variant="outline"
                            className={cn(
                              "cursor-pointer hover:scale-105 transition-all duration-200 px-3 py-1.5 font-normal",
                              cat.name === "complex" && "flex-shrink-0",
                              "hover:shadow-md"
                            )}
                            style={{
                              backgroundColor: isSelected ? `${emotionColor}75` : `${emotionColor}20`,
                              borderColor: isSelected ? emotionColor : `${emotionColor}50`,
                              color: 'var(--foreground)',
                              opacity: 0.92,
                            }}
                            onClick={() =>
                              setPrimaryEmotion(primaryEmotion === e ? "" : e)
                            }
                          >
                            {getEmotionLabel(e, t)}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 步骤2: 强度 */}
            {primaryEmotion && (
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  2. 这种感觉有多强？
                </Label>
                <div className="flex items-center gap-4">
                  <div className="flex flex-wrap gap-2">
                    {EMOTION_INTENSITIES.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setEmotionIntensity(level.value)}
                        className={cn(
                          "py-1.5 px-3 rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-md text-sm",
                          emotionIntensity === level.value
                            ? "border-primary bg-primary/10 dark:bg-primary/20"
                            : "border-border/60 bg-card hover:bg-accent hover:border-primary/50"
                        )}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Switch
                      id="emotion-residual"
                      checked={emotionResidual}
                      onCheckedChange={setEmotionResidual}
                    />
                    <Label htmlFor="emotion-residual" className="text-sm font-normal cursor-pointer whitespace-nowrap">
                      醒来后这种感觉还在吗？
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* AI 提示 */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                {t("dreams.new.aiEmotionHint")}
              </p>
            </div>
          </CardContent>
          </CollapsibleContent>
        </Card>
        </Collapsible>
        </motion.div>

        {/* ===== 睡眠质量 ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
        <Collapsible open={sleepCardOpen} onOpenChange={setSleepCardOpen}>
        <Card className="overflow-hidden hover:shadow-lg transition-all border border-border/60 border-l-4 border-l-blue-500/30">
          <CollapsibleTrigger asChild>
            <CardHeader className="flex-row items-center justify-between py-3 cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors border-b border-border/60">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-base text-blue-500">{t("dreams.new.sleepSection")}</CardTitle>
              </div>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform duration-200",
                  sleepCardOpen && "rotate-180"
                )}
              />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
          <CardContent className="pt-5 pb-6 space-y-6">
            {/* 入睡和醒来时间 */}
            <div className="space-y-6">
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <Label className="text-sm font-medium mb-2 block">{t("dreams.new.sleepStartTime")}</Label>
                  <div className="relative flex items-center">
                    <Clock className="absolute left-3 h-4 w-4 text-foreground pointer-events-none z-10 transition-colors duration-200" />
                    <Input
                      type="time"
                      value={sleepStartTime}
                      onChange={(e) => setSleepStartTime(e.target.value)}
                      onMouseEnter={(e) => {
                        const icon = e.currentTarget.previousElementSibling;
                        if (icon) icon.classList.add('!text-primary');
                      }}
                      onMouseLeave={(e) => {
                        const icon = e.currentTarget.previousElementSibling;
                        if (icon) icon.classList.remove('!text-primary');
                      }}
                      className="h-10 w-[120px] pl-9 border border-border/60 hover:border-primary/50 hover:shadow-md hover:scale-[1.02] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all duration-200 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">{t("dreams.new.wakeTime")}</Label>
                  <div className="relative flex items-center">
                    <Clock className="absolute left-3 h-4 w-4 text-foreground pointer-events-none z-10 transition-colors duration-200" />
                    <Input
                      type="time"
                      value={awakeningTime}
                      onChange={(e) => setAwakeningTime(e.target.value)}
                      onMouseEnter={(e) => {
                        const icon = e.currentTarget.previousElementSibling;
                        if (icon) icon.classList.add('!text-primary');
                      }}
                      onMouseLeave={(e) => {
                        const icon = e.currentTarget.previousElementSibling;
                        if (icon) icon.classList.remove('!text-primary');
                      }}
                      className="h-10 w-[120px] pl-9 border border-border/60 hover:border-primary/50 hover:shadow-md hover:scale-[1.02] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all duration-200 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">{t("dreams.new.sleepDuration")}</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      placeholder={t("dreams.new.hours")}
                      value={sleepHours}
                      onChange={(e) => setSleepHours(e.target.value)}
                      className="w-16 h-10 text-center border border-border/60 hover:border-primary/50 hover:shadow-md hover:scale-105 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all duration-200"
                    />
                    <span className="text-muted-foreground text-sm">时</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder={t("dreams.new.minutes")}
                      value={sleepMinutes}
                      onChange={(e) => setSleepMinutes(e.target.value)}
                      className="w-16 h-10 text-center border border-border/60 hover:border-primary/50 hover:shadow-md hover:scale-105 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all duration-200"
                    />
                    <span className="text-muted-foreground text-sm">分</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 质量 */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                {t("dreams.new.sleepQualityQuestion")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {SLEEP_QUALITIES.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => setSleepQuality(sleepQuality === q.value ? "" : q.value)}
                    className={cn(
                      "flex items-center justify-center rounded-lg border px-3 py-2 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md",
                      sleepQuality === q.value
                        ? "border-primary bg-primary/10 dark:bg-primary/20"
                        : "border-border/60 bg-card hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    <span className="text-sm text-foreground">
                      {t(`dreams.new.sleepQuality${q.value}`)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 深度 */}
            <div>
              <Label className="text-sm font-medium mb-3 block">{t("dreams.new.sleepDepth")}</Label>
              <div className="flex gap-2">
                {SLEEP_DEPTHS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setSleepDepth(sleepDepth === d.value ? "" : d.value)}
                    className={cn(
                      "py-2 px-3 rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-md",
                      sleepDepth === d.value
                        ? "border-primary bg-primary/10 dark:bg-primary/20"
                        : "border-border/60 bg-card hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    <span className="text-sm text-foreground">
                      {t(`dreams.new.sleepDepth${d.value}`)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 醒来状态 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Label className="text-sm font-medium">{t("dreams.new.awakeningState")}</Label>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div className="space-y-1.5 text-xs whitespace-pre-line">
                        {t("dreams.new.awakeningStateTooltip").split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex flex-wrap gap-2">
                {AWAKENING_STATES.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAwakeningState(awakeningState === a.value ? "" : a.value)}
                    className={cn(
                      "py-2 px-3 rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-md",
                      awakeningState === a.value
                        ? "border-primary bg-primary/10 dark:bg-primary/20"
                        : "border-border/60 bg-card hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    <span className="text-sm text-foreground">
                      {t(`dreams.new.awakening${a.value.charAt(0) + a.value.slice(1).toLowerCase()}`)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-8 mt-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isNap}
                    onCheckedChange={setIsNap}
                    id="is-nap"
                  />
                  <Label htmlFor="is-nap" className="text-sm cursor-pointer">
                    {t("dreams.new.isNap")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={sleepFragmented}
                    onCheckedChange={setSleepFragmented}
                    id="sleep-fragmented"
                  />
                  <Label htmlFor="sleep-fragmented" className="text-sm cursor-pointer">
                    {t("dreams.new.isFragmented")}<span className="text-muted-foreground">{t("dreams.new.fragmentedHint")}</span>
                  </Label>
                </div>
              </div>
            </div>

            {/* AI 提示 */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                {t("dreams.new.aiSleepHint")}
              </p>
            </div>
          </CardContent>
          </CollapsibleContent>
        </Card>
        </Collapsible>
        </motion.div>

        {/* ===== 梦境特征 ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
        <Collapsible open={featuresCardOpen} onOpenChange={setFeaturesCardOpen}>
        <Card className="overflow-hidden hover:shadow-lg transition-all border border-border/60 border-l-4 border-l-purple-500/30">
          <CollapsibleTrigger asChild>
            <CardHeader className="flex-row items-center justify-between py-3 cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors border-b border-border/60">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-500" />
                <CardTitle className="text-base text-purple-500">{t("dreams.new.characteristicsSection")}</CardTitle>
              </div>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform duration-200",
                  featuresCardOpen && "rotate-180"
                )}
              />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
          <CardContent className="pt-5 pb-6 space-y-6">
            {/* 类型 */}
            <div>
              <Label className="text-sm font-medium mb-3 block">{t("dreams.new.dreamType")}</Label>
              <div className="flex flex-wrap gap-2">
                {DREAM_TYPES.map((dtype) => {
                  const iconConfig = {
                    MessageCircle: { 
                      component: MessageCircle, 
                      color: "text-blue-500",
                      bgColor: "bg-blue-500/15",
                      borderColor: "border-blue-500/50"
                    },
                    Sparkles: { 
                      component: Sparkles, 
                      color: "text-amber-500",
                      bgColor: "bg-amber-500/15",
                      borderColor: "border-amber-500/50"
                    },
                    Flame: { 
                      component: Flame, 
                      color: "text-red-500",
                      bgColor: "bg-red-500/15",
                      borderColor: "border-red-500/50"
                    },
                    RotateCw: { 
                      component: RotateCw, 
                      color: "text-purple-500",
                      bgColor: "bg-purple-500/15",
                      borderColor: "border-purple-500/50"
                    },
                    Palette: { 
                      component: Palette, 
                      color: "text-pink-500",
                      bgColor: "bg-pink-500/15",
                      borderColor: "border-pink-500/50"
                    },
                    Sparkle: { 
                      component: Sparkle, 
                      color: "text-cyan-500",
                      bgColor: "bg-cyan-500/15",
                      borderColor: "border-cyan-500/50"
                    },
                  }[dtype.icon];
                  
                  const IconComponent = iconConfig?.component;
                  const isSelected = dreamTypes.includes(dtype.value);
                  
                  return (
                    <Badge
                      key={dtype.value}
                      variant="outline"
                      className={cn(
                        "cursor-pointer hover:scale-105 transition-all duration-200 px-3 py-2",
                        isSelected
                          ? `${iconConfig.bgColor} ${iconConfig.borderColor} shadow-sm`
                          : "border-border/80 dark:border-border/60 hover:border-primary/50 dark:hover:border-primary/40",
                        // 覆盖默认的 hover 背景
                        !isSelected && "hover:bg-primary/5 dark:hover:bg-primary/10"
                      )}
                      onClick={() => toggleDreamType(dtype.value)}
                      title={t(`dreams.new.dreamType${dtype.value.charAt(0) + dtype.value.slice(1).toLowerCase()}Desc`)}
                    >
                      {IconComponent && (
                        <IconComponent 
                          className={cn("w-3.5 h-3.5 mr-1.5", iconConfig.color)} 
                        />
                      )}
                      {t(`dreams.new.dreamType${dtype.value.charAt(0) + dtype.value.slice(1).toLowerCase()}`)}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* 清醒梦专属 */}
            {dreamTypes.includes("LUCID") && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  清醒程度
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {LUCIDITY_LEVELS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setLucidityLevel(l.value)}
                      className={cn(
                        "py-2 px-2 rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-md text-sm",
                        lucidityLevel === l.value
                          ? "border-amber-500 bg-amber-500/15 shadow-sm"
                          : "border-border/60 bg-card hover:bg-accent hover:border-amber-500/50"
                      )}
                    >
                      <div className="font-medium text-xs">{l.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        {l.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 清晰度 */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                {t("dreams.new.dreamClarity")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {VIVIDNESS_LEVELS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setVividness(vividness === v.value ? "" : v.value)}
                    className={cn(
                      "py-2 px-3 rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-md",
                      vividness === v.value
                        ? "border-primary bg-primary/10 dark:bg-primary/20"
                        : "border-border/60 bg-card hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-medium text-foreground">{t(`dreams.new.vividness${v.value}`)}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{t(`dreams.new.vividness${v.value}Desc`)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 完整度 */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                {t("dreams.new.memoryCompleteness")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {COMPLETENESS_LEVELS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCompletenessScore(completenessScore === c.value ? "" : c.value)}
                    className={cn(
                      "py-2 px-3 rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-md",
                      completenessScore === c.value
                        ? "border-primary bg-primary/10 dark:bg-primary/20"
                        : "border-border/60 bg-card hover:bg-accent hover:border-primary/50"
                    )}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-medium text-foreground">{t(`dreams.new.completeness${c.value}`)}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{t(`dreams.new.completeness${c.value}Desc`)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI 提示 */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                {t("dreams.new.aiCharacteristicsHint")}
              </p>
            </div>
          </CardContent>
          </CollapsibleContent>
        </Card>
        </Collapsible>
        </motion.div>

        {/* ===== 现实关联 (可折叠) ===== */}
        <Collapsible open={realityCardOpen} onOpenChange={setRealityCardOpen}>
          <Card className="border border-border/60 border-l-4 border-l-green-500/30">
            <CollapsibleTrigger asChild>
              <CardHeader className="flex-row items-center justify-between py-3 cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors group border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-green-500" />
                  <CardTitle className="text-base text-green-500">{t("dreams.new.realityConnectionSection")}</CardTitle>
                </div>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform duration-200",
                    realityCardOpen && "rotate-180"
                  )}
                />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-5 pb-6 space-y-5">
                {/* 前一天事件 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {t("dreams.new.whatHappenedYesterday")}
                  </Label>
                  <div className="relative group">
                    <Textarea
                      ref={lifeContextAreaRef}
                      placeholder={t("dreams.new.whatHappenedPlaceholder")}
                      value={lifeContext}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (newValue.length <= 500) {
                          setLifeContext(newValue);
                        } else {
                          toast.error(t("dreams.new.toast.lifeContextTooLong"));
                        }
                      }}
                      maxLength={500}
                      className="resize-none border border-border/60 bg-transparent focus-visible:border-green-500/80 dark:focus-visible:border-green-400/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_15px_rgba(34,197,94,0.15)] dark:focus-visible:shadow-[0_0_20px_rgba(34,197,94,0.2)] placeholder:text-sm placeholder:text-muted-foreground/90 dark:placeholder:text-foreground placeholder:opacity-100 rounded-lg transition-shadow duration-300 pr-14"
                    />
                    <span className="absolute right-3 bottom-3 text-xs text-muted-foreground pointer-events-none">
                      {lifeContext.length}/500
                    </span>
                    <div 
                      onMouseDown={handleLifeContextMouseDown}
                      className="absolute bottom-0 right-0 w-6 h-6 cursor-ns-resize opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-60 bg-[linear-gradient(135deg,transparent_50%,rgba(34,197,94,0.5)_50%)] rounded-br-md" 
                      title={t("dreams.new.dragToResize")}
                    />
                  </div>
                </div>

                {/* 关联程度 */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    {t("dreams.new.realityCorrelation")}
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {REALITY_CORRELATIONS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRealityCorrelation(realityCorrelation === r.value ? "" : r.value)}
                        className={cn(
                          "p-2 rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-md text-center",
                          realityCorrelation === r.value
                            ? "border-green-500 bg-green-500/15 shadow-sm"
                            : "border-border/60 bg-card hover:bg-green-500/5 hover:border-green-500/50"
                        )}
                      >
                        <div className="flex items-center justify-center gap-1.5 font-medium text-xs mb-0.5">
                          <span className="text-sm">{r.icon}</span>
                          {t(`dreams.new.reality${r.value}`)}
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-tight">
                          {t(`dreams.new.reality${r.value}Desc`)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 个人解读 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {t("dreams.new.yourInterpretation")}
                  </Label>
                  <div className="relative group">
                    <Textarea
                      ref={userInterpretationAreaRef}
                      placeholder={t("dreams.new.yourInterpretationPlaceholder")}
                      value={userInterpretation}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (newValue.length <= 300) {
                          setUserInterpretation(newValue);
                        } else {
                          toast.error(t("dreams.new.toast.interpretationTooLong"));
                        }
                      }}
                      maxLength={300}
                      className="resize-none border border-border/60 bg-transparent focus-visible:border-green-500/80 dark:focus-visible:border-green-400/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_15px_rgba(34,197,94,0.15)] dark:focus-visible:shadow-[0_0_20px_rgba(34,197,94,0.2)] placeholder:text-sm placeholder:text-muted-foreground/90 dark:placeholder:text-foreground placeholder:opacity-100 rounded-lg transition-shadow duration-300 pr-14"
                    />
                    {/* 字数计数器 */}
                    <span className="absolute bottom-3 right-3 text-xs text-muted-foreground pointer-events-none">
                      {userInterpretation.length}/300
                    </span>
                    <div 
                      onMouseDown={handleUserInterpretationMouseDown}
                      className="absolute bottom-0 right-0 w-6 h-6 cursor-ns-resize opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-60 bg-[linear-gradient(135deg,transparent_50%,rgba(34,197,94,0.5)_50%)] rounded-br-md" 
                      title={t("dreams.new.dragToResize")}
                    />
                  </div>
                </div>

                {/* AI 提示 */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <Sparkles className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {t("dreams.new.aiRealityHint")}
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ===== 提交区 ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col gap-4 pb-8"
        >
          {/* 公开发布选项：仅在 PUBLIC 时显示 */}
          {privacyLevel === "PUBLIC" && (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 p-3 rounded-xl border border-border/60 bg-transparent">
              <div className="flex items-center gap-2.5">
                <Switch
                  id="is-anonymous"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
                <Label htmlFor="is-anonymous" className="text-sm cursor-pointer">
                  {t("dreams.new.anonymousPost")}
                </Label>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">{t("dreams.new.anonymousPostTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="h-5 w-px bg-border/60 hidden sm:block" />
              <div className="flex items-center gap-2.5">
                <Switch
                  id="is-seeking-interpretation"
                  checked={isSeekingInterpretation}
                  onCheckedChange={setIsSeekingInterpretation}
                />
                <Label htmlFor="is-seeking-interpretation" className="text-sm cursor-pointer">
                  {t("dreams.new.seekingInterpretation")}
                </Label>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">{t("dreams.new.seekingInterpretationTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <>
                <div className="h-5 w-px bg-border/60 hidden sm:block" />
                <div className="flex items-center gap-2.5">
                  <Switch
                    id="share-to-community"
                    checked={shareToCommunityEnabled}
                    onCheckedChange={(value) => {
                      setShareToCommunityEnabled(value);
                      if (!value) {
                        setSelectedCommunityId("");
                      }
                    }}
                  />
                  <Label
                    htmlFor="share-to-community"
                    className="text-sm cursor-pointer whitespace-nowrap"
                  >
                    {t("dreams.new.shareToCommunity")}
                  </Label>
                  {shareToCommunityEnabled && (
                    <select
                      id="community-share"
                      title={
                        joinedCommunities.length > 0
                          ? t("dreams.new.shareToCommunitySelectTitle")
                          : t("dreams.new.shareToCommunityNoOptions")
                      }
                      value={selectedCommunityId}
                      onChange={(e) => setSelectedCommunityId(e.target.value)}
                      disabled={joinedCommunities.length === 0}
                      className="h-8 rounded-md border border-emerald-500/70 bg-background px-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {joinedCommunities.length > 0 ? (
                        <>
                          <option value="">{t("dreams.new.shareToCommunityPlaceholder")}</option>
                          {joinedCommunities.map((community) => (
                            <option key={community.id} value={community.id}>
                              {community.name}
                            </option>
                          ))}
                        </>
                      ) : (
                        <option value="">{t("dreams.new.shareToCommunityNoOptions")}</option>
                      )}
                    </select>
                  )}
                </div>
              </>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* 隐私级别选择 - 左侧 */}
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="text-muted-foreground whitespace-nowrap">{t("dreams.new.visibilityQuestion")}</span>
              <div className="inline-flex rounded-full border border-border/40 dark:border-border/30 bg-transparent p-0.5 backdrop-blur-sm">
                {[
                  { value: "PRIVATE", label: t("dreams.new.visibilityPrivate"), title: "只有你自己能看到" },
                  { value: "FRIENDS", label: t("dreams.new.visibilityFriends"), title: "未来支持好友可见" },
                  { value: "PUBLIC", label: t("dreams.new.visibilityPublic"), title: "所有人都可以看到" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.title}
                    onClick={() => setPrivacyLevel(opt.value as typeof privacyLevel)}
                    className={cn(
                      "relative px-3 py-1 text-xs font-medium rounded-full transition-all duration-300 ease-out whitespace-nowrap",
                      privacyLevel === opt.value
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                        : "text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-muted/30 dark:hover:bg-white/5 hover:scale-[1.02]"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 操作按钮 - 右侧紧挨着 */}
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                className="text-foreground hover:text-foreground dark:hover:text-foreground border-border/70 hover:border-border hover:bg-accent/80 dark:hover:bg-accent/90 hover:scale-105 hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
              >
                <Link href="/dreams">{t("dreams.new.cancel")}</Link>
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !content.trim()}
                className="gap-2 min-w-[120px] hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 transition-all duration-200"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t("dreams.new.save")}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* 画板对话框 */}
      <DrawingBoard
        open={drawingBoardOpen}
        onOpenChange={setDrawingBoardOpen}
        onSave={handleDrawingSave}
      />

      {/* 回到顶部按钮 */}
      <ScrollToTop />
    </div>
  );
}

export default function NewDreamPage() {
  return <DreamEditor mode="create" initialDream={null} />;
}

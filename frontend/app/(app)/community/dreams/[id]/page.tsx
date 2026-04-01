"use client";

import { CommentSection } from "@/components/community/comment-section";
import { BookmarkButton } from "@/components/community/bookmark-button";
import { ResonanceButton } from "@/components/community/resonance-button";
import { ReportDialog } from "@/components/community/report-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { communityAPI, type DreamCardSocial } from "@/lib/community-api";
import { AuthUser } from "@/lib/auth-api";
import { formatCount } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN, enUS, ja } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Brain,
  Calendar,
  Eye,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import { DreamerLevelBadge } from "@/components/community/dreamer-level-badge";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DREAM_TYPE_LABEL_KEYS: Record<string, string> = {
  LUCID: "dreams.new.dreamTypeLucid",
  NIGHTMARE: "dreams.new.dreamTypeNightmare",
  RECURRING: "dreams.new.dreamTypeRecurring",
  SYMBOLIC: "dreams.new.dreamTypeSymbolic",
  VIVID: "dreams.new.dreamTypeVivid",
  NORMAL: "dreams.new.dreamTypeNormal",
};

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export default function CommunityDreamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const defaultTab = (searchParams.get("tab") as "comments" | "interpretations") ?? "interpretations";

  const [dream, setDream] = useState<DreamCardSocial | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUser = AuthUser.get();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const fetchDream = async () => {
      setLoading(true);
      try {
        const data = await communityAPI.getDream(id);
        setDream(data);


        // 记录浏览：同一标签页内仅请求一次，避免刷新重复计数
        if (typeof window !== "undefined") {
          const viewSessionKey = `community:dream:viewed:${id}`;
          if (sessionStorage.getItem(viewSessionKey) !== "1") {
            sessionStorage.setItem(viewSessionKey, "1");
            communityAPI
              .incrementDreamView(id)
              .then((res) => {
                setDream((prev) =>
                  prev && prev.id === id ? { ...prev, view_count: res.view_count } : prev
                );
              })
              .catch(() => {
                sessionStorage.removeItem(viewSessionKey);
              });
          }
        }
      } catch {
        toast.error(t("dreams.detail.loadFailed"));
        setDream(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDream();
  }, [id]);

  const isDreamOwner = currentUser?.id === dream?.author?.id;

  const authorName = dream?.is_anonymous
    ? t("community.home.anonymous")
    : dream?.author?.username ?? t("common.unknownUser");

  // 计数直接使用后端分离口径：comment_count=评论，interpretation_count=解读
  const pureCommentCount = dream?.comment_count ?? 0;
  const interpretationCount = dream?.interpretation_count ?? 0;

  const currentLocale = i18n.language.startsWith("en")
    ? enUS
    : i18n.language.startsWith("ja")
    ? ja
    : zhCN;

  const dateFormat =
    i18n.language.startsWith("en")
      ? "MMM d, yyyy"
      : "yyyy年MM月dd日";

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success(t("community.dreamDetail.shareCopied"));
      if (dream?.id) {
        communityAPI.incrementDreamShare(dream.id).then((res) => {
          setDream((prev) => (prev && prev.id === dream.id ? { ...prev, share_count: res.share_count } : prev));
        }).catch(() => {});
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-full md:max-w-3xl xl:max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <DetailSkeleton />
        ) : dream === null ? (
          /* Fallback: dream loaded via backend — show message */
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-4xl mb-3">🌙</p>
              <p className="text-sm">{t("community.dreamDetail.emptyState")}</p>
              <Link href="/community">
                <Button className="mt-4" variant="outline" size="sm">
                  {t("community.dreamDetail.backToCommunity")}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Dream content card */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-5">
              {/* 返回社区：移入卡片内，无左 padding，与下方头像留足间距 */}
              <div className="-mt-1 mb-4">
                <Link href="/community" className="group inline-flex">
                  <Button variant="ghost" size="sm" className="gap-2.5 pl-0 text-sm text-muted-foreground hover:text-foreground hover:bg-transparent transition-colors duration-200">
                    <span className="inline-flex items-center justify-center rounded-full p-0.5 transition-[transform,box-shadow] duration-200 group-hover:-translate-x-0.5 group-hover:shadow-[0_0_10px_rgba(0,0,0,0.12)] dark:group-hover:shadow-[0_0_8px_rgba(255,255,255,0.4),0_0_16px_rgba(255,255,255,0.15)]">
                      <ArrowLeft className="h-[18px] w-[18px]" />
                    </span>
                    {t("community.dreamDetail.backToCommunity")}
                  </Button>
                </Link>
              </div>

              {/* Author：头像、名称、梦境类型、更多菜单（...）同一水平线 */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {dream.is_anonymous ? (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
                      {t("community.dreamDetail.anonymousAvatar")}
                    </div>
                  ) : (
                    <Link href={`/community/users/${dream.author?.id}`} className="shrink-0">
                      <UserAvatar
                        userId={dream.author?.id ?? "anon"}
                        avatar={dream.author?.avatar}
                        username={dream.author?.username}
                        size="md"
                      />
                    </Link>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {dream.is_anonymous ? (
                        <span className="font-medium">{authorName}</span>
                      ) : (
                        <Link
                          href={`/community/users/${dream.author?.id}`}
                          className="font-medium hover:text-primary hover:underline transition-colors"
                        >
                          {authorName}
                        </Link>
                      )}
                      {dream.author?.dreamer_level && dream.author.dreamer_level >= 1 && (
                        <DreamerLevelBadge
                          level={dream.author.dreamer_level}
                          title={dream.author.dreamer_title}
                          size="xs"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(dream.dream_date), dateFormat, { locale: currentLocale })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {dream.dream_types?.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {t(DREAM_TYPE_LABEL_KEYS[type] ?? type)}
                    </Badge>
                  ))}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 rounded-full text-muted-foreground/70 dark:text-gray-300 hover:text-foreground dark:hover:text-white hover:bg-muted/50 dark:hover:bg-white/15 transition-colors duration-300"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {dream && (
                        <DropdownMenuItem asChild>
                              <ReportDialog
                            targetType="dream"
                            targetId={dream.id}
                            trigger={
                              <button type="button" className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-muted/60 dark:hover:bg-white/10 hover:text-foreground dark:hover:text-gray-100 transition-colors rounded-sm">
                                <Flag className="h-4 w-4" />
                                {t("community.report.title", {
                                  target: t("community.report.target.dream"),
                                })}
                              </button>
                            }
                          />
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Featured Banner */}
              {dream.is_featured && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/30">
                  <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {t("community.featured.badge")}
                  </span>
                  {dream.inspiration_score !== undefined && dream.inspiration_score > 0 && (
                    <span className="ml-auto text-xs text-amber-500 font-medium">
                      ✦ {t("community.featured.inspirationScore")} {dream.inspiration_score.toFixed(1)}
                    </span>
                  )}
                </div>
              )}

              {/* 寻求解读 */}
              {dream.is_seeking_interpretation && (
                <div className="flex flex-wrap gap-2">
                  <Badge className="gap-1 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800">
                    <Search className="h-3 w-3" />
                    {t("dreams.new.seekingInterpretation")}
                  </Badge>
                </div>
              )}

              {/* Title */}
              {dream.title && (
                <h1 className="text-xl font-bold leading-snug">{dream.title}</h1>
              )}

              {/* Content */}
              <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {dream.content_preview}
              </div>

              {/* Interaction bar：图标与数字统一 gap-1.5，专属色 + 悬浮深色与列表卡片一致 */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 text-sm transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-0.5">
                    <ResonanceButton
                      dreamId={dream.id}
                      initialCount={dream.resonance_count}
                      initialResonated={dream.has_resonated}
                      className="hover:!bg-transparent dark:hover:!bg-transparent !px-0 min-w-0 shrink-0"
                    />
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {t("community.dreamDetail.actions.resonance")}
                    </span>
                  </span>
                  <Link
                    href={`/community/dreams/${dream.id}?tab=comments`}
                    className="inline-flex items-center gap-1.5 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-transparent dark:hover:bg-transparent transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-0.5 rounded-md px-2 py-1"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span>{formatCount(pureCommentCount)}</span>
                    <span className="text-xs hidden sm:inline">
                      {t("community.dreamDetail.actions.comments")}
                    </span>
                  </Link>
                  <Link
                    href={`/community/dreams/${dream.id}?tab=interpretations`}
                    className="inline-flex items-center gap-1.5 text-sm text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 hover:bg-transparent dark:hover:bg-transparent transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-0.5 rounded-md px-2 py-1"
                  >
                    <Brain className="h-4 w-4 shrink-0" />
                    <span>{formatCount(interpretationCount)}</span>
                    <span className="text-xs hidden sm:inline">
                      {t("community.dreamDetail.actions.interpretations")}
                    </span>
                  </Link>
                  <span className="inline-flex items-center gap-1.5 text-sm text-amber-500 dark:text-amber-400 px-2 py-1 transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-0.5">
                    <BookmarkButton
                      dreamId={dream.id}
                      initialBookmarked={dream.has_bookmarked}
                      className="hover:!bg-transparent dark:hover:!bg-transparent !px-0 min-w-0 shrink-0 text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300"
                    />
                    <span>{formatCount(dream.bookmark_count ?? 0)}</span>
                    <span className="text-xs hidden sm:inline">
                      {t("dreams.detail.favorite")}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-1.5 text-sm text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-transparent dark:hover:bg-transparent transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-0.5 rounded-md px-2 py-1"
                  >
                    <Share2 className="h-4 w-4 shrink-0" />
                    <span>{formatCount(dream.share_count ?? 0)}</span>
                    <span className="text-xs hidden sm:inline">
                      {t("community.dreamDetail.actions.share")}
                    </span>
                  </button>
                  <span
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 cursor-default px-2 py-1"
                  >
                    <Eye className="h-4 w-4 shrink-0" />
                    <span>{formatCount(dream.view_count ?? 0)}</span>
                    <span className="text-xs hidden sm:inline">
                      {t("dreams.detail.views")}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Comment section */}
            <div className="bg-card border border-border rounded-2xl p-6 mt-6">
              <CommentSection
                dreamId={dream.id}
                isDreamOwner={isDreamOwner}
                currentUserId={currentUser?.id}
                dreamAuthorId={dream.author?.id}
                initialCommentCount={pureCommentCount}
                initialInterpretationCount={interpretationCount}
                defaultTab={defaultTab}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

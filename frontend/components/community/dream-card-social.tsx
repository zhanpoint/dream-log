"use client";

import "@/styles/community.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookmarkButton } from "@/components/community/bookmark-button";
import { ResonanceButton } from "@/components/community/resonance-button";
import { DreamerLevelBadge } from "@/components/community/dreamer-level-badge";
import { UserAvatar } from "@/components/user-avatar";
import { communityAPI, type DreamCardSocial } from "@/lib/community-api";
import { cn, formatCount } from "@/lib/utils";
import { Brain, Eye, MessageCircle, Search, Share2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

/** 相对时间：几分钟前 / 几小时前 / 几天前 / 几月前 / 几年前（支持多语言） */
function formatTimeAgo(date: Date, t: (key: string, options?: Record<string, unknown>) => string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return t("community.feed.time.justNow");
  if (diffMin < 60) return t("community.feed.time.minutesAgo", { count: diffMin });
  if (diffHour < 24) return t("community.feed.time.hoursAgo", { count: diffHour });
  if (diffDay < 30) return t("community.feed.time.daysAgo", { count: diffDay });
  if (diffMonth < 12) return t("community.feed.time.monthsAgo", { count: diffMonth });
  return t("community.feed.time.yearsAgo", { count: diffYear });
}

const DREAM_TYPE_LABELS: Record<string, string> = {
  LUCID: "清醒梦",
  NIGHTMARE: "噩梦",
  RECURRING: "重复梦",
  SYMBOLIC: "象征性强",
  VIVID: "特别清晰",
  NORMAL: "普通梦",
};

function AuthorAvatar({ author }: { author: DreamCardSocial["author"] }) {
  if (!author) {
    return (
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
        匿
      </div>
    );
  }
  return (
    <UserAvatar
      userId={author.id}
      avatar={author.avatar}
      username={author.username}
      size="sm"
    />
  );
}

interface DreamCardSocialProps {
  dream: DreamCardSocial;
  onResonanceToggle?: (dreamId: string, resonated: boolean, count: number) => void;
  onBookmarkToggle?: (dreamId: string, bookmarked: boolean) => void;
  className?: string;
}

const FOOTER_BTN_BASE =
  "gap-1.5 text-muted-foreground hover:!bg-transparent dark:hover:!bg-transparent transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-0.5";
// 共鸣按钮需保留自身状态色（未共鸣灰/已共鸣红），不传 text 色类避免覆盖
const FOOTER_BTN_BASE_NO_COLOR =
  "gap-1.5 hover:!bg-transparent dark:hover:!bg-transparent transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-0.5";
const FOOTER_ACTION_WRAP = "inline-flex rounded-md transition-colors text-muted-foreground";

export function DreamCardSocialComponent({
  dream,
  onResonanceToggle,
  onBookmarkToggle,
  className,
}: DreamCardSocialProps) {
  const { t } = useTranslation();
  const [resonanceCount, setResonanceCount] = useState(dream.resonance_count ?? 0);
  const [hasResonated, setHasResonated] = useState(dream.has_resonated);
  const [hasBookmarked, setHasBookmarked] = useState(dream.has_bookmarked);
  const [bookmarkCount, setBookmarkCount] = useState(dream.bookmark_count ?? 0);
  const [shareCount, setShareCount] = useState(dream.share_count ?? 0);

  // 父级 refetch 后传入新 dream 时同步本地状态，保证显示最新数值
  useEffect(() => {
    setResonanceCount(dream.resonance_count ?? 0);
    setHasResonated(dream.has_resonated);
    setHasBookmarked(dream.has_bookmarked);
    setBookmarkCount(dream.bookmark_count ?? 0);
    setShareCount(dream.share_count ?? 0);
  }, [dream.id, dream.resonance_count, dream.has_resonated, dream.has_bookmarked, dream.bookmark_count, dream.share_count]);

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = typeof window !== "undefined" ? `${window.location.origin}/community/dreams/${dream.id}` : "";
    if (url && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("链接已复制");
        communityAPI.incrementDreamShare(dream.id).then((res) => setShareCount(res.share_count)).catch(() => {});
      });
    }
  };

  const timeAgo = formatTimeAgo(new Date(dream.created_at), t);

  const authorName = dream.is_anonymous
    ? (dream.author?.username ?? "匿名做梦者")
    : (dream.author?.username ?? "匿名");

  const primaryDreamType = dream.dream_types?.[0];

  return (
    <div
      className={cn(
        "group relative bg-card border-2 rounded-xl p-4 transition-all duration-200",
        dream.is_featured
          ? "border-amber-400/40 bg-gradient-to-br from-amber-500/[0.03] via-transparent to-orange-500/[0.03] hover:border-amber-400/70 hover:shadow-2xl hover:shadow-amber-500/15"
          : "border-border hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10",
        "hover:-translate-y-1 hover:bg-gradient-to-br hover:from-primary/[0.02] hover:via-transparent hover:to-violet-500/[0.02]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {dream.is_anonymous ? (
            <div className="relative">
              <AuthorAvatar author={null} />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-card border border-border rounded-full flex items-center justify-center">
                <span className="text-[8px]">🎭</span>
              </div>
            </div>
          ) : (
            <Link href={`/community/users/${dream.author?.id}`} className="flex-shrink-0 relative group/avatar">
              <div className="relative">
                <AuthorAvatar author={dream.author} />
                <div className="absolute inset-0 rounded-full ring-2 ring-primary/0 group-hover/avatar:ring-primary/50 transition-all duration-200" />
              </div>
            </Link>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {dream.is_anonymous ? (
                <span className="text-sm font-medium text-muted-foreground">{authorName}</span>
              ) : (
                <Link
                  href={`/community/users/${dream.author?.id}`}
                  className="text-sm font-medium hover:text-primary transition-colors truncate"
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
            {primaryDreamType && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-secondary/50 rounded">
                  🌙 {DREAM_TYPE_LABELS[primaryDreamType] ?? primaryDreamType}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
        </div>
      </div>

      {/* Featured Banner */}
      {dream.is_featured && (
        <div className="flex items-center gap-1.5 mb-2.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/30">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">精选梦境</span>
          {dream.inspiration_score !== undefined && dream.inspiration_score > 0 && (
            <span className="ml-auto text-[10px] text-amber-500/80 font-medium">
              ✦ {dream.inspiration_score.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <Link href={`/community/dreams/${dream.id}`} className="block">
        <div className="space-y-2 mb-3">
          {dream.title && (
            <h3 className="font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
              {dream.title}
            </h3>
          )}
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {dream.content_preview}
          </p>
        </div>
      </Link>

      {/* Footer: 图标与数字统一 gap-1.5，各组之间统一 24px */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50 flex-wrap gap-2">
        <div className="flex items-center flex-wrap" style={{ gap: "24px" }}>
          <span data-dream-action="resonance" className={cn(FOOTER_ACTION_WRAP, "items-center gap-1.5")}>
            <ResonanceButton
              dreamId={dream.id}
              initialCount={resonanceCount}
              initialResonated={hasResonated}
              onToggle={(r, c) => {
                setHasResonated(r);
                setResonanceCount(c);
                onResonanceToggle?.(dream.id, r, c);
              }}
              className={cn(FOOTER_BTN_BASE_NO_COLOR, "!px-0 min-w-0 shrink-0")}
            />
          </span>
          <span data-dream-action="comment" className={cn(FOOTER_ACTION_WRAP, "items-center gap-1.5")}>
            <Button variant="ghost" size="sm" className={cn(FOOTER_BTN_BASE, "!px-0 min-w-0 shrink-0")} asChild>
              <Link href={`/community/dreams/${dream.id}?tab=comments`} className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium">{formatCount(dream.comment_count ?? 0)}</span>
              </Link>
            </Button>
          </span>
          <span data-dream-action="interpret" className={cn(FOOTER_ACTION_WRAP, "items-center gap-1.5")}>
            <Button variant="ghost" size="sm" className={cn(FOOTER_BTN_BASE, "!px-0 min-w-0 shrink-0")} asChild>
              <Link href={`/community/dreams/${dream.id}?tab=interpretations`} className="inline-flex items-center gap-1.5">
                <Brain className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium">{formatCount(dream.interpretation_count ?? 0)}</span>
              </Link>
            </Button>
          </span>
          <span data-dream-action="bookmark" className={cn(FOOTER_ACTION_WRAP, "items-center gap-1.5")}>
            <BookmarkButton
              dreamId={dream.id}
              initialBookmarked={hasBookmarked}
              onToggle={(b) => {
                setHasBookmarked(b);
                setBookmarkCount((c) => (b ? c + 1 : Math.max(0, c - 1)));
                onBookmarkToggle?.(dream.id, b);
              }}
              className={cn(FOOTER_BTN_BASE, "!px-0 min-w-0 shrink-0")}
            />
            <span className="text-xs font-medium">{formatCount(bookmarkCount)}</span>
          </span>
          <span data-dream-action="share" className={cn(FOOTER_ACTION_WRAP, "items-center gap-1.5")}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(FOOTER_BTN_BASE, "!px-0 min-w-0 shrink-0")}
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 shrink-0" />
            </Button>
            <span className="text-xs font-medium">{formatCount(shareCount)}</span>
          </span>
          <span
            data-dream-action="views"
            className={cn(FOOTER_ACTION_WRAP, "items-center gap-1.5 text-xs cursor-default")}
          >
            <Eye className="h-4 w-4 shrink-0" />
            <span>{formatCount(dream.view_count ?? 0)}</span>
          </span>
        </div>
        {dream.is_seeking_interpretation && (
          <Badge
            variant="outline"
            className="text-[10px] py-0.5 px-2 border-violet-400/50 text-violet-600 dark:text-violet-400 dark:border-violet-600/50 bg-violet-500/10 hover:bg-violet-500/20 transition-all duration-200"
          >
            <Search className="h-3 w-3 mr-1" />
            寻求解读
          </Badge>
        )}
      </div>
    </div>
  );
}

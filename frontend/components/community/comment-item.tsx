"use client";

import "@/styles/community.css";
import { CommentInput } from "@/components/community/comment-input";
import { ReportDialog } from "@/components/community/report-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { type CommentResponse } from "@/lib/community-api";
import { communityAPI } from "@/lib/community-api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { zhCN, enUS, ja } from "date-fns/locale";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Maximum nesting depth before stopping indentation */
const MAX_DEPTH = 5;

interface CommentItemProps {
  comment: CommentResponse;
  dreamId: string;
  isDreamOwner?: boolean;
  currentUserId?: string;
  dreamAuthorId?: string;
  onDeleted?: (commentId: string) => void;
  onAdopted?: (commentId: string) => void;
  /** Nesting depth (0 = top-level comment) */
  depth?: number;
}

export function CommentItem({
  comment,
  dreamId,
  isDreamOwner,
  currentUserId,
  dreamAuthorId,
  onDeleted,
  onAdopted,
  depth = 0,
}: CommentItemProps) {
  const [upvoted, setUpvoted] = useState(comment.has_liked);
  const [downvoted, setDownvoted] = useState(comment.has_downvoted ?? false);
  const [upCount, setUpCount] = useState(comment.like_count);
  const [downCount, setDownCount] = useState(comment.downvote_count ?? 0);
  const [showReply, setShowReply] = useState(false);
  const [replies, setReplies] = useState<CommentResponse[]>([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [adopted, setAdopted] = useState(comment.is_adopted);
  const [deleted, setDeleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t, i18n } = useTranslation();

  const isOwner = currentUserId === comment.author?.id;
  const isOriginalPoster = Boolean(dreamAuthorId && comment.author?.id === dreamAuthorId);
  const isReply = depth > 0;
  const hasReplies = (comment.reply_count ?? 0) > 0 || replies.length > 0;

  const loadReplies = useCallback(async () => {
    try {
      const res = await communityAPI.getComments(dreamId, {
        parent_id: comment.id,
        is_interpretation: comment.is_interpretation,
      });
      setReplies(res.items);
      setRepliesLoaded(true);
    } catch {
      setReplies([]);
      setRepliesLoaded(true);
    }
  }, [dreamId, comment.id, comment.is_interpretation]);

  useEffect(() => {
    const hasRepliesToLoad = (comment.reply_count ?? 0) > 0;
    const shouldLoad = (showReply || hasRepliesToLoad) && !repliesLoaded;
    if (shouldLoad) loadReplies();
  }, [showReply, comment.reply_count, repliesLoaded, loadReplies]);

  const handleVote = async (vote: "up" | "down" | null) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await communityAPI.voteComment(comment.id, vote);
      setUpvoted(res.vote === "up");
      setDownvoted(res.vote === "down");
      setUpCount(res.up_count);
      setDownCount(res.down_count);
    } catch {
      toast.error(t("common.operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await communityAPI.deleteComment(comment.id);
      setDeleted(true);
      onDeleted?.(comment.id);
      setDeleteDialogOpen(false);
    } catch {
      toast.error(t("community.comments.deleteFailed"));
    }
  };

  const handleAdopt = async () => {
    if (!confirm(t("community.comments.confirmAdopt"))) return;
    try {
      await communityAPI.adoptInterpretation(comment.id);
      setAdopted(true);
      onAdopted?.(comment.id);
      toast.success(t("community.comments.adoptSuccess"));
    } catch {
      toast.error(t("common.operationFailed"));
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const currentLocale = i18n.language.startsWith("en")
    ? enUS
    : i18n.language.startsWith("ja")
    ? ja
    : zhCN;

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: currentLocale,
  });

  if (deleted) {
    return (
      <div className={cn("comment-tree-node", depth > 0 && "comment-tree-node--reply")} data-depth={depth}>
        <div className="comment-body">
          <div className="comment-main-row">
            <div className="comment-avatar-wrap">
              <UserAvatar
                userId={comment.author?.id ?? "deleted"}
                avatar={comment.author?.avatar}
                username={t("community.comments.deletedUser")}
                size="sm"
              />
            </div>
            <div className="comment-body-content">
              <div className="flex items-center gap-1 flex-wrap mb-1">
                <span className="font-medium text-sm text-muted-foreground">
                  {t("community.comments.deletedComment")}
                </span>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const authorName = comment.is_anonymous
    ? t("community.home.anonymous")
    : comment.author?.username ?? t("common.unknownUser");

  const authorLine = (
    <div className="flex items-center gap-1 flex-wrap mb-1">
      {!comment.is_anonymous && comment.author?.id ? (
        <Link
          href={`/community/users/${comment.author.id}`}
          className="font-medium text-sm text-foreground hover:text-primary hover:underline transition-colors"
        >
          {authorName}
        </Link>
      ) : (
        <span className="font-medium text-sm text-foreground">{authorName}</span>
      )}
      {isOriginalPoster && !comment.is_anonymous && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
          {t("community.comments.originalPoster")}
        </span>
      )}
      <span className="text-muted-foreground text-xs">•</span>
      <span className="text-xs text-muted-foreground">{timeAgo}</span>
      {comment.is_interpretation && (
        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400">
          <Sparkles className="h-3 w-3" />
          {t("community.comments.badges.interpretation")}
        </span>
      )}
      {adopted && (
        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          {t("community.comments.badges.adopted")}
        </span>
      )}
    </div>
  );

  // Collapsed stub - shows when comment is collapsed
  const collapsedStub = (
    <div className="comment-collapsed-stub" onClick={toggleCollapse}>
      <ChevronRight className="h-3 w-3" />
      <span>{authorName}</span>
      <span className="text-muted-foreground">•</span>
      <span>
        {isCollapsed && (comment.reply_count ?? 0) > 0
          ? t("community.comments.replyCount", { count: comment.reply_count ?? 0 })
          : ""}
      </span>
    </div>
  );

  // Comment content area
  const commentContent = (
    <div className="comment-content">
      <div className="comment-main-row">
        {/* Avatar */}
        <div className="comment-avatar-wrap">
          {!comment.is_anonymous && comment.author?.id ? (
            <Link href={`/community/users/${comment.author.id}`} className="inline-flex rounded-full hover:opacity-90 transition-opacity">
              <UserAvatar
                userId={comment.author.id}
                avatar={comment.author?.avatar}
                username={authorName}
                size="sm"
              />
            </Link>
          ) : (
            <UserAvatar
              userId={comment.author?.id ?? "anon"}
              avatar={comment.author?.avatar}
              username={authorName}
              size="sm"
            />
          )}
        </div>

        {/* Body */}
        <div className="comment-body-content">
          {authorLine}

          <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words mb-2 text-gray-700 dark:text-gray-300">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="comment-actions-wrap comment-actions">
            <div className="comment-vote-cluster">
              {hasReplies && (
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="comment-collapse-btn"
                  aria-label={
                    isCollapsed
                      ? t("community.comments.a11y.expandThread")
                      : t("community.comments.a11y.collapseThread")
                  }
                >
                  {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
              <button
                type="button"
                data-comment-action="upvote"
                onClick={() => handleVote(upvoted ? null : "up")}
                className={cn(
                  "comment-action-btn p-1 rounded transition-all duration-200 ease-out hover:scale-110 focus:outline-none",
                  upvoted && "comment-action-upvote-active"
                )}
                aria-label={t("community.comments.a11y.upvote")}
              >
                <ThumbsUp
                  className={cn(
                    "h-4 w-4 transition-all duration-200",
                    upvoted && "fill-current"
                  )}
                />
              </button>
              <span className={cn("min-w-[1rem] text-center text-xs text-foreground/90", (upvoted || downvoted) && "font-medium")}>
                {upCount - downCount}
              </span>
              <button
                type="button"
                data-comment-action="downvote"
                onClick={() => handleVote(downvoted ? null : "down")}
                className={cn(
                  "comment-action-btn p-1 rounded transition-all duration-200 ease-out hover:scale-110 focus:outline-none",
                  downvoted && "comment-action-downvote-active"
                )}
                aria-label={t("community.comments.a11y.downvote")}
              >
                <ThumbsDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    downvoted && "fill-current"
                  )}
                />
              </button>
            </div>
            <button
              type="button"
              data-comment-action="reply"
              onClick={() => setShowReply(!showReply)}
              className="comment-action-btn h-7 px-2.5 text-xs gap-1.5 rounded-md inline-flex items-center justify-center font-medium transition-all duration-200 ease-out hover:scale-105 hover:bg-transparent"
            >
              <MessageCircle className="h-3.5 w-3.5 transition-transform duration-200" />
              {t("community.comments.reply")}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-comment-action="more"
                  className="comment-action-btn h-7 w-7 p-0 rounded-md inline-flex items-center justify-center transition-all duration-200 ease-out hover:scale-110 hover:bg-transparent"
                  aria-label={t("community.comments.a11y.moreActions")}
                >
                  <MoreHorizontal className="h-4 w-4 transition-transform duration-200" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {isOwner && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                )}
                {!isOwner && (
                  <>
                    <DropdownMenuItem onClick={() => setReportOpen(true)}>
                      <Flag className="h-4 w-4 mr-2" />
                      {t("community.report.trigger")}
                    </DropdownMenuItem>
                    <ReportDialog
                      targetType="comment"
                      targetId={comment.id}
                      open={reportOpen}
                      onOpenChange={setReportOpen}
                    />
                  </>
                )}
                {isDreamOwner && comment.is_interpretation && !adopted && (
                  <DropdownMenuItem onClick={handleAdopt} className="text-emerald-600">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t("community.comments.adoptAction")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Reply input */}
          {showReply && (
            <div className="mt-3">
              <CommentInput
                dreamId={dreamId}
                parentId={comment.id}
                compact
                isInterpretationFromParent={comment.is_interpretation}
                onSuccess={() => {
                  loadReplies();
                  setShowReply(false);
                }}
                onCancel={() => setShowReply(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Nested replies with thread line
  const repliesSection = !isCollapsed && replies.length > 0 && (
    <div className="comment-replies">
      {replies.map((r) => (
        <CommentItem
          key={r.id}
          comment={r}
          dreamId={dreamId}
          isDreamOwner={isDreamOwner}
          currentUserId={currentUserId}
          dreamAuthorId={dreamAuthorId}
          onDeleted={(id) => setReplies((prev) => prev.filter((c) => c.id !== id))}
          onAdopted={onAdopted}
          depth={Math.min(depth + 1, MAX_DEPTH)}
        />
      ))}
    </div>
  );

  return (
    <div
      className={cn(
        "comment-tree-node",
        isReply && "comment-tree-node--reply",
        isCollapsed && "comment-tree-node--collapsed",
        hasReplies && "comment-tree-node--has-replies"
      )}
      data-depth={depth}
      data-testid={isReply ? "comment-thread" : undefined}
    >
      {/* Main content */}
      <div className="comment-body">
        {isCollapsed ? collapsedStub : commentContent}
      </div>

      {/* Nested replies */}
      {repliesSection}

      {/* Delete confirm dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[360px] rounded-xl border border-border/70 bg-background p-0 overflow-hidden shadow-xl">
          <div className="p-5">
              <AlertDialogHeader className="space-y-1.5 text-left pr-8">
                <AlertDialogTitle className="text-xl leading-tight font-semibold text-foreground">
                  {t("community.comments.deleteDialog.title")}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-6 text-muted-foreground font-normal">
                  {t("community.comments.deleteDialog.description")}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-5 flex-row justify-end gap-2">
              <AlertDialogCancel className="m-0 h-9 px-4 rounded-lg border border-border bg-muted/50 text-foreground hover:bg-muted text-sm font-medium">
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="h-9 px-4 rounded-lg border-0 bg-rose-600 text-white hover:bg-rose-700 text-sm font-medium"
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

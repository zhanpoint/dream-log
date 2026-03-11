"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { CommentInput } from "@/components/community/comment-input";
import { CommentItem } from "@/components/community/comment-item";
import { communityAPI, type CommentResponse } from "@/lib/community-api";
import { Brain, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface CommentSectionProps {
  dreamId: string;
  isDreamOwner?: boolean;
  currentUserId?: string;
  /** 梦境作者 ID，用于在评论旁显示「原始发帖人」标识 */
  dreamAuthorId?: string;
  /** 梦境上的评论总数（与列表卡片一致），用于 Tab 显示；不传则用接口返回的 total */
  initialCommentCount?: number;
  /** 梦境上的解读总数（与列表卡片一致），用于 Tab 显示；不传则用接口返回的 total */
  initialInterpretationCount?: number;
  defaultTab?: "interpretations" | "comments";
}

export function CommentSection({
  dreamId,
  isDreamOwner,
  currentUserId,
  dreamAuthorId,
  initialCommentCount,
  initialInterpretationCount,
  defaultTab = "interpretations",
}: CommentSectionProps) {
  const [tab, setTab] = useState<"interpretations" | "comments">(defaultTab);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [interpretations, setInterpretations] = useState<CommentResponse[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingInterps, setLoadingInterps] = useState(true);
  // 由父组件传入的 initialCommentCount/initialInterpretationCount 已是最终显示口径
  const commentOnlyCount = initialCommentCount;
  const interpretationOnlyCount = initialInterpretationCount;
  const [totalComments, setTotalComments] = useState(commentOnlyCount ?? 0);
  const [totalInterps, setTotalInterps] = useState(interpretationOnlyCount ?? 0);
  const { t } = useTranslation();

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const res = await communityAPI.getComments(dreamId, { is_interpretation: false });
      setComments(res.items);
      if (commentOnlyCount === undefined) setTotalComments(res.total);
    } finally {
      setLoadingComments(false);
    }
  }, [dreamId, commentOnlyCount]);

  const fetchInterpretations = useCallback(async () => {
    setLoadingInterps(true);
    try {
      const res = await communityAPI.getComments(dreamId, { is_interpretation: true });
      setInterpretations(res.items);
      if (interpretationOnlyCount === undefined) setTotalInterps(res.total);
    } finally {
      setLoadingInterps(false);
    }
  }, [dreamId, interpretationOnlyCount]);

  useEffect(() => {
    fetchComments();
    fetchInterpretations();
  }, [fetchComments, fetchInterpretations]);

  useEffect(() => {
    if (commentOnlyCount !== undefined) setTotalComments(commentOnlyCount);
    if (interpretationOnlyCount !== undefined) setTotalInterps(interpretationOnlyCount);
  }, [commentOnlyCount, interpretationOnlyCount]);

  const handleCommentDeleted = (_id: string) => {
    setTotalComments((n) => Math.max(0, n - 1));
  };

  const handleInterpDeleted = (_id: string) => {
    setTotalInterps((n) => Math.max(0, n - 1));
  };

  const handleAdopted = (id: string) => {
    setInterpretations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_adopted: true } : c))
    );
  };

  const isLoading = tab === "comments" ? loadingComments : loadingInterps;
  const items = tab === "comments" ? comments : interpretations;

  return (
    <div className="space-y-4">
      {/* Tab header：紧凑无灰底，悬浮动效 */}
      <div className="border-b border-border pb-3">
        <div className="inline-flex gap-0.5 rounded-lg border border-gray-300 dark:border-white/30 p-0.5">
          <button
            onClick={() => setTab("interpretations")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ease-out ${
              tab === "interpretations"
                ? "bg-violet-300 text-violet-900 shadow-sm dark:bg-violet-400/90 dark:text-white hover:brightness-110 hover:scale-[1.03] active:scale-[0.98]"
                : "text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:scale-[1.05] active:scale-[0.98]"
            }`}
          >
            <Brain className="h-3.5 w-3.5 shrink-0" />
            <span>{t("community.comments.tabs.interpretations")}</span>
            <span className="tabular-nums opacity-80">({totalInterps})</span>
          </button>
          <button
            onClick={() => setTab("comments")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ease-out ${
              tab === "comments"
                ? "bg-violet-300 text-violet-900 shadow-sm dark:bg-violet-400/90 dark:text-white hover:brightness-110 hover:scale-[1.03] active:scale-[0.98]"
                : "text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:scale-[1.05] active:scale-[0.98]"
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{t("community.comments.tabs.comments")}</span>
            <span className="tabular-nums opacity-80">({totalComments})</span>
          </button>
        </div>
      </div>

      {/* Input */}
      <CommentInput
        dreamId={dreamId}
        isInterpretationFromParent={tab === "interpretations"}
        onSuccess={() => {
          if (tab === "interpretations") {
            setTotalInterps((n) => n + 1);
            fetchInterpretations();
          } else {
            setTotalComments((n) => n + 1);
            fetchComments();
          }
        }}
      />

      {/* List：树形评论区，顶级评论间距稍大便于区分 */}
      <div className="space-y-5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm">
              {tab === "interpretations"
                ? t("community.comments.emptyInterpretations")
                : t("community.comments.emptyComments")}
            </p>
          </div>
        ) : (
          items.map((item) =>
            tab === "comments" ? (
              <CommentItem
                key={item.id}
                comment={item}
                dreamId={dreamId}
                isDreamOwner={isDreamOwner}
                currentUserId={currentUserId}
                dreamAuthorId={dreamAuthorId}
                onDeleted={handleCommentDeleted}
                onAdopted={handleAdopted}
              />
            ) : (
              <CommentItem
                key={item.id}
                comment={item}
                dreamId={dreamId}
                isDreamOwner={isDreamOwner}
                currentUserId={currentUserId}
                dreamAuthorId={dreamAuthorId}
                onDeleted={handleInterpDeleted}
                onAdopted={handleAdopted}
              />
            )
          )
        )}
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { communityAPI } from "@/lib/community-api";
import { Brain, MessageCircle, Send } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const COMMENT_TEXTAREA_MIN_H = 64;
const COMMENT_TEXTAREA_MAX_H = 320;
const COMMENT_TEXTAREA_DEFAULT_H = 88;

interface CommentInputProps {
  dreamId: string;
  /** 由父组件（如顶部 Tab）决定发布类型时传入，不传则使用内部切换按钮 */
  isInterpretationFromParent?: boolean;
  defaultInterpretation?: boolean;
  parentId?: string;
  placeholder?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function CommentInput({
  dreamId,
  isInterpretationFromParent,
  defaultInterpretation = false,
  parentId,
  placeholder,
  onSuccess,
  onCancel,
  compact = false,
}: CommentInputProps) {
  const [content, setContent] = useState("");
  const [isInterpretationLocal, setIsInterpretationLocal] = useState(defaultInterpretation);
  const [loading, setLoading] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(COMMENT_TEXTAREA_DEFAULT_H);
  const isInterpretation = isInterpretationFromParent ?? isInterpretationLocal;
  const { t } = useTranslation();

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = textareaHeight;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.min(
        COMMENT_TEXTAREA_MAX_H,
        Math.max(COMMENT_TEXTAREA_MIN_H, startHeight + delta)
      );
      setTextareaHeight(newHeight);
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [textareaHeight]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error(t("community.comments.validation.empty"));
      return;
    }
    setLoading(true);
    try {
      await communityAPI.createComment(dreamId, {
        content: trimmed,
        is_interpretation: isInterpretation,
        parent_id: parentId,
      });
      setContent("");
      onSuccess?.();
    } catch {
      toast.error(t("community.comments.submitFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {compact ? (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            placeholder ??
            (isInterpretation
              ? t("community.comments.placeholder.interpretation")
              : t("community.comments.placeholder.comment"))
          }
          rows={2}
          className="resize-none text-sm focus-visible:ring-1 focus-visible:ring-offset-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
        />
      ) : (
        <div
          className="group relative flex flex-col rounded-lg border border-input bg-background focus-within:border-violet-500/60 dark:focus-within:border-violet-400/50 focus-within:ring-1 focus-within:ring-violet-500/30 dark:focus-within:ring-violet-400/30 focus-within:ring-offset-0 transition-shadow"
          style={{ height: `${textareaHeight}px` }}
        >
          <div
            className={`flex-1 min-h-0 rounded-t-lg ${
              textareaHeight <= COMMENT_TEXTAREA_MIN_H ? "overflow-hidden" : "overflow-y-auto"
            }`}
          >
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                placeholder ??
                (isInterpretation
                  ? t("community.comments.placeholder.interpretation")
                  : t("community.comments.placeholder.comment"))
              }
              className="resize-none text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none p-3 pr-8 w-full min-h-full rounded-t-lg"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
          />
          </div>
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute bottom-0 right-0 w-6 h-6 cursor-ns-resize opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-60"
            style={{
              background:
                "linear-gradient(135deg, transparent 50%, rgba(139, 92, 246, 0.45) 50%)",
              borderRadius: "0 0 6px 0",
            }}
            title={t("community.comments.resizeHint")}
          />
        </div>
      )}
      <div className="flex items-center justify-between">
        {!parentId && isInterpretationFromParent === undefined && (
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setIsInterpretationLocal(false)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all duration-200 ease-out ${
                !isInterpretationLocal
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <MessageCircle className="h-3 w-3" />
              {t("community.comments.tabs.comments")}
            </button>
            <button
              onClick={() => setIsInterpretationLocal(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all duration-200 ease-out ${
                isInterpretationLocal
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Brain className="h-3 w-3" />
              {t("community.comments.tabs.interpretations")}
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={loading}
              className="text-foreground dark:text-zinc-100 border border-zinc-300/90 dark:border-zinc-500/90 bg-background dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground dark:hover:text-zinc-100 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] hover:shadow-sm dark:hover:shadow-zinc-900/40"
            >
              {t("common.cancel")}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            className={
              isInterpretation
                ? "bg-violet-600 hover:bg-violet-700 text-white transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] hover:shadow-md"
                : "transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
            }
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {loading ? t("community.comments.submitting") : t("community.comments.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}

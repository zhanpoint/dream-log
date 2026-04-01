"use client";

import { Button } from "@/components/ui/button";
import { communityAPI } from "@/lib/community-api";
import { cn } from "@/lib/utils";
import { Bookmark } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface BookmarkButtonProps {
  dreamId: string;
  initialBookmarked: boolean;
  size?: "sm" | "default";
  className?: string;
  onToggle?: (bookmarked: boolean) => void;
}

export function BookmarkButton({
  dreamId,
  initialBookmarked,
  size = "sm",
  className,
  onToggle,
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    const prev = bookmarked;
    setBookmarked(!prev);
    try {
      const res = await communityAPI.toggleBookmark(dreamId);
      setBookmarked(res.bookmarked);
      onToggle?.(res.bookmarked);
      toast.success(res.bookmarked ? t("community.bookmark.added") : t("community.bookmark.removed"));
    } catch {
      setBookmarked(prev);
      toast.error(t("community.bookmark.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      className={cn(
        "gap-1.5 transition-colors duration-300",
        bookmarked
          ? "text-amber-500 hover:text-amber-600 hover:!bg-transparent dark:hover:!bg-transparent"
          : "text-muted-foreground hover:text-amber-500",
        className
      )}
      onClick={handleToggle}
      disabled={loading}
      title={bookmarked ? t("community.bookmark.remove") : t("community.bookmark.add")}
    >
      <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
    </Button>
  );
}

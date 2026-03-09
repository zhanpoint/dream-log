"use client";

import { Button } from "@/components/ui/button";
import { communityAPI } from "@/lib/community-api";
import { cn, formatCount } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ResonanceButtonProps {
  dreamId: string;
  initialCount: number;
  initialResonated: boolean;
  size?: "sm" | "default";
  className?: string;
  onToggle?: (resonated: boolean, count: number) => void;
}

export function ResonanceButton({
  dreamId,
  initialCount,
  initialResonated,
  size = "sm",
  className,
  onToggle,
}: ResonanceButtonProps) {
  const [resonated, setResonated] = useState(initialResonated);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    const prev = resonated;
    const prevCount = count;
    // Optimistic update
    setResonated(!prev);
    setCount(prev ? prevCount - 1 : prevCount + 1);
    try {
      const res = await communityAPI.toggleResonate(dreamId);
      setResonated(res.resonated);
      setCount(res.resonance_count);
      onToggle?.(res.resonated, res.resonance_count);
    } catch {
      setResonated(prev);
      setCount(prevCount);
      toast.error("操作失败，请稍后重试");
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
        resonated
          ? "text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:!bg-transparent dark:hover:!bg-transparent"
          : "text-muted-foreground",
        className
      )}
      onClick={handleToggle}
      disabled={loading}
    >
      <Heart
        className={cn("h-4 w-4 transition-transform", resonated && "fill-current scale-110")}
      />
      <span className="text-xs font-medium">{formatCount(count)}</span>
    </Button>
  );
}

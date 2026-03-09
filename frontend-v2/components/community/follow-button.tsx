"use client";

import { Button } from "@/components/ui/button";
import { communityAPI } from "@/lib/community-api";
import { cn } from "@/lib/utils";
import { UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface FollowButtonProps {
  userId: string;
  initialFollowing: boolean;
  className?: string;
  onToggle?: (following: boolean) => void;
}

export function FollowButton({
  userId,
  initialFollowing,
  className,
  onToggle,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    const prev = following;
    setFollowing(!prev);
    try {
      const res = await communityAPI.toggleFollow(userId);
      setFollowing(res.following);
      onToggle?.(res.following);
    } catch {
      setFollowing(prev);
      toast.error("操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={following ? "outline" : "default"}
      size="sm"
      className={cn(
        "gap-1.5 min-w-[80px] h-8 px-3 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02]",
        following
          ? "text-foreground hover:text-foreground dark:text-slate-200 dark:hover:text-white hover:bg-accent/70 dark:hover:bg-white/10"
          : "",
        className
      )}
      onClick={handleToggle}
      disabled={loading}
    >
      {following ? (
        <>
          <UserCheck className="h-4 w-4" />
          已关注
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          关注
        </>
      )}
    </Button>
  );
}

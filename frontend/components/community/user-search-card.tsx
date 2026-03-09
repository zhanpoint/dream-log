"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DreamerLevelBadge } from "@/components/community/dreamer-level-badge";
import { communityAPI, type UserSearchResult } from "@/lib/community-api";
import { AuthUser } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
import { toast } from "sonner";

interface UserSearchCardProps {
  user: UserSearchResult;
  /** 关键词，用于高亮用户名 */
  highlight?: string;
  className?: string;
}

function highlight(text: string | null, keyword: string): React.ReactNode {
  if (!text || !keyword) return text ?? "用户";
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded px-0.5">{text.slice(idx, idx + keyword.length)}</mark>
      {text.slice(idx + keyword.length)}
    </>
  );
}

export function UserSearchCard({ user, highlight: kw = "", className }: UserSearchCardProps) {
  const currentUser = AuthUser.get();
  const [isFollowing, setIsFollowing] = useState(user.is_following);
  const [followerCount, setFollowerCount] = useState(user.follower_count);
  const [pending, setPending] = useState(false);

  const isSelf = currentUser?.id === user.id;

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error("请先登录");
      return;
    }
    setPending(true);
    try {
      const res = await communityAPI.toggleFollow(user.id);
      setIsFollowing(res.following);
      setFollowerCount(res.follower_count);
    } catch {
      toast.error("操作失败");
    } finally {
      setPending(false);
    }
  };

  return (
    <Link
      href={`/community/users/${user.id}`}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl bg-card border border-border",
        "hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-200",
        className
      )}
    >
      {/* Avatar */}
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-violet-500/30 flex items-center justify-center text-sm font-bold flex-shrink-0">
        {user.username?.[0]?.toUpperCase() ?? "?"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold truncate">
            {highlight(user.username, kw)}
          </span>
          {user.dreamer_level > 0 && (
            <DreamerLevelBadge level={user.dreamer_level} size="xs" />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {followerCount.toLocaleString()} 粉丝
          </span>
          {user.dreamer_title && (
            <span className="truncate">{user.dreamer_title}</span>
          )}
        </div>
        {user.bio && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{user.bio}</p>
        )}
      </div>

      {/* Follow button */}
      {!isSelf && currentUser && (
        <Button
          variant={isFollowing ? "outline" : "default"}
          size="sm"
          onClick={handleFollow}
          disabled={pending}
          className="flex-shrink-0 h-8 text-xs px-3"
        >
          {isFollowing ? "已关注" : "关注"}
        </Button>
      )}
    </Link>
  );
}

"use client";

import { useState, useEffect } from "react";
import { getDefaultAvatar, cn } from "@/lib/utils";

interface UserAvatarProps {
  userId: string;
  avatar?: string | null;
  username?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
};

export function UserAvatar({
  userId,
  avatar,
  username,
  size = "md",
  className,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const defaultAvatar = getDefaultAvatar(userId);
  const avatarUrl = avatar && !imgError ? avatar : defaultAvatar;

  // 当 avatar prop 改变时，重置错误状态
  useEffect(() => {
    setImgError(false);
  }, [avatar]);

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-muted",
        sizeClasses[size],
        className
      )}
    >
      <img
        src={avatarUrl}
        alt={username || "User avatar"}
        className="h-full w-full object-cover"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

"use client";

import { DreamCardSocialComponent } from "@/components/community/dream-card-social";
import { FollowButton } from "@/components/community/follow-button";
import { DreamerLevelBadge, InspirationPointsBadge } from "@/components/community/dreamer-level-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { communityAPI, type DreamCardSocial, type UserPublicProfile } from "@/lib/community-api";
import { AuthToken, AuthUser } from "@/lib/auth-api";
import { ArrowLeft, Brain, ChevronRight, Loader2, MessageSquare, Moon, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const profileCache = new Map<string, UserPublicProfile>();
const dreamsCache = new Map<string, { items: DreamCardSocial[]; total: number; page: number }>();

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function UserPublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = AuthUser.get();
  const isSelf = currentUser?.id === id;

  const cachedProfile = profileCache.get(id) ?? null;
  const cachedDreams = dreamsCache.get(id) ?? null;

  const [profile, setProfile] = useState<UserPublicProfile | null>(cachedProfile);
  const [dreams, setDreams] = useState<DreamCardSocial[]>(cachedDreams?.items ?? []);
  const [page, setPage] = useState(cachedDreams?.page ?? 1);
  const [total, setTotal] = useState(cachedDreams?.total ?? 0);

  const [loadingProfile, setLoadingProfile] = useState(!cachedProfile);
  const [loadingDreams, setLoadingDreams] = useState(!cachedDreams);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 9;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileCache.has(id)) {
        setLoadingProfile(true);
      }
      try {
        const p = await communityAPI.getUserProfile(id);
        setProfile(p);
        profileCache.set(id, p);
      } catch {
        if (!profileCache.has(id)) {
          toast.error("加载用户主页失败");
        }
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [id]);

  const fetchDreams = useCallback(
    async (p: number, replace = false) => {
      if (p === 1 && !dreamsCache.has(id)) setLoadingDreams(true);
      else if (p > 1) setLoadingMore(true);
      try {
        const res = await communityAPI.getUserDreams(id, p, PAGE_SIZE);
        setTotal(res.total);
        setDreams((prev) => {
          const next = replace || p === 1 ? res.items : [...prev, ...res.items];
          dreamsCache.set(id, { items: next, total: res.total, page: p });
          return next;
        });
        setPage(p);
      } finally {
        setLoadingDreams(false);
        setLoadingMore(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchDreams(1, true);
  }, [fetchDreams]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchDreams(1, true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchDreams]);

  const hasMore = dreams.length < total;

  const handleSendMessage = () => {
    if (!AuthToken.get()) {
      router.push("/auth");
      return;
    }
    router.push(`/community/messages?knock=${id}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back */}
      <Link href="/community" className="group inline-flex mb-5">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 gap-1.5 text-sm font-medium text-foreground/90 hover:text-foreground hover:bg-transparent transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span className="transition-transform duration-200 group-hover:-translate-y-px">返回社区</span>
        </Button>
      </Link>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        {loadingProfile ? (
          <ProfileSkeleton />
        ) : profile ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <UserAvatar
                  userId={profile.id}
                  avatar={profile.avatar}
                  username={profile.username}
                  size="lg"
                />
                <div>
                  <h1 className="text-xl font-bold">{profile.username ?? "匿名做梦者"}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <DreamerLevelBadge
                      level={profile.dreamer_level}
                      showTitle
                      size="sm"
                    />
                    <InspirationPointsBadge points={profile.inspiration_points} size="sm" />
                  </div>
                  {profile.bio && (
                    <p className="text-sm text-muted-foreground mt-2 max-w-md">{profile.bio}</p>
                  )}
                </div>
              </div>
              {!isSelf && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 px-3 text-foreground hover:text-foreground dark:hover:text-foreground hover:bg-accent/70 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] [&_svg]:text-current"
                    onClick={handleSendMessage}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    发私信
                  </Button>
                  <FollowButton
                    userId={profile.id}
                    initialFollowing={profile.is_following}
                    onToggle={(following) => {
                      setProfile((p) =>
                        p
                          ? {
                              ...p,
                              is_following: following,
                              follower_count: following
                                ? p.follower_count + 1
                                : p.follower_count - 1,
                            }
                          : p
                      );
                    }}
                  />
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {[
                { label: "梦境", value: profile.public_dream_count, icon: Moon },
                { label: "解读", value: profile.interpretation_count, icon: Brain },
                { label: "粉丝", value: profile.follower_count, icon: Users },
                { label: "关注", value: profile.following_count, icon: Users },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="text-center rounded-xl py-3 px-2"
                >
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">用户不存在</div>
        )}
      </div>

      {/* Dreams grid */}
      <div>
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Moon className="h-4 w-4 text-primary" />
          公开梦境
          {total > 0 && <span className="text-xs text-muted-foreground">({total})</span>}
        </h2>

        {loadingDreams ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : dreams.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <p className="text-3xl mb-3">🌙</p>
            <p className="text-sm">还没有公开的梦境</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              {dreams.map((dream) => (
                <DreamCardSocialComponent key={dream.id} dream={dream} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => fetchDreams(page + 1)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2" />
                  )}
                  加载更多
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

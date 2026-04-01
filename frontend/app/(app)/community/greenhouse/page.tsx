"use client";

import { communityAPI, type CommunityResponse } from "@/lib/community-api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GreenhouseShell } from "@/components/community/greenhouse-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  BookOpen,
  CheckCircle2,
  MoonStar,
  Skull,
  BrainCircuit,
  Sparkles,
  HeartHandshake,
  Orbit,
  Stars,
  Compass,
  Film,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const hiddenCommunitySlugs = new Set(["flying-dreams", "dream-cinema-universe"]);

const hiddenCommunityNameKeys = new Set([
  "community.greenhouse.hidden.flying",
  "community.greenhouse.hidden.cinema",
]);

function CommunityCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

function CommunityCard({ community, onJoinToggle }: { community: CommunityResponse; onJoinToggle: (slug: string) => void }) {
  const { t } = useTranslation();
  const [joining, setJoining] = useState(false);
  const isSynthetic = community.id.startsWith("synthetic-");

  const getCommunityIcon = (slug: string) => {
    const iconClass = "w-[22px] h-[22px] text-emerald-600 dark:text-emerald-300";
    const iconBySlug: Record<string, ReactNode> = {
      lucid_dreaming: <MoonStar className={iconClass} />,
      nightmare_support: <Skull className={iconClass} />,
      "nightmare-support": <Skull className={iconClass} />,
      symbolism_lab: <BrainCircuit className={iconClass} />,
      beginner_corner: <Sparkles className={iconClass} />,
      emotional_healing: <HeartHandshake className={iconClass} />,
      exploration_club: <Compass className={iconClass} />,
      "serial-dreams": <Film className={iconClass} />,
      "fun-dreams-share": <Stars className={iconClass} />,
      "parallel-world-dreams": <Orbit className={iconClass} />,
    };

    return iconBySlug[slug] ?? <MoonStar className={iconClass} />;
  };

  const handleJoin = async (e: MouseEvent) => {
    e.preventDefault();
    if (isSynthetic) {
      toast.info(t("community.greenhouse.list.comingSoon"));
      return;
    }
    setJoining(true);
    try {
      await onJoinToggle(community.slug);
    } finally {
      setJoining(false);
    }
  };

  return (
    <Link
      href={`/community/greenhouse/${community.slug}`}
      className="group block bg-card border border-emerald-400/35 dark:border-emerald-300/45 ring-1 ring-emerald-500/15 dark:ring-emerald-300/20 rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300/55 dark:hover:border-emerald-200/70 hover:ring-emerald-400/30 dark:hover:ring-emerald-200/35 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/12"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105">
          {getCommunityIcon(community.slug)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[15px] leading-5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {community.name}
              </h3>
              {community.is_official && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  {t("community.greenhouse.list.officialBadge")}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant={community.is_member ? "outline" : "default"}
              className={`flex-shrink-0 transition-all ${
                community.is_member
                  ? "border border-emerald-500/70 bg-transparent text-emerald-500 hover:bg-emerald-50/60 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
              }`}
              onClick={handleJoin}
              disabled={joining}
            >
              {joining
                ? "..."
                : community.is_member
                  ? t("community.greenhouse.common.joined")
                  : t("community.greenhouse.common.join")}
            </Button>
          </div>

          {community.description && (
            <p className="text-[13px] leading-5 text-muted-foreground mt-1.5 line-clamp-2">{community.description}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {community.member_count.toLocaleString()} {t("community.greenhouse.common.members")}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {community.post_count.toLocaleString()} {t("community.greenhouse.common.dreams")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function GreenhousePage() {
  const { t } = useTranslation();
  const [communities, setCommunities] = useState<CommunityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", motivation: "" });
  const [search, setSearch] = useState("");

  const hiddenCommunityNames = useMemo(
    () => new Set(Array.from(hiddenCommunityNameKeys).map((key) => t(key))),
    [t]
  );

  useEffect(() => {
    communityAPI.getCommunities()
      .then((res) => setCommunities(res.items))
      .catch(() => toast.error("加载社群失败"))
      .finally(() => setLoading(false));
  }, []);

  const handleJoinToggle = async (slug: string) => {
    try {
      const res = await communityAPI.joinCommunity(slug);
      setCommunities((prev) =>
        prev.map((c) =>
          c.slug === slug
            ? { ...c, is_member: res.joined, member_count: res.member_count }
            : c
        )
      );
      toast.success(res.joined ? "已成功加入社群！" : "已退出社群");
    } catch {
      toast.error("操作失败，请稍后重试");
    }
  };

  const handleCreateCommunity = async () => {
    const name = form.name.trim();
    const description = form.description.trim();
    const motivation = form.motivation.trim();

    if (!name) {
      toast.error("请填写社群名称");
      return;
    }
    if (description.length < 10 || description.length > 200) {
      toast.error("社群简介需为 10-200 字");
      return;
    }
    if (motivation.length < 10 || motivation.length > 300) {
      toast.error("创建动机需为 10-300 字");
      return;
    }

    setSubmitting(true);
    try {
      await communityAPI.createCommunityApplication({ name, description, motivation });
      toast.success("已收到你的申请，我们会尽快审核并通知你结果");
      setShowCreateModal(false);
      setForm({ name: "", description: "", motivation: "" });
    } catch {
      toast.error("提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const displayCommunities = useMemo(() => {
    const base = communities
      .filter((c) => !hiddenCommunitySlugs.has(c.slug) && !hiddenCommunityNames.has(c.name))
      .map((c) => c);

    const hasFunDreams = base.some((c) => c.slug === "fun-dreams-share");
    const hasParallelWorld = base.some((c) => c.slug === "parallel-world-dreams");

    const synthetic: CommunityResponse[] = [];

    if (!hasFunDreams) {
      synthetic.push({
        id: "synthetic-fun-dreams-share",
        name: "Fun Dream Gathering",
        slug: "fun-dreams-share",
        description:
          "Share absurd, funny, and unbelievable dreams and enjoy lighthearted dream moments.",
        icon: "🎉",
        cover_image: null,
        member_count: 0,
        post_count: 0,
        is_official: true,
        sort_order: 998,
        created_at: new Date(0).toISOString(),
        is_member: false,
        is_public: true,
      });
    }

    if (!hasParallelWorld) {
      synthetic.push({
        id: "synthetic-parallel-world-dreams",
        name: "Parallel World Dreams",
        slug: "parallel-world-dreams",
        description:
          "Dreamed of another world or another life? Record and discuss parallel-universe dreams together.",
        icon: "🪐",
        cover_image: null,
        member_count: 0,
        post_count: 0,
        is_official: true,
        sort_order: 999,
        created_at: new Date(0).toISOString(),
        is_member: false,
        is_public: true,
      });
    }

    const allCommunities = [...base, ...synthetic].sort((a, b) => a.sort_order - b.sort_order);
    const term = search.trim().toLowerCase();
    if (!term) {
      return allCommunities;
    }

    return allCommunities.filter((community) => {
      const name = community.name.toLowerCase();
      const slug = community.slug.toLowerCase();
      return name.includes(term) || slug.includes(term);
    });
  }, [communities, search, hiddenCommunityNames]);

  return (
    <GreenhouseShell
      searchValue={search}
      onSearchChange={setSearch}
      onCreateCommunity={() => setShowCreateModal(true)}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="text-xl font-bold">
            {t("community.greenhouse.list.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("community.greenhouse.list.subtitle")}
          </p>
        </div>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("community.greenhouse.list.createTitle")}</DialogTitle>
            <DialogDescription>{t("community.greenhouse.list.createDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={t("community.greenhouse.list.namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={100}
            />
            <div className="relative">
              <Textarea
                placeholder={t("community.greenhouse.list.descriptionPlaceholder")}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                maxLength={200}
                className="min-h-24 pr-14 pb-6 focus-visible:border-emerald-500 dark:focus-visible:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-muted-foreground">
                {form.description.length}/200
              </span>
            </div>

            <div className="relative">
              <Textarea
                placeholder={t("community.greenhouse.list.motivationPlaceholder")}
                value={form.motivation}
                onChange={(e) => setForm((f) => ({ ...f, motivation: e.target.value }))}
                maxLength={300}
                className="min-h-28 pr-14 pb-6 focus-visible:border-emerald-500 dark:focus-visible:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-muted-foreground">
                {form.motivation.length}/300
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="text-foreground dark:text-foreground hover:text-foreground dark:hover:text-foreground hover:bg-muted/70 dark:hover:bg-muted/30 transition-all duration-200 hover:scale-[1.02]"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleCreateCommunity}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200 hover:scale-[1.02]"
              >
                {submitting ? t("common.loading") : t("community.greenhouse.list.submitRequest")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Community list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <CommunityCardSkeleton key={i} />)
          : displayCommunities.length === 0
          ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-5xl mb-4">🌿</div>
              <p className="font-medium">{t("community.greenhouse.list.emptyTitle")}</p>
              <p className="text-sm mt-1">{t("community.greenhouse.list.emptyDescription")}</p>
            </div>
          )
          : displayCommunities.map((c) => (
              <CommunityCard key={c.id} community={c} onJoinToggle={handleJoinToggle} />
            ))
        }
      </div>
    </GreenhouseShell>
  );
}

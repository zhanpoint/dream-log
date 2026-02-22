"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DREAM_TYPE_ICON_MAP,
  DREAM_TYPE_LABEL_MAP,
  EMOTION_COLOR_MAP,
  EMOTION_EMOJI_MAP,
} from "@/lib/constants";
import {
  DreamApi,
  type DreamListItem,
  type DreamListParams,
} from "@/lib/dream-api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Calendar,
  Heart,
  Loader2,
  Moon,
  Plus,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function MyDreamsPage() {
  const [dreams, setDreams] = useState<DreamListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("dream_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  const pageSize = 12;

  const fetchDreams = useCallback(async () => {
    setLoading(true);
    try {
      const params: DreamListParams = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
        search: search.trim() || undefined,
        is_favorite: favoriteOnly || undefined,
      };
      const res = await DreamApi.list(params);
      setDreams(res.items);
      setTotal(res.total);
    } catch {
      toast.error("加载梦境列表失败");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, search, favoriteOnly]);

  useEffect(() => {
    fetchDreams();
  }, [fetchDreams]);

  // 搜索防抖
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleFavorite = async (
    e: React.MouseEvent,
    dreamId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await DreamApi.toggleFavorite(dreamId);
      setDreams((prev) =>
        prev.map((d) =>
          d.id === dreamId ? { ...d, is_favorite: res.is_favorite } : d,
        ),
      );
    } catch {
      toast.error("操作失败");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen">
      {/* 顶部统计区 */}
      <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">我的梦境</h1>
              <p className="text-muted-foreground mt-1">
                共记录了 {total} 个梦境
              </p>
            </div>
            <Link href="/dreams/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                记录新梦境
              </Button>
            </Link>
          </div>

          {/* 快速统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <Moon className="w-8 h-8 text-primary/60" />
                <div>
                  <p className="text-2xl font-bold">{total}</p>
                  <p className="text-xs text-muted-foreground">全部梦境</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <Star className="w-8 h-8 text-amber-500/60" />
                <div>
                  <p className="text-2xl font-bold">
                    {dreams.filter((d) => d.is_favorite).length}
                  </p>
                  <p className="text-xs text-muted-foreground">收藏梦境</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-primary/60" />
                <div>
                  <p className="text-2xl font-bold">
                    {dreams.filter((d) => d.ai_processed).length}
                  </p>
                  <p className="text-xs text-muted-foreground">AI 已分析</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <Heart className="w-8 h-8 text-rose-500/60" />
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(dreams.map((d) => d.primary_emotion).filter(Boolean)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">情绪种类</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 搜索与过滤栏 */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索梦境内容..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={`${sortBy}_${sortOrder}`}
              onValueChange={(v) => {
                const [by, order] = v.split("_");
                setSortBy(by);
                setSortOrder(order);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dream_date_desc">最新优先</SelectItem>
                <SelectItem value="dream_date_asc">最早优先</SelectItem>
                <SelectItem value="created_at_desc">最近创建</SelectItem>
                <SelectItem value="vividness_level_desc">清晰度</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={favoriteOnly ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFavoriteOnly(!favoriteOnly);
                setPage(1);
              }}
              className="gap-1.5"
            >
              <Star className="w-3.5 h-3.5" />
              收藏
            </Button>
          </div>
        </div>
      </div>

      {/* 梦境卡片网格 */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="break-inside-avoid">
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dreams.length === 0 ? (
          <div className="text-center py-20">
            <Moon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">还没有梦境记录</h3>
            <p className="text-muted-foreground mb-6">
              开始记录你的第一个梦境吧
            </p>
            <Link href="/dreams/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                记录新梦境
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {dreams.map((dream) => (
                <DreamCard
                  key={dream.id}
                  dream={dream}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一页
                </Button>
                <span className="text-sm text-muted-foreground px-3">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===== 梦境卡片组件 =====

function DreamCard({
  dream,
  onToggleFavorite,
}: {
  dream: DreamListItem;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
}) {
  const borderColor =
    EMOTION_COLOR_MAP[dream.primary_emotion ?? ""] ?? "var(--border)";

  return (
    <Link href={`/dreams/${dream.id}`}>
      <Card
        className="group break-inside-avoid overflow-hidden hover:shadow-2xl transition-all duration-300 border-l-4 hover:border-l-8 cursor-pointer"
        style={{ borderLeftColor: borderColor }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
                {dream.title || "无标题梦境"}
              </CardTitle>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(dream.dream_date), "M月d日", {
                    locale: zhCN,
                  })}
                </span>
                {dream.title_generated_by_ai && (
                  <span className="flex items-center gap-1 text-primary">
                    <Sparkles className="w-3 h-3" />
                    AI
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                dream.is_favorite && "opacity-100",
              )}
              onClick={(e) => onToggleFavorite(e, dream.id)}
            >
              <Star
                className={cn(
                  "w-4 h-4",
                  dream.is_favorite && "fill-amber-400 text-amber-400",
                )}
              />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <p className="text-sm line-clamp-3 text-muted-foreground leading-relaxed">
            {dream.content_preview}
          </p>
        </CardContent>

        <CardFooter className="flex-col items-start gap-3 pt-3 border-t">
          {/* 情绪 + 类型 */}
          <div className="flex items-center gap-2 w-full">
            {dream.primary_emotion && (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-xl">
                  {EMOTION_EMOJI_MAP[dream.primary_emotion] ?? "💭"}
                </span>
                <span className="text-sm font-medium truncate">
                  {dream.primary_emotion}
                </span>
                {dream.emotion_intensity && (
                  <div className="flex-1 max-w-[80px] h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all"
                      style={{
                        width: `${(dream.emotion_intensity / 5) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-1 shrink-0">
              {dream.dream_types.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs px-1.5">
                  {DREAM_TYPE_ICON_MAP[t] ?? "💭"}
                </Badge>
              ))}
            </div>
          </div>

          {/* 标签 */}
          {dream.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dream.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: tag.color ?? undefined }}
                >
                  #{tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* AI 状态 */}
          {dream.ai_processed && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 已分析</span>
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}

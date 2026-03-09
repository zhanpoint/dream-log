"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DreamApi, TagApi, type Tag } from "@/lib/dream-api";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Tag as TagIcon, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/node_modules/react-i18next";

interface DreamTagManagerProps {
  dreamId: string;
  currentTags: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
}

export function DreamTagManager({
  dreamId,
  currentTags,
  onTagsChange,
}: DreamTagManagerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const currentTagIds = new Set(currentTags.map((t) => t.id));

  // 加载用户所有标签
  const loadTags = useCallback(async () => {
    try {
      const tags = await TagApi.list();
      setAllTags(tags);
    } catch {
      toast.error(t("dreams.detail.tagManager.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    if (open) {
      loadTags();
    }
  }, [open, loadTags]);

  // 添加标签
  const handleAddTag = async (tagId: string) => {
    setLoading(true);
    try {
      await DreamApi.addTag(dreamId, tagId);
      const addedTag = allTags.find((t) => t.id === tagId);
      if (addedTag) {
        const newTags = [...currentTags, addedTag];
        onTagsChange?.(newTags);
        toast.success(`${t("dreams.detail.tagManager.addSuccess")} #${addedTag.name}`);
      }
      // 不关闭弹出框，允许连续添加多个标签
    } catch {
      toast.error(t("dreams.detail.tagManager.addFailed"));
    } finally {
      setLoading(false);
    }
  };

  // 移除标签
  const handleRemoveTag = async (tagId: string) => {
    setLoading(true);
    try {
      await DreamApi.removeTag(dreamId, tagId);
      const newTags = currentTags.filter((t) => t.id !== tagId);
      onTagsChange?.(newTags);
      const removedTag = currentTags.find((t) => t.id === tagId);
      if (removedTag) {
        toast.success(`${t("dreams.detail.tagManager.removeSuccess")} #${removedTag.name}`);
      }
    } catch {
      toast.error(t("dreams.detail.tagManager.removeFailed"));
    } finally {
      setLoading(false);
    }
  };

  // 快速创建新标签
  const handleCreateTag = async () => {
    const name = searchValue.trim();
    if (!name) {
      toast.error(t("dreams.detail.tagManager.nameEmpty"));
      return;
    }
    
    // 验证长度：2-20 个字符
    if (name.length < 2) {
      toast.error(t("dreams.detail.tagManager.nameTooShort"));
      return;
    }
    
    if (name.length > 20) {
      toast.error(t("dreams.detail.tagManager.nameTooLong"));
      return;
    }

    // 检查是否已存在
    if (allTags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      toast.error(t("dreams.detail.tagManager.nameExists"));
      return;
    }

    setCreating(true);
    try {
      const tag = await TagApi.create({ name });
      if (!allTags.some((t) => t.id === tag.id)) {
        setAllTags((prev) => [tag, ...prev]);
      }
      toast.success(`${t("dreams.detail.tagManager.createSuccess")} #${tag.name}，${t("dreams.detail.tagManager.createSuccessHint")}`);
      setSearchValue("");
    } catch {
      toast.error(t("dreams.detail.tagManager.createFailed"));
    } finally {
      setCreating(false);
    }
  };

  // 已选标签
  const availableTags = allTags.filter((tag) => !currentTagIds.has(tag.id));
  const normalizedSearchValue = searchValue.trim();
  const searchTerm = normalizedSearchValue.toLowerCase();
  const filteredAvailableTags = searchTerm
    ? availableTags.filter((tag) => tag.name.toLowerCase().includes(searchTerm))
    : availableTags;
  const canCreateTag =
    normalizedSearchValue.length >= 2 &&
    normalizedSearchValue.length <= 20 &&
    !allTags.some((tag) => tag.name.toLowerCase() === searchTerm);

  // 为标签生成独特的颜色
  const getTagColor = (tagName: string, index: number) => {
    const colors = [
      "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50",
      "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/20 hover:border-green-500/50",
      "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50",
      "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50",
      "bg-pink-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20 hover:border-pink-500/50",
      "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50",
      "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/50",
      "bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 hover:border-teal-500/50",
      "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20 hover:border-red-500/50",
      "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/50",
      "bg-lime-500/10 border-lime-500/30 text-lime-600 dark:text-lime-400 hover:bg-lime-500/20 hover:border-lime-500/50",
      "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-500/20 hover:border-fuchsia-500/50",
    ];
    
    // 结合标签名哈希和索引，确保相邻标签颜色不同
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    // 使用哈希值和索引的组合，增加颜色多样性
    const colorIndex = (Math.abs(hash) + index * 3) % colors.length;
    return colors[colorIndex];
  };

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 border-dashed hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all text-foreground group"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                )}
                <span className="text-xs group-hover:text-primary transition-colors">{t("dreams.detail.tagManager.addTag")}</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{t("dreams.detail.tagManager.tooltip")}</p>
          </TooltipContent>
        </Tooltip>
        
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command shouldFilter={false}>
              <div className="relative">
                <CommandInput
                  placeholder={t("dreams.detail.tagManager.searchPlaceholder")}
                  value={searchValue}
                  onValueChange={setSearchValue}
                  className={cn(searchValue.trim() && "pr-[52px]")}
                />
                {searchValue.trim() && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span
                      className={cn(
                        "text-xs font-medium tabular-nums",
                        searchValue.trim().length < 2
                          ? "text-yellow-600 dark:text-yellow-500"
                          : searchValue.trim().length > 20
                          ? "text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      {searchValue.trim().length}/20
                    </span>
                  </div>
                )}
              </div>
              <CommandList>
                {normalizedSearchValue && filteredAvailableTags.length === 0 && (
                  <div className="py-4 text-center text-sm">
                    <p className="text-muted-foreground mb-2 text-xs">{t("dreams.detail.tagManager.notFound")}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCreateTag}
                      disabled={creating || !canCreateTag}
                      className="gap-1.5 h-7 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
                    >
                      {creating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      {t("dreams.detail.tagManager.create")} &ldquo;{normalizedSearchValue}&rdquo;
                    </Button>
                  </div>
                )}
                {currentTags.length > 0 && (
                  <CommandGroup>
                    <div className="px-2 pb-2 pt-2 text-xs font-medium text-muted-foreground">
                      {t("dreams.detail.tagManager.selectedTags")}
                    </div>
                    <div className="flex flex-wrap gap-2 px-2 pb-2">
                      {currentTags.map((tag, index) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className={cn(
                            "gap-1 cursor-pointer transition-all opacity-90 hover:opacity-100",
                            getTagColor(tag.name, index),
                            "hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive"
                          )}
                          onClick={() => handleRemoveTag(tag.id)}
                        >
                          <X className="w-3 h-3" />
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </CommandGroup>
                )}
                {filteredAvailableTags.length > 0 && (
                  <CommandGroup>
                    <div className="px-2 pb-2 pt-2 text-xs font-medium text-muted-foreground">
                      {t("dreams.detail.tagManager.availableTags")}
                    </div>
                    <div className="flex flex-wrap gap-2 px-2 pb-2">
                      {filteredAvailableTags.map((tag, index) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className={cn(
                            "gap-1 cursor-pointer transition-all",
                            getTagColor(tag.name, index)
                          )}
                          onClick={() => handleAddTag(tag.id)}
                        >
                          <TagIcon className="w-3 h-3" />
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </TooltipProvider>
    );
  }

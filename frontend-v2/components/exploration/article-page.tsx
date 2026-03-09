"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { explorationAPI, type Article, type ExplorationModule } from "@/lib/exploration-api";
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronUp,
  Brain,
  Moon,
  Sparkles,
  Zap,
  Heart,
  Layers,
  LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// 处理文本中的重点内容，用「」标记的内容会被突出显示
function formatTextWithHighlights(text: string) {
  const parts = text.split(/([「」])/);
  const result: React.ReactNode[] = [];
  let inHighlight = false;
  let highlightText = "";

  parts.forEach((part, index) => {
    if (part === "「") {
      inHighlight = true;
      highlightText = "";
    } else if (part === "」") {
      inHighlight = false;
      result.push(
        <span key={index} className="text-primary font-medium">
          {highlightText}
        </span>
      );
      highlightText = "";
    } else if (inHighlight) {
      highlightText += part;
    } else if (part) {
      result.push(part);
    }
  });

  return result;
}

function ExpandableSection({ article, icon: Icon, color }: { article: Article; icon: LucideIcon; color: string }) {
  const [open, setOpen] = useState(false);
  const expandable = article.content.expandable !== false ? article.content.expandable : false;

  if (!expandable) {
    return (
      <div className={`rounded-xl border border-border/50 px-6 py-5 relative overflow-hidden group hover:border-border transition-all duration-200`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${color}`} />
        <div className="flex items-start gap-3 mb-3">
          <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color.replace('bg-', 'text-')}`} />
          <h2 className="text-sm flex-1">{article.section}</h2>
        </div>
        <div className="pl-8 text-sm text-muted-foreground leading-[1.8] space-y-4">
          {article.content.body.split('\n\n').map((paragraph, idx) => (
            <p key={idx} className="whitespace-pre-line">
              {formatTextWithHighlights(paragraph)}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-border/50 rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-sm group relative ${open ? 'shadow-sm' : ''}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${color} transition-all duration-200 ${open ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center gap-3 flex-1">
          <Icon className={`h-5 w-5 shrink-0 transition-colors duration-200 ${color.replace('bg-', 'text-')} ${open ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
          <span className="text-sm group-hover:text-primary transition-colors duration-200">{article.section}</span>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:scale-125 transition-all duration-200 shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:scale-125 transition-all duration-200 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="pl-8 animate-in fade-in-0 slide-in-from-top-1 duration-500">
            <div className="text-sm text-muted-foreground leading-[1.8] space-y-4">
              {article.content.body.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="whitespace-pre-line">
                  {formatTextWithHighlights(paragraph)}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MODULE_CONFIG: Record<
  ExplorationModule,
  { title: string; description: string; icon: LucideIcon; color: string }
> = {
  science: {
    title: "梦境科学基础",
    description: "了解梦为何产生、与情绪的关系，以及睡眠科学的基本原理",
    icon: Brain,
    color: "bg-blue-500",
  },
  nightmare: {
    title: "噩梦应对指南",
    description: "理解噩梦背后的原因，学习减少噩梦、让睡眠更平静的方法",
    icon: Moon,
    color: "bg-purple-500",
  },
  improvement: {
    title: "梦境改善指南",
    description: "改善梦境体验，学会记住梦境，让大脑在睡眠中更好地放松",
    icon: Sparkles,
    color: "bg-emerald-500",
  },
  lucid: {
    title: "清醒梦指南",
    description: "探索在梦中保持清醒的方法，了解如何进入和控制清醒梦",
    icon: Zap,
    color: "bg-indigo-500",
  },
  psychology: {
    title: "梦境与心理",
    description: "理解梦境与情绪、心理状态的深层关系，让梦成为认识自己的窗口",
    icon: Heart,
    color: "bg-rose-500",
  },
  phenomena: {
    title: "梦境现象",
    description: "解密重复梦、梦中梦、虚假醒来与睡眠瘫痪——那些奇怪但正常的梦境体验",
    icon: Layers,
    color: "bg-amber-500",
  },
};

export function ArticlePage({ module }: { module: ExplorationModule }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const config = MODULE_CONFIG[module];

  useEffect(() => {
    explorationAPI
      .getArticles(module)
      .then((res) => setArticles(res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [module]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/exploration"
          className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          梦境探索
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">{config.title}</h1>
          <p className="text-muted-foreground text-sm">{config.description}</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            内容正在准备中，敬请期待
          </div>
        ) : (
          <div className="space-y-5">
            {articles.map((article) => (
              <ExpandableSection 
                key={article.id} 
                article={article}
                icon={config.icon}
                color={config.color}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

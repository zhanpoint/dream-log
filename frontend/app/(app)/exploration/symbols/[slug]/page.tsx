"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { explorationAPI, type Symbol } from "@/lib/exploration-api";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { use, useEffect, useState } from "react";

function ExpandSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left transition-all duration-200 cursor-pointer group"
      >
        <span className="font-semibold text-sm group-hover:text-primary transition-colors duration-200">{title}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:scale-125 transition-all duration-200 shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:scale-125 transition-all duration-200 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-5 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

function SymbolSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="space-y-3 mt-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function SymbolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { t } = useTranslation();
  const [symbol, setSymbol] = useState<Symbol | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    explorationAPI
      .getSymbol(slug)
      .then(setSymbol)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <SymbolSkeleton />
      </div>
    );
  }

  if (notFound || !symbol) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">{t("exploration.symbolDetail.notFound")}</p>
        <Link href="/exploration/symbols" className="text-primary hover:underline text-sm">
          {t("exploration.symbolDetail.backToDictionary")}
        </Link>
      </div>
    );
  }

  const { content } = symbol;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 返回 */}
        <Link
          href="/exploration/symbols"
          className="group inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">{t("exploration.symbolDetail.dictionaryTitle")}</span>
        </Link>

        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">{symbol.name}</h1>
          <p className="text-base font-medium text-foreground mb-3">
            {content.core_meaning.headline}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {content.core_meaning.description}
          </p>
        </div>

        <div className="space-y-6">
          {/* 这可能与你有关 */}
          <div className="bg-primary/8 border border-primary/20 rounded-xl px-6 py-5">
            <h2 className="text-sm font-semibold text-primary mb-3">{t("exploration.symbolDetail.relatedToYou")}</h2>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {content.personal_connection}
            </p>
          </div>

          {/* 常见梦境场景 */}
          <div className="rounded-xl border border-border/50 px-6 py-5">
            <h2 className="text-sm font-semibold mb-5">{t("exploration.symbolDetail.commonScenarios")}</h2>
            <div className="space-y-4">
              {content.common_scenarios.map((s, i) => (
                <div key={i} className="pb-4 border-b border-border/30 last:border-0 last:pb-0">
                  <div className="font-medium text-foreground text-sm mb-2">
                    {s.scenario}
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {s.meaning}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 你可以问问自己 */}
          <div className="rounded-xl border border-border/50 px-6 py-5">
            <h2 className="text-sm font-semibold mb-5">{t("exploration.symbolDetail.askYourself")}</h2>
            <ul className="space-y-4">
              {content.self_reflection_questions.map((q, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground leading-relaxed">
                  <span className="text-primary shrink-0 mt-0.5 font-semibold">•</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 可展开：情绪关联 */}
          <ExpandSection title={t("exploration.symbolDetail.emotionAssociations")}>
            <div className="flex flex-wrap gap-2.5">
              {content.emotion_associations.map((e, i) => (
                <span
                  key={i}
                  className="text-xs px-3 py-1.5 rounded-full border border-border/60 text-foreground hover:border-primary/50 hover:scale-105 hover:-translate-y-0.5 transition-all duration-200 cursor-default"
                >
                  {e}
                </span>
              ))}
            </div>
          </ExpandSection>

          {/* 可展开：为什么会梦到这个 */}
          <ExpandSection title={t("exploration.symbolDetail.whyDreamThis")}>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {content.why_you_dream_this}
            </p>
          </ExpandSection>

          {/* 可展开：相关符号 */}
          <ExpandSection title={t("exploration.symbolDetail.relatedSymbols")}>
            <div className="flex flex-wrap gap-2.5">
              {content.related_symbols.map((s, i) => (
                <Link
                  key={i}
                  href={`/exploration/symbols?search=${encodeURIComponent(s)}`}
                  className="text-xs px-3 py-1.5 rounded-full border border-border/60 hover:border-primary/50 hover:scale-105 hover:-translate-y-0.5 transition-all duration-200 text-foreground"
                >
                  {s}
                </Link>
              ))}
            </div>
          </ExpandSection>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Suspense } from "react";
import { EChartsWrapper } from "@/components/charts/echarts-wrapper";
import { ThemeReportShell } from "@/components/insights/theme-report-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Insight } from "@/lib/insight-api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN, enUS, ja } from "date-fns/locale";
import type { Locale } from "date-fns";
import { Brain, ChevronRight, HelpCircle, Link2, Moon, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

// ===== 辅助函数 =====
function getDateLocale(lang: string): Locale {
  switch (lang) {
    case "zh-CN":
      return zhCN;
    case "ja":
      return ja;
    case "en":
    default:
      return enUS;
  }
}

// ===== 类型 =====
interface RecurringPattern {
  pattern: string;
  count: number;
  meaning: string;
  personal_meaning: string;
}

interface CommonSymbol {
  symbol: string;
  frequency: number;
  interpretation: string;
  context: string;
  life_connection: string;
}

interface DreamTheme {
  theme: string;
  percentage: number;
  description: string;
  evolution: string;
  growth_insight: string;
}

interface Connection {
  connection: string;
  insight: string;
  suggestion: string;
}

interface SelfReflection {
  question: string;
  why: string;
  guidance: string;
}

interface RepresentativeDream {
  date: string;
  theme: string;
  why_important: string;
  dream_id?: string;
}

type ThemeAi = {
  theme_summary?: string;
  recurring_patterns?: RecurringPattern[];
  common_symbols?: CommonSymbol[];
  dream_themes?: DreamTheme[];
  connections?: Connection[];
  self_reflection?: SelfReflection[];
  representative_dreams?: RepresentativeDream[];
  pattern_evolution?: string | null;
};

type ThemeStats = {
  tag_frequency?: Array<[string, number]>;
};

type ThemeData = {
  ai_analysis?: ThemeAi;
  statistics?: ThemeStats;
};

function ThemePatternContent() {
  const { t } = useTranslation();
  return (
    <ThemeReportShell
      reportType="THEME_PATTERN"
      title={t("insights.theme.themeLabel")}
      description={t("insights.theme.themeDesc")}
      icon={<Brain className="h-5 w-5 text-violet-500" />}
      renderReport={(insight) => <ThemeReport insight={insight} />}
    />
  );
}

export default function ThemePatternPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <ThemePatternContent />
    </Suspense>
  );
}

function ThemeReport({ insight }: { insight: Insight }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  
  const data = insight.data as ThemeData;
  const ai: ThemeAi = data.ai_analysis || {};

  const recurringPatterns = ai.recurring_patterns || [];
  const commonSymbols = ai.common_symbols || [];
  const dreamThemes = ai.dream_themes || [];
  const connections = ai.connections || [];
  const selfReflection = ai.self_reflection || [];
  const representativeDreams = ai.representative_dreams || [];
  const patternEvolution = ai.pattern_evolution ?? null;

  const getSymbolSizeClass = (frequency: number) => {
    const size = Math.max(14, Math.min(18, 14 + (frequency || 0) * 0.5));
    if (size >= 18) return "text-[18px]";
    if (size >= 17) return "text-[17px]";
    if (size >= 16) return "text-[16px]";
    if (size >= 15) return "text-[15px]";
    return "text-[14px]";
  };

  // 处理符号点击 - 跳转到梦境列表并筛选包含该符号的梦境
  const handleSymbolClick = (symbol: string) => {
    // 这里可以跳转到梦境列表页面，并传递搜索参数
    router.push(`/dreams?search=${encodeURIComponent(symbol)}`);
  };

  return (
    <div className="space-y-6">
      {/* 1. AI 主题总结 + 行动指引 */}
      {ai.theme_summary && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Brain className="h-4 w-4 text-violet-500" />
              {t("insights.report.themePatternSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-[46px] pr-6 pb-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{String(ai.theme_summary)}</p>
            
            {/* 行动指引 */}
            <div className="mt-6 pt-5 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-4">
                💡 {t("insights.report.actionGuidance")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9 px-4 text-xs text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                  onClick={() => router.push('/dreams/new')}
                >
                  {t("insights.report.recordNewDream")}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9 px-4 text-xs text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                  onClick={() => router.push('/dreams')}
                >
                  {t("insights.report.viewAllDreams")}
                </Button>
                {representativeDreams.length > 0 && representativeDreams[0].dream_id && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-9 px-4 text-xs text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                    onClick={() => router.push(`/dreams/${representativeDreams[0].dream_id}`)}
                  >
                    {t("insights.report.viewRepresentativeDream")}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. 梦境主题分布 */}
      {dreamThemes.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm">{t("insights.report.dreamThemeDistribution")}</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            <EChartsWrapper
              height={260}
              option={{
                series: [{
                  type: "pie",
                  radius: ["35%", "65%"],
                  center: ["50%", "45%"],
                  data: dreamThemes.map((t) => ({
                    name: t.theme,
                    value: t.percentage,
                  })),
                  label: { formatter: "{b}: {c}%" },
                }],
                tooltip: { trigger: "item", formatter: "{b}: {c}%" },
                legend: { 
                  bottom: 5, 
                  orient: "horizontal", 
                  textStyle: { fontSize: 11 },
                  itemGap: 20,
                },
              }}
            />
            {/* 分隔线 */}
            <div className="mt-8 mb-6 border-t border-border/30" />
            <div className="space-y-4">
              {dreamThemes.map((theme, i) => (
                <div key={i} className="border-l-2 border-primary/30 pl-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{theme.theme}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{theme.description}</p>
                  {theme.evolution && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">{t("insights.report.change")}：{theme.evolution}</p>
                  )}
                  {theme.growth_insight && (
                    <div className="pt-2 border-t border-primary/20">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium leading-relaxed">{t("insights.report.growthInsight")}：{theme.growth_insight}</p>
                  </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. 重复出现的模式 + 视觉化频率 */}
      {recurringPatterns.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm">{t("insights.report.recurringPatterns")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-6 pb-4">
            {recurringPatterns.map((p, i) => (
              <div key={i} className="p-3 rounded-lg border border-border/30 dark:border-border/20 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium flex-1">{p.pattern}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* 视觉化频率指示器 */}
                    <div className="flex gap-0.5" title={`${t("insights.report.times", { count: p.count })}`}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "h-3 w-1 rounded-full transition-all",
                            idx < Math.min(5, p.count) 
                              ? "bg-violet-500 dark:bg-violet-400" 
                              : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {p.count}{t("insights.report.times")}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.meaning}</p>
                {p.personal_meaning && (
                  <div className="pt-1.5 border-t border-border/30">
                    <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                      <span className="font-medium">{t("insights.report.personalMeaning")}：</span>{p.personal_meaning}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 4. 高频符号 + 可点击 */}
      {commonSymbols.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm">{t("insights.report.highFrequencySymbols")}</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            <div className="space-y-3">
              {commonSymbols.slice(0, 5).map((s, i) => (
                <div key={i} className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleSymbolClick(s.symbol)}
                    className={cn(
                      "inline-block text-primary font-medium hover:text-primary/80 hover:underline decoration-2 underline-offset-4 transition-all cursor-pointer",
                      getSymbolSizeClass(s.frequency || 0)
                    )}
                    title={t("insights.report.clickToViewRelated")}
                  >
                    {s.symbol}
                  </button>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.interpretation}</p>
                  {s.context && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{t("insights.report.scene")}：{s.context}</p>
                  )}
                  {s.life_connection && (
                    <div className="pt-1.5 border-t border-border/30">
                      <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                        <span className="font-medium">{t("insights.report.lifeConnection")}：</span>{s.life_connection}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. 发现的关联 */}
      {connections.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Link2 className="h-4 w-4 text-blue-500" />
              {t("insights.report.discoveredConnections")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pl-[46px] pr-6 pb-4">
            {connections.map((c, i) => (
              <div key={i} className="p-3 rounded-lg border border-border/30 dark:border-border/20 space-y-1.5">
                <p className="text-sm font-medium">{c.connection}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.insight}</p>
                {c.suggestion && (
                  <div className="pt-1.5 border-t border-border/30">
                    <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                      <span className="font-medium">{t("insights.report.suggestion")}：</span>{c.suggestion}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 6. 值得思考的问题 */}
      {selfReflection.length > 0 && (
        <Card className="border-violet-500/40 dark:border-violet-500/30 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
              <HelpCircle className="h-4 w-4" />
              {t("insights.report.questionsToReflect")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pl-[46px] pr-6 pb-4">
            {selfReflection.map((r, i) => (
              <div key={i} className="p-3 rounded-lg border border-violet-500/30 dark:border-violet-500/20 space-y-1.5">
                <p className="text-sm font-medium">{r.question}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.why}</p>
                {r.guidance && (
                  <div className="pt-1.5 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">{t("insights.report.thinkingDirection")}：</span>{r.guidance}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 7. 代表性梦境 + 查看链接 + 日期优化 */}
      {representativeDreams.length > 0 && (
        <Card className="border-border/40 dark:border-border/20 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Moon className="h-4 w-4 text-primary" />
              {t("insights.report.representativeDreams")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pl-[46px] pr-6 pb-4">
            {representativeDreams.map((d, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className="text-xs shrink-0">{d.theme}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(d.date), dateLocale === zhCN || dateLocale === ja ? "M月d日" : "MMM d", { locale: dateLocale })}
                    </span>
                  </div>
                  {d.dream_id && (
                    <Link href={`/dreams/${d.dream_id}`}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs shrink-0 hover:bg-primary/10 hover:text-primary group"
                      >
                        {t("insights.report.viewDream")}
                        <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </Link>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{d.why_important}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 8. AI 关键词/标签频率 */}
      {data.statistics?.tag_frequency && (() => {
        const tagFreq = data.statistics?.tag_frequency ?? [];
        if (!tagFreq.length) return null;
        return (
          <Card className="border-border/40 dark:border-border/20 shadow-sm">
            <CardHeader className="px-6 pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {t("insights.report.highFrequencyTags")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-[46px] pr-6 pb-4">
              <div className="flex flex-wrap gap-2">
                {tagFreq.slice(0, 20).map(([tag, count], i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border border-border/40 dark:border-border/30 bg-background text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary hover:scale-105 hover:shadow-md transition-all duration-200 cursor-default"
                  >
                    {tag} {count > 1 && <span className="ml-1 opacity-70">×{count}</span>}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* 9. 模式演变 */}
      {patternEvolution && (
        <Card className="border-blue-500/40 dark:border-blue-500/30 shadow-sm">
          <CardHeader className="px-6 pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
              {t("insights.report.patternEvolution")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-[46px] pr-6 pb-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{patternEvolution}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

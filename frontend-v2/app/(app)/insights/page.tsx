"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DreamApi } from "@/lib/dream-api";
import { insightAPI, type Insight, type InsightType } from "@/lib/insight-api";
import { cn } from "@/lib/utils";
import {
  addDays,
  endOfMonth,
  endOfYear,
  format,
  getMonth,
  getYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { zhCN, enUS, ja } from "date-fns/locale";
import type { Locale } from "date-fns";

// 根据 i18n 语言代码获取 date-fns locale
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
import {
  Award,
  BarChart3,
  Brain,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Moon,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// ========== 类型 ==========

interface ReportCardConfig {
  type: InsightType;
  labelKey: string;
  icon: React.ReactNode;
  descriptionKey: string;
  isNew?: boolean;
  href?: (id: string) => string;
}

const PERIODIC_REPORTS: ReportCardConfig[] = [
  {
    type: "WEEKLY",
    labelKey: "insights.main.weeklyLabel",
    icon: <Calendar className="h-5 w-5 text-blue-500" />,
    descriptionKey: "insights.main.weeklyDesc",
    href: (id) => `/insights/weekly/${id}`,
  },
  {
    type: "MONTHLY",
    labelKey: "insights.main.monthlyLabel",
    icon: <CalendarDays className="h-5 w-5 text-primary" />,
    descriptionKey: "insights.main.monthlyDesc",
    href: (id) => `/insights/monthly/${id}`,
  },
  {
    type: "ANNUAL",
    labelKey: "insights.main.annualLabel",
    icon: <Award className="h-5 w-5 text-amber-500" />,
    descriptionKey: "insights.main.annualDesc",
    href: (id) => `/insights/annual/${id}`,
  },
];

const THEME_REPORTS = [
  {
    type: "EMOTION_HEALTH" as InsightType,
    labelKey: "insights.theme.emotionLabel",
    icon: <Heart className="h-5 w-5 text-rose-500" />,
    descriptionKey: "insights.theme.emotionDesc",
    href: "/insights/emotion",
  },
  {
    type: "SLEEP_QUALITY" as InsightType,
    labelKey: "insights.theme.sleepLabel",
    icon: <Moon className="h-5 w-5 text-indigo-500" />,
    descriptionKey: "insights.theme.sleepDesc",
    href: "/insights/sleep",
  },
  {
    type: "THEME_PATTERN" as InsightType,
    labelKey: "insights.theme.themeLabel",
    icon: <Brain className="h-5 w-5 text-violet-500" />,
    descriptionKey: "insights.theme.themeDesc",
    href: "/insights/theme",
  },
];

function formatWeeklyRange(start: Date, end: Date, locale: Locale): string {
  const dateFormat = locale === zhCN || locale === ja ? "yyyy年M月d日" : "MMM d, yyyy";
  return `${format(start, dateFormat, { locale })} – ${format(end, dateFormat, { locale })}`;
}

function formatMonthlyLabel(start: Date, locale: Locale): string {
  const dateFormat = locale === zhCN || locale === ja ? "yyyy年M月" : "MMM yyyy";
  return format(start, dateFormat, { locale });
}

function formatAnnualLabel(start: Date, locale: Locale): string {
  const dateFormat = locale === zhCN || locale === ja ? "yyyy年" : "yyyy";
  return format(start, dateFormat, { locale });
}

// ========== 主页面 ==========

export default function InsightsPage() {
  const { t } = useTranslation();
  const [weeklyInsights, setWeeklyInsights] = useState<Insight[]>([]);
  const [monthlyInsights, setMonthlyInsights] = useState<Insight[]>([]);
  const [annualInsights, setAnnualInsights] = useState<Insight[]>([]);
  const [dreamStats, setDreamStats] = useState<{ this_week_count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState<{
    weekly: boolean;
    monthly: boolean;
    annual: boolean;
    emotion: boolean;
    sleep: boolean;
    theme: boolean;
  }>({
    weekly: false,
    monthly: false,
    annual: false,
    emotion: false,
    sleep: false,
    theme: false,
  });

  const defaultUnread = {
    weekly: false,
    monthly: false,
    annual: false,
    emotion_health: false,
    sleep_quality: false,
    theme_pattern: false,
  };

  const fetchIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const thisFetchId = ++fetchIdRef.current;
    setLoading(true);
    
    // 定义在函数顶部，确保在所有地方都能访问
    const isCancelLikeError = (reason: unknown) => {
      const err = reason as {
        code?: string;
        message?: string;
        originalError?: { code?: string; message?: string };
      };
      return (
        err?.code === "ERR_CANCELED" ||
        err?.originalError?.code === "ERR_CANCELED" ||
        /cancel|abort/i.test(String(err?.message ?? "")) ||
        /cancel|abort/i.test(String(err?.originalError?.message ?? ""))
      );
    };
    
    try {
      const [weeklySettled, monthlySettled, annualSettled] = await Promise.allSettled([
        insightAPI.list({ insight_type: "WEEKLY", page_size: 50 }),
        insightAPI.list({ insight_type: "MONTHLY", page_size: 12 }),
        insightAPI.list({ insight_type: "ANNUAL", page_size: 5 }),
      ]);

      if (thisFetchId !== fetchIdRef.current) return;

      const toItems = (s: PromiseSettledResult<{ items?: Insight[] }>): Insight[] =>
        s.status === "fulfilled" && Array.isArray(s.value?.items) ? s.value.items : [];
      setWeeklyInsights(toItems(weeklySettled));
      setMonthlyInsights(toItems(monthlySettled));
      setAnnualInsights(toItems(annualSettled));

      const isCancel = (r: PromiseRejectedResult) => isCancelLikeError(r.reason);
      const hasRealFailure =
        (weeklySettled.status === "rejected" && !isCancel(weeklySettled)) ||
        (monthlySettled.status === "rejected" && !isCancel(monthlySettled)) ||
        (annualSettled.status === "rejected" && !isCancel(annualSettled));
      if (hasRealFailure) toast.error(t("insights.theme.loadFailed"));

      const [unreadResult, statsResult] = await Promise.all([
        insightAPI.getUnreadSummary().catch(() => defaultUnread),
        DreamApi.getStats().catch(() => null),
      ]);
      if (thisFetchId !== fetchIdRef.current) return;

      setUnread({
        weekly: unreadResult.weekly,
        monthly: unreadResult.monthly,
        annual: unreadResult.annual,
        emotion: unreadResult.emotion_health,
        sleep: unreadResult.sleep_quality,
        theme: unreadResult.theme_pattern,
      });
      setDreamStats(
        statsResult ? { this_week_count: statsResult.this_week_count } : null
      );
    } catch (_err) {
      if (fetchIdRef.current !== thisFetchId) return;
      if (!isCancelLikeError(_err)) {
        toast.error(t("insights.theme.loadFailed"));
      }
    } finally {
      if (fetchIdRef.current === thisFetchId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="min-h-screen">
      {/* 顶部 Header */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">
          {t("insights.main.title")}
        </h1>
      </div>

      {/* Tab 导航 */}
      <div className="container mx-auto px-4 pb-6">
        <Tabs defaultValue="periodic">
          <TabsList className="mb-6">
            <TabsTrigger value="periodic" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              {t("insights.main.tabPeriodic")}
            </TabsTrigger>
            <TabsTrigger value="theme" className="gap-1.5">
              <Brain className="h-4 w-4" />
              {t("insights.main.tabTheme")}
            </TabsTrigger>
          </TabsList>

          {/* ===== 定期报告 ===== */}
          <TabsContent value="periodic" className="space-y-8">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
              </div>
            ) : (
              <>
                {/* 横向布局的三个定期报告卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <PeriodicCard
                    config={PERIODIC_REPORTS[0]}
                    insights={weeklyInsights}
                    onRefresh={fetchAll}
                    hasUnread={unread.weekly}
                    thisWeekDreamCount={dreamStats?.this_week_count ?? null}
                  />
                  <PeriodicCard
                    config={PERIODIC_REPORTS[1]}
                    insights={monthlyInsights}
                    onRefresh={fetchAll}
                    hasUnread={unread.monthly}
                  />
                  <PeriodicCard
                    config={PERIODIC_REPORTS[2]}
                    insights={annualInsights}
                    onRefresh={fetchAll}
                    hasUnread={unread.annual}
                  />
                </div>
              </>
            )}
          </TabsContent>

          {/* ===== 专题分析 ===== */}
          <TabsContent value="theme">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {THEME_REPORTS.map((config) => {
                const hasUnread =
                  config.type === "EMOTION_HEALTH"
                    ? unread.emotion
                    : config.type === "SLEEP_QUALITY"
                    ? unread.sleep
                    : unread.theme;
                return (
                  <ThemeReportCard
                    key={config.type}
                    config={config}
                    hasUnread={hasUnread}
                  />
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ========== 定期报告卡片（横向布局） ==========

function PeriodicCard({
  config,
  insights,
  onRefresh,
  hasUnread,
  thisWeekDreamCount = null,
}: {
  config: ReportCardConfig;
  insights: Insight[];
  onRefresh: () => void;
  hasUnread: boolean;
  thisWeekDreamCount?: number | null;
}) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  
  // 使用 localStorage 保持日期选择状态
  const storageKey = `periodic-report-${config.type}`;
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  
  // 保存状态到 localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, selectedPeriodIndex.toString());
  }, [selectedPeriodIndex, storageKey]);
  
  const isWeekly = config.type === "WEEKLY";
  const isMonthly = config.type === "MONTHLY";
  const isAnnual = config.type === "ANNUAL";
  const hasPeriodSwitcher = isWeekly || isMonthly || isAnnual;
  const thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekStart = format(thisMonday, "yyyy-MM-dd");
  const hasCurrentWeekReport = isWeekly && insights.some(
    (i) => i.time_period_start && i.time_period_start.slice(0, 10) === currentWeekStart
  );
  const insufficientData = isWeekly && thisWeekDreamCount !== null && thisWeekDreamCount < 3 && !hasCurrentWeekReport;

  const WEEK_SLOTS = 52;
  const MONTH_SLOTS = 12;
  const YEAR_SLOTS = 5;
  const periodSlotCount = hasPeriodSwitcher
    ? isWeekly
      ? WEEK_SLOTS
      : isMonthly
        ? MONTH_SLOTS
        : YEAR_SLOTS
    : 0;
  const safePeriodIndex =
    hasPeriodSwitcher && periodSlotCount > 0
      ? Math.max(0, Math.min(selectedPeriodIndex, periodSlotCount - 1))
      : 0;

  const selectedPeriodRange = (() => {
    if (!hasPeriodSwitcher) return null;
    if (isWeekly) {
      const start = subWeeks(thisMonday, safePeriodIndex);
      return { start, end: addDays(start, 6) };
    }
    if (isMonthly) {
      const monthStart = startOfMonth(subMonths(new Date(), safePeriodIndex));
      return { start: monthStart, end: endOfMonth(monthStart) };
    }
    const y = new Date().getFullYear() - safePeriodIndex;
    return { start: startOfYear(new Date(y, 0, 1)), end: endOfYear(new Date(y, 0, 1)) };
  })();

  const selectedInsight = (() => {
    if (!hasPeriodSwitcher || !selectedPeriodRange || insights.length === 0) return null;
    const keyStart = format(selectedPeriodRange.start, "yyyy-MM-dd");
    if (isWeekly) {
      return insights.find((i) => i.time_period_start?.slice(0, 10) === keyStart) ?? null;
    }
    if (isMonthly) {
      const key = format(selectedPeriodRange.start, "yyyy-MM");
      return (
        insights.find((i) => {
          const s = i.time_period_start?.slice(0, 7);
          return s === key;
        }) ?? null
      );
    }
    const keyYear = format(selectedPeriodRange.start, "yyyy");
    return (
      insights.find((i) => i.time_period_start?.slice(0, 4) === keyYear) ?? null
    );
  })();

  const latestInsight = hasPeriodSwitcher ? selectedInsight : insights[0];

  const isSelectedThisWeek = isWeekly && safePeriodIndex === 0;

  const handleGenerate = async () => {
    if (!selectedPeriodRange) return;
    setGenerating(true);
    try {
      if (config.type === "WEEKLY") {
        await insightAPI.generateWeekly(format(selectedPeriodRange.start, "yyyy-MM-dd"));
      } else if (config.type === "MONTHLY") {
        const start = selectedPeriodRange.start;
        await insightAPI.generateMonthly(getYear(start), getMonth(start) + 1);
      } else if (config.type === "ANNUAL") {
        await insightAPI.generateAnnual(getYear(selectedPeriodRange.start));
      }
      onRefresh();
    } catch (e: unknown) {
      const err = e as { message?: string; originalError?: { response?: { data?: { detail?: string } } } };
      const backendMsg = err?.originalError?.response?.data?.detail;
      const msg = typeof backendMsg === "string" ? backendMsg : (err?.message || t("insights.theme.generateFailed"));
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedInsight) {
      toast.info(t("insights.theme.generateFirst"));
      return;
    }
    if (!selectedPeriodRange) return;
    setRegenerating(true);
    try {
      if (config.type === "WEEKLY") {
        await insightAPI.generateWeekly(format(selectedPeriodRange.start, "yyyy-MM-dd"));
      } else if (config.type === "MONTHLY") {
        const start = selectedPeriodRange.start;
        await insightAPI.generateMonthly(getYear(start), getMonth(start) + 1);
      } else if (config.type === "ANNUAL") {
        await insightAPI.generateAnnual(getYear(selectedPeriodRange.start));
      }
      onRefresh();
    } catch (e: unknown) {
      const err = e as { message?: string; originalError?: { response?: { data?: { detail?: string } } } };
      const backendMsg = err?.originalError?.response?.data?.detail;
      const msg = typeof backendMsg === "string" ? backendMsg : (err?.message || t("insights.theme.generateFailed"));
      toast.error(msg);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {config.icon}
            <CardTitle className="text-lg">{t(config.labelKey)}</CardTitle>
          </div>
          {hasUnread && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground"
            >
              NEW
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs leading-relaxed">
          {t(config.descriptionKey)}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between">
        {/* 周报/月报/年报：切换器，箭头始终可点击（边界时索引不变） */}
        {hasPeriodSwitcher && (
          <div className="flex items-center justify-between gap-2 mb-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 hover:bg-transparent hover:scale-110 hover:-translate-x-0.5 transition-all duration-200 group"
              onClick={() =>
                setSelectedPeriodIndex((i) => Math.min(periodSlotCount - 1, i + 1))
              }
            >
              <ChevronLeft className="h-4 w-4 text-foreground group-hover:text-primary transition-colors" />
            </Button>
            <span className="text-xs text-muted-foreground text-center truncate flex-1">
              {selectedPeriodRange
                ? isWeekly
                  ? formatWeeklyRange(selectedPeriodRange.start, selectedPeriodRange.end, dateLocale)
                  : isMonthly
                    ? formatMonthlyLabel(selectedPeriodRange.start, dateLocale)
                    : formatAnnualLabel(selectedPeriodRange.start, dateLocale)
                : ""}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 hover:bg-transparent hover:scale-110 hover:translate-x-0.5 transition-all duration-200 group"
              onClick={() => setSelectedPeriodIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronRight className="h-4 w-4 text-foreground group-hover:text-primary transition-colors" />
            </Button>
          </div>
        )}

        {insufficientData && isWeekly && isSelectedThisWeek ? (
          <div className="p-6 text-center">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">{t("insights.main.insufficientWeeklyTitle")}</p>
            <p className="text-xs text-muted-foreground mb-4">{t("insights.main.insufficientWeeklySubtitle")}</p>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/dreams/new">{t("insights.main.goRecordDream")}</Link>
            </Button>
          </div>
        ) : latestInsight ? (
          <Link
            href={config.href ? config.href(latestInsight.id) : "#"}
            className="block"
          >
            <div
              className={cn(
                "p-4 rounded-lg border border-border/70 hover:border-primary/80 hover:shadow-md transition-all cursor-pointer",
                !latestInsight.is_read && "border-primary/60"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium line-clamp-1">
                  {(() => {
                    if (config.type === "WEEKLY" && latestInsight.time_period_start) {
                      const start = new Date(latestInsight.time_period_start);
                      const year = start.getFullYear();
                      const month = start.getMonth() + 1;
                      const day = start.getDate();
                      return t("insights.report.weeklyReportTitle", { year, month, day });
                    } else if (config.type === "MONTHLY" && latestInsight.time_period_start) {
                      const start = new Date(latestInsight.time_period_start);
                      const year = start.getFullYear();
                      const month = start.getMonth() + 1;
                      return t("insights.report.monthlyReportTitle", { year, month });
                    } else if (config.type === "ANNUAL" && latestInsight.time_period_start) {
                      const start = new Date(latestInsight.time_period_start);
                      const year = start.getFullYear();
                      return t("insights.report.annualReportTitle", { year });
                    }
                    return latestInsight.title;
                  })()}
                </p>
                {!latestInsight.is_read && (
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                )}
              </div>
              {latestInsight.narrative && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {latestInsight.narrative}
                </p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  {(() => {
                    if (config.type === "WEEKLY" && latestInsight.time_period_start && latestInsight.time_period_end) {
                      const start = new Date(latestInsight.time_period_start);
                      const end = new Date(latestInsight.time_period_end);
                      return formatWeeklyRange(start, end, dateLocale);
                    } else if (config.type === "MONTHLY" && latestInsight.time_period_start) {
                      const start = new Date(latestInsight.time_period_start);
                      return formatMonthlyLabel(start, dateLocale);
                    } else if (config.type === "ANNUAL" && latestInsight.time_period_start) {
                      const start = new Date(latestInsight.time_period_start);
                      return formatAnnualLabel(start, dateLocale);
                    }
                    const dateFormat = dateLocale === zhCN || dateLocale === ja ? "yyyy年M月d日" : "MMM d, yyyy";
                    return format(new Date(latestInsight.created_at), dateFormat, { locale: dateLocale });
                  })()}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="p-6 rounded-lg border-2 border-dashed border-border/60 text-center">
            <p className="text-sm text-muted-foreground mb-3">{t("insights.main.noReport")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="group/btn text-primary border-primary/50 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-105 transition-all duration-200"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 group-hover/btn:rotate-180 transition-transform duration-500" />
              )}
              {t("insights.main.generateNow")}
            </Button>
          </div>
        )}

        {/* 底部操作区 */}
        <div className="mt-4 pt-4 border-t space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t("insights.main.reportsCount", { count: insights.length })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-transparent hover:scale-105 transition-all duration-200 group/btn"
            >
              {regenerating ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1 group-hover/btn:rotate-180 transition-transform duration-500" />
              )}
              {t("insights.main.regenerate")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== 定期报告区块：列表模式（用于周报） ==========

function PeriodicSectionList({
  config,
  insights,
  onRefresh,
}: {
  config: ReportCardConfig;
  insights: Insight[];
  onRefresh: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      if (config.type === "WEEKLY") {
        const today = new Date();
        const mon = startOfWeek(today, { weekStartsOn: 1 });
        const lastMon = subWeeks(mon, 1);
        await insightAPI.generateWeekly(format(lastMon, "yyyy-MM-dd"));
      } else if (config.type === "MONTHLY") {
        const now = new Date();
        const target = subMonths(now, 1);
        await insightAPI.generateMonthly(getYear(target), getMonth(target) + 1);
      } else if (config.type === "ANNUAL") {
        await insightAPI.generateAnnual(new Date().getFullYear() - 1);
      }
      onRefresh();
    } catch (e: unknown) {
      const err = e as { message?: string; originalError?: { response?: { data?: { detail?: string } } } };
      const backendMsg = err?.originalError?.response?.data?.detail;
      const msg = typeof backendMsg === "string" ? backendMsg : (err?.message || t("insights.theme.generateFailed"));
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {config.icon}
            {t(config.labelKey)}
            {config.isNew && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary"
              >
                NEW
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">{t("insights.theme.generate")}</span>
          </Button>
        </div>
        <CardDescription>{t(config.descriptionKey)}</CardDescription>
      </CardHeader>

      <CardContent>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("insights.theme.noReportClickGenerate")}
          </p>
        ) : (
          <div className="space-y-2">
            {insights.slice(0, 8).map((insight) => (
              <Link
                key={insight.id}
                href={config.href ? config.href(insight.id) : "#"}
              >
                <div
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border",
                    !insight.is_read && "border-l-2 border-l-primary"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {insight.title}
                    </p>
                    {insight.narrative && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {insight.narrative}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {!insight.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(insight.created_at), dateLocale === zhCN || dateLocale === ja ? "M月d日" : "M/d", { locale: dateLocale })}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
            {insights.length > 8 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                还有 {insights.length - 8} 条历史报告
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== 定期报告区块（带历史导航） ==========

function PeriodicSection({
  config,
  insights,
  onRefresh,
  maxHistory,
  historyUnit,
}: {
  config: ReportCardConfig;
  insights: Insight[];
  onRefresh: () => void;
  maxHistory: number;
  historyUnit: "week" | "month" | "year";
}) {
  const [generating, setGenerating] = useState(false);
  // 当前显示的偏移量（0 = 上一期，1 = 上上一期, ...）
  const [offset, setOffset] = useState(0);
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const totalSlots = maxHistory;

  // 根据 offset 计算对应时间段标签
  const getPeriodLabel = (off: number) => {
    const now = new Date();
    if (historyUnit === "week") {
      const mon = startOfWeek(now, { weekStartsOn: 1 });
      const target = subWeeks(mon, off + 1);
      return `${format(target, "M月d日", { locale: zhCN })}那周`;
    } else if (historyUnit === "month") {
      const target = subMonths(now, off + 1);
      return format(target, "yyyy年M月", { locale: zhCN });
    } else {
      return `${now.getFullYear() - off - 1}年`;
    }
  };

  // 根据 offset 找对应报告
  const getInsightForOffset = (off: number): Insight | undefined => {
    const now = new Date();
    return insights.find((ins) => {
      if (!ins.time_period_start) return false;
      const d = new Date(ins.time_period_start);
      if (historyUnit === "week") {
        const mon = startOfWeek(now, { weekStartsOn: 1 });
        const target = subWeeks(mon, off + 1);
        return (
          d.getFullYear() === target.getFullYear() &&
          d.getMonth() === target.getMonth() &&
          d.getDate() === target.getDate()
        );
      } else if (historyUnit === "month") {
        const target = subMonths(now, off + 1);
        return (
          d.getFullYear() === target.getFullYear() &&
          d.getMonth() === target.getMonth()
        );
      } else {
        return d.getFullYear() === now.getFullYear() - off - 1;
      }
    });
  };

  const currentInsight = getInsightForOffset(offset);
  const periodLabel = getPeriodLabel(offset);
  const isAtEnd = offset >= totalSlots - 1;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      if (config.type === "WEEKLY") {
        const mon = startOfWeek(now, { weekStartsOn: 1 });
        const lastMon = subWeeks(mon, offset + 1);
        await insightAPI.generateWeekly(format(lastMon, "yyyy-MM-dd"));
      } else if (config.type === "MONTHLY") {
        const target = subMonths(now, offset + 1);
        const m = getMonth(target) + 1;
        const y = getYear(target);
        await insightAPI.generateMonthly(y, m);
      } else if (config.type === "ANNUAL") {
        await insightAPI.generateAnnual(now.getFullYear() - offset - 1);
      }
      onRefresh();
    } catch (e: unknown) {
      const err = e as { message?: string; originalError?: { response?: { data?: { detail?: string } } } };
      const backendMsg = err?.originalError?.response?.data?.detail;
      const msg = typeof backendMsg === "string" ? backendMsg : (err?.message || t("insights.theme.generateFailed"));
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {config.icon}
            {t(config.labelKey)}
            {config.isNew && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary">
                NEW
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {/* 历史导航箭头 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOffset((o) => Math.min(o + 1, totalSlots - 1))}
              disabled={isAtEnd}
              title={t("insights.theme.viewEarlierReports")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[80px] text-center">
              {periodLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOffset((o) => Math.max(o - 1, 0))}
              disabled={offset === 0}
              title={t("insights.theme.viewRecentReports")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="ml-1"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">{t("insights.theme.generate")}</span>
            </Button>
          </div>
        </div>
        <CardDescription>{t(config.descriptionKey)}</CardDescription>
      </CardHeader>
      <CardContent>
        {isAtEnd && !currentInsight ? (
          <p className="text-sm text-muted-foreground py-3 text-center">
            {t("insights.theme.archivedReports")}
          </p>
        ) : currentInsight ? (
          <Link href={config.href ? config.href(currentInsight.id) : "#"}>
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border",
              !currentInsight.is_read && "border-l-2 border-l-primary"
            )}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{currentInsight.title}</p>
                {currentInsight.narrative && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {currentInsight.narrative}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                {!currentInsight.is_read && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(currentInsight.created_at), dateLocale === zhCN || dateLocale === ja ? "M月d日" : "M/d", { locale: dateLocale })}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {periodLabel}暂无报告
            </p>
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              立即生成
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== 专题分析卡片 ==========

function ThemeReportCard({ 
  config, 
  hasUnread 
}: { 
  config: typeof THEME_REPORTS[0]; 
  hasUnread: boolean;
}) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showAllReports, setShowAllReports] = useState(false);
  
  // 使用 localStorage 保持日期选择状态
  const storageKey = `theme-report-${config.type}`;
  const [customStart, setCustomStart] = useState<Date | undefined>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${storageKey}-start`);
      return saved ? new Date(saved) : subDays(new Date(), 29);
    }
    return subDays(new Date(), 29);
  });
  const [customEnd, setCustomEnd] = useState<Date | undefined>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${storageKey}-end`);
      return saved ? new Date(saved) : new Date();
    }
    return new Date();
  });

  // 保存日期到 localStorage
  useEffect(() => {
    if (customStart) {
      localStorage.setItem(`${storageKey}-start`, customStart.toISOString());
    }
  }, [customStart, storageKey]);

  useEffect(() => {
    if (customEnd) {
      localStorage.setItem(`${storageKey}-end`, customEnd.toISOString());
    }
  }, [customEnd, storageKey]);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await insightAPI.list({ insight_type: config.type, page_size: 10 });
      setInsights(Array.isArray(res?.items) ? res.items : []);
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [config.type]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleGenerate = async () => {
    if (!customStart || !customEnd || customStart > customEnd) {
      toast.error(t("insights.theme.selectValidDateRange"));
      return;
    }
    setGenerating(true);
    try {
      await insightAPI.generateTheme({
        report_type: config.type as "EMOTION_HEALTH" | "SLEEP_QUALITY" | "THEME_PATTERN",
        start_date: format(customStart, "yyyy-MM-dd"),
        end_date: format(customEnd, "yyyy-MM-dd"),
        with_comparison: false,
      });
      await fetchInsights();
    } catch (e: unknown) {
      const err = e as { message?: string; originalError?: { response?: { data?: { detail?: string } } } };
      const backendMsg = err?.originalError?.response?.data?.detail;
      const msg = typeof backendMsg === "string" ? backendMsg : (err?.message || t("insights.theme.generateFailed"));
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!customStart || !customEnd || customStart > customEnd) {
      toast.error(t("insights.theme.endDateBeforeStart"));
      return;
    }
    setRegenerating(true);
    try {
      await insightAPI.generateTheme({
        report_type: config.type as "EMOTION_HEALTH" | "SLEEP_QUALITY" | "THEME_PATTERN",
        start_date: format(customStart, "yyyy-MM-dd"),
        end_date: format(customEnd, "yyyy-MM-dd"),
        with_comparison: false,
      });
      await fetchInsights();
    } catch (e: unknown) {
      const err = e as { message?: string; originalError?: { response?: { data?: { detail?: string } } } };
      const backendMsg = err?.originalError?.response?.data?.detail;
      const msg = typeof backendMsg === "string" ? backendMsg : (err?.message || t("insights.theme.generateFailed"));
      toast.error(msg);
    } finally {
      setRegenerating(false);
    }
  };

  const quickRanges = [
    { label: t("insights.theme.last7Days"), days: 7 },
    { label: t("insights.theme.last30Days"), days: 30 },
    { label: t("insights.theme.last90Days"), days: 90 },
  ];

  const handleQuickRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days - 1);
    setCustomStart(start);
    setCustomEnd(end);
  };

  return (
    <Card className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {config.icon}
            <CardTitle className="text-lg">{t(config.labelKey)}</CardTitle>
          </div>
          {hasUnread && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground"
            >
              NEW
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs leading-relaxed">
          {t(config.descriptionKey)}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between">
        {loading ? (
          <Skeleton className="h-32" />
        ) : insights.length > 0 ? (
          /* 有报告：显示报告列表 */
          <div className="space-y-3">
            {/* 显示最新报告或全部报告 */}
            {(showAllReports ? insights : [insights[0]]).map((insight) => {
              // 从 insight.data 中获取日期范围
              const insightData = insight.data as Record<string, unknown>;
              const period = (insightData.period || {}) as Record<string, string>;
              const dateRange = period.start_date && period.end_date 
                ? `${format(new Date(period.start_date), "MM/dd")}-${format(new Date(period.end_date), "MM/dd")}`
                : "";
              
              return (
                <Link key={insight.id} href={`${config.href}?id=${insight.id}`} className="block">
                  <div
                    className={cn(
                      "p-4 rounded-lg border border-border/70 hover:border-primary/80 hover:shadow-md transition-all cursor-pointer",
                      !insight.is_read && "border-primary/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium line-clamp-1">
                        {t(config.labelKey)} {dateRange}
                      </p>
                      {!insight.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    {insight.narrative && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {insight.narrative}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(insight.created_at), dateLocale === zhCN || dateLocale === ja ? "yyyy年M月d日" : "MMM d, yyyy", { locale: dateLocale })}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              );
            })}
            
            {/* 查看全部报告按钮 */}
            {insights.length > 0 && (
              <button
                onClick={() => setShowAllReports(!showAllReports)}
                className="group w-full py-2 text-xs transition-all cursor-pointer"
              >
                <span className="text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline underline-offset-4 transition-all">
                  {showAllReports ? t("insights.main.collapseReports") : t("insights.main.viewAllReports")}
                </span>
              </button>
            )}
          </div>
        ) : (
          /* 无报告：显示暂无报告 */
          <div className="p-6 rounded-lg border-2 border-dashed border-border/60 text-center">
            <p className="text-sm text-muted-foreground mb-3">{t("insights.main.noReport")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating || !customStart || !customEnd || customStart > customEnd}
              className="group/btn text-primary border-primary/50 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-105 transition-all duration-200"
            >
              {generating ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />{t("insights.theme.generating")}</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5 mr-1.5 group-hover/btn:rotate-180 transition-transform duration-500" />{t("insights.main.generateNow")}</>
              )}
            </Button>
          </div>
        )}

        {/* 底部：紧凑的日期选择器（一行显示） */}
        <div className="mt-4 pt-4 border-t space-y-2">
          {/* 引导提示 */}
          <p className="text-xs text-muted-foreground text-center">
            {t("insights.main.themeGuide")}
          </p>
          
          {/* 快速选择按钮 */}
          <div className="flex justify-center gap-1.5">
            {quickRanges.map((range) => (
              <Button
                key={range.days}
                variant="outline"
                size="sm"
                onClick={() => handleQuickRange(range.days)}
                className={cn(
                  "text-xs h-8 px-3 font-normal transition-all hover:bg-transparent hover:border-primary/80 hover:scale-105",
                  customStart && customEnd && 
                  Math.abs((customEnd.getTime() - customStart.getTime()) / 86400000 + 1 - range.days) < 1
                    ? "border-primary bg-primary/5 text-primary dark:bg-primary/10"
                    : "text-foreground"
                )}
              >
                {range.label}
              </Button>
            ))}
          </div>
          
          {/* 日期选择器 */}
          <div className="flex items-center justify-center gap-1.5">
            <DatePicker
              date={customStart}
              onDateChange={setCustomStart}
              placeholder={t("insights.theme.startDate")}
            />
            <span className="text-xs text-muted-foreground">{t("insights.theme.to")}</span>
            <DatePicker
              date={customEnd}
              onDateChange={setCustomEnd}
              placeholder={t("insights.theme.endDate")}
            />
          </div>
          
          {/* 错误提示（仅在日期无效时显示） */}
          {customStart && customEnd && customStart > customEnd && (
            <div className="text-center">
              <p className="text-xs text-red-500">{t("insights.theme.endDateBeforeStart")}</p>
            </div>
          )}
          
          {/* 底部操作栏 */}
          <div className="flex items-center justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating || !customStart || !customEnd || customStart > customEnd}
              className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-transparent hover:scale-105 transition-all duration-200 group/btn"
            >
              {regenerating ? (
                <><Loader2 className="h-3 w-3 animate-spin mr-1" />{t("insights.theme.generating")}</>
              ) : (
                <><RefreshCw className="h-3 w-3 mr-1 group-hover/btn:rotate-180 transition-transform duration-500" />{t("insights.theme.generateReport")}</>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

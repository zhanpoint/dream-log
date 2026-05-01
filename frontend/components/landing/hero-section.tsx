"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/magicui/border-beam";
import { MagicCard } from "@/components/magicui/magic-card";
import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  BookOpen,
  Brain,
  ImagePlus,
  MessageCircle,
  Mic,
  MoonStar,
  PenSquare,
  Send,
  Sparkles,
  Users,
  BedDouble,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

export default function HeroSection() {
  const { t } = useTranslation();
  const router = useRouter();

  const heroPills = [
    { label: t("marketing.hero.pills.capture"), Icon: PenSquare },
    { label: t("marketing.hero.pills.voice"), Icon: Mic },
    { label: t("marketing.hero.pills.images"), Icon: ImagePlus },
    { label: t("marketing.hero.pills.reports"), Icon: CalendarRange },
    { label: t("marketing.hero.pills.explore"), Icon: BookOpen },
    { label: t("marketing.hero.pills.resonate"), Icon: Users },
  ];

  const previewModules = [
    {
      title: t("marketing.hero.preview.modules.emotion.title"),
      value: "72%",
      description: t("marketing.hero.preview.modules.emotion.description"),
      progress: "72%",
      Icon: BarChart3,
      iconClassName: "bg-fuchsia-400/12 text-fuchsia-300",
      gradientFrom: "#d946ef",
      gradientTo: "#818cf8",
    },
    {
      title: t("marketing.hero.preview.modules.sleep.title"),
      value: "8.1h",
      description: t("marketing.hero.preview.modules.sleep.description"),
      progress: "64%",
      Icon: BedDouble,
      iconClassName: "bg-cyan-400/12 text-cyan-300",
      gradientFrom: "#22d3ee",
      gradientTo: "#38bdf8",
    },
    {
      title: t("marketing.hero.preview.modules.reports.title"),
      value: "12",
      description: t("marketing.hero.preview.modules.reports.description"),
      progress: "82%",
      Icon: CalendarRange,
      iconClassName: "bg-emerald-400/12 text-emerald-300",
      gradientFrom: "#34d399",
      gradientTo: "#22c55e",
    },
    {
      title: t("marketing.hero.preview.modules.symbols.title"),
      value: "186",
      description: t("marketing.hero.preview.modules.symbols.description"),
      progress: "58%",
      Icon: Sparkles,
      iconClassName: "bg-amber-400/12 text-amber-300",
      gradientFrom: "#f59e0b",
      gradientTo: "#fb7185",
    },
    {
      title: t("marketing.hero.preview.modules.community.title"),
      value: "4",
      description: t("marketing.hero.preview.modules.community.description"),
      progress: "76%",
      Icon: Users,
      iconClassName: "bg-violet-400/12 text-violet-300",
      gradientFrom: "#8b5cf6",
      gradientTo: "#ec4899",
    },
    {
      title: t("marketing.hero.preview.modules.messages.title"),
      value: "29",
      description: t("marketing.hero.preview.modules.messages.description"),
      progress: "48%",
      Icon: Send,
      iconClassName: "bg-sky-400/12 text-sky-300",
      gradientFrom: "#38bdf8",
      gradientTo: "#818cf8",
    },
  ];

  return (
    <section
      id="hero"
      className="relative mx-auto mt-12 max-w-[84rem] px-4 pb-6 sm:mt-16 sm:px-6 md:mt-20 md:px-8"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <Badge
          variant="outline"
          className="rounded-full border-primary/20 bg-primary/8 px-4 py-1.5 text-[11px] font-medium tracking-[0.12em] text-primary uppercase"
        >
          {t("marketing.hero.eyebrow")}
        </Badge>

        <h1 className="mt-6 max-w-[12ch] text-4xl font-semibold leading-[1.02] text-balance text-foreground sm:max-w-[13ch] sm:text-5xl md:max-w-[14ch] md:text-6xl lg:text-[5.5rem]">
          {t("marketing.hero.titleLine1")}
          <span className="block bg-gradient-to-r from-primary via-violet-300 to-sky-300 bg-clip-text text-transparent">
            {t("marketing.hero.titleLine2")}
          </span>
        </h1>

        <p className="mt-5 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base md:text-lg">
          {t("marketing.hero.subtitleLine1")}
          <span className="hidden md:inline"> </span>
          <span className="block md:inline">{t("marketing.hero.subtitleLine2")}</span>
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {heroPills.map(({ label, Icon }) => (
            <Badge
              key={label}
              variant="outline"
              className="group relative overflow-hidden rounded-full border-border/70 bg-background/75 px-3.5 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur transition-all duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-primary/30 motion-safe:hover:bg-primary/6 motion-safe:hover:text-foreground dark:border-white/10 dark:bg-white/[0.08] dark:text-white/88 dark:motion-safe:hover:bg-white/[0.12] dark:motion-safe:hover:text-white"
            >
              <Icon className="mr-2 h-3.5 w-3.5 text-primary/90 transition-all duration-300 motion-safe:group-hover:scale-110 motion-safe:group-hover:text-sky-400 dark:motion-safe:group-hover:text-sky-300" />
              {label}
              <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 motion-safe:group-hover:opacity-100 bg-[linear-gradient(120deg,transparent,rgba(99,102,241,0.12),transparent)] dark:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.14),transparent)]" />
            </Badge>
          ))}
        </div>

        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="group relative min-h-12 w-full max-w-xs overflow-hidden rounded-full border border-primary/30 bg-[linear-gradient(135deg,rgba(112,99,255,1),rgba(129,118,255,0.96)_45%,rgba(89,149,255,0.96))] px-6 text-sm font-medium text-white shadow-[0_20px_50px_-24px_rgba(110,103,255,0.95)] transition-all duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_28px_70px_-24px_rgba(110,103,255,1)] motion-safe:active:translate-y-0"
            onClick={() => router.push("/dreams/new")}
          >
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.32),transparent_28%),linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.22)_50%,transparent_72%)] opacity-70 transition-transform duration-700 ease-out motion-safe:group-hover:translate-x-3" />
            <span className="relative z-10 flex items-center gap-2">
              <PenSquare data-icon="inline-start" className="transition-transform duration-300 motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-105" />
              <span>{t("marketing.hero.cta")}</span>
              <ArrowRight data-icon="inline-end" className="transition-transform duration-300 motion-safe:group-hover:translate-x-1" />
            </span>
          </Button>
          <div className="group relative w-full max-w-xs overflow-hidden rounded-full sm:w-auto">
            <BorderBeam
              size={108}
              duration={7}
              delay={1.2}
              borderWidth={1.25}
              colorFrom="#a78bfa"
              colorTo="#7dd3fc"
              className="opacity-75 motion-reduce:hidden"
            />
            <Button
              size="lg"
              variant="outline"
              className="relative min-h-12 w-full rounded-full border-border/70 bg-background/80 px-6 text-sm font-medium text-foreground/82 shadow-[0_16px_40px_-30px_rgba(148,163,184,0.4)] backdrop-blur-xl transition-all duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-primary/30 motion-safe:hover:bg-background motion-safe:hover:text-foreground motion-safe:hover:shadow-[0_24px_60px_-28px_rgba(167,139,250,0.35)] dark:border-white/10 dark:bg-white/[0.08] dark:text-white/88 dark:motion-safe:hover:bg-white/[0.12] dark:motion-safe:hover:text-white dark:motion-safe:hover:shadow-[0_24px_60px_-28px_rgba(167,139,250,0.7)]"
              onClick={() => router.push("/community")}
            >
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(99,102,241,0.05),transparent_38%,rgba(167,139,250,0.08)_70%,transparent)] opacity-90 dark:bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_38%,rgba(167,139,250,0.08)_70%,transparent)]" />
              <span className="relative z-10 flex items-center gap-2">
                <Users data-icon="inline-start" className="transition-transform duration-300 motion-safe:group-hover:scale-105" />
                <span>{t("marketing.hero.secondaryCta")}</span>
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div className="relative mx-auto mt-12 max-w-6xl sm:mt-14 md:mt-16">
        <div className="absolute inset-x-10 top-10 -z-10 h-32 rounded-full bg-primary/20 blur-3xl sm:inset-x-20" />

        <div className="dark overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] shadow-[0_36px_120px_-56px_rgba(0,0,0,0.8)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-border/70 bg-card/80 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="size-3 rounded-full bg-primary/90" />
              <div className="h-2.5 w-20 rounded-full bg-muted sm:w-28" />
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <div className="h-2.5 w-16 rounded-full bg-muted" />
              <div className="h-2.5 w-16 rounded-full bg-muted" />
              <div className="h-2.5 w-16 rounded-full bg-muted" />
            </div>
            <div className="h-9 w-24 rounded-full bg-primary/85 sm:w-40" />
          </div>

          <div className="bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.18),transparent_26%),linear-gradient(180deg,rgba(12,12,15,0.98),rgba(16,16,22,0.98))] px-4 py-5 sm:px-6 sm:py-7 md:px-8">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary/80">
                      {t("marketing.hero.preview.kicker")}
                    </p>
                    <h2 className="mt-3 max-w-2xl text-2xl font-semibold text-white sm:text-3xl md:text-[2.5rem]">
                      {t("marketing.hero.preview.headline")}
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-white/66 sm:text-base">
                      {t("marketing.hero.preview.description")}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2.5">
                      <Badge variant="outline" className="rounded-full border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/75">
                        {t("marketing.hero.preview.record.badges.voice")}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/75">
                        {t("marketing.hero.preview.record.badges.images")}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/75">
                        {t("marketing.hero.preview.record.badges.privacy")}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/75">
                        {t("marketing.hero.preview.record.badges.title")}
                      </Badge>
                    </div>
                  </div>
                  <div className="hidden size-28 shrink-0 items-center justify-center rounded-full bg-primary/25 md:flex">
                    <MoonStar className="h-12 w-12 text-white/90" />
                  </div>
                </div>

                <div className="mt-6 h-3 w-full rounded-full bg-white/10">
                  <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-violet-400 to-sky-400" />
                </div>
                <div className="mt-4 h-2.5 w-[82%] rounded-full bg-white/10" />

                <div className="mt-8 grid gap-5 lg:grid-cols-2">
                  <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                        <PenSquare className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {t("marketing.hero.preview.record.title")}
                        </h3>
                        <p className="text-sm text-white/55">
                          {t("marketing.hero.preview.record.meta")}
                        </p>
                      </div>
                    </div>
                    <p className="mt-5 text-sm text-white/70">
                      {t("marketing.hero.preview.record.keywordsLabel")}
                      <span className="text-white/90"> {t("marketing.hero.preview.record.keywordsValue")}</span>
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/60">
                      {t("marketing.hero.preview.record.note")}
                    </p>
                    <div className="mt-4 flex flex-col gap-3">
                      <div className="h-2.5 w-[78%] rounded-full bg-white/10" />
                      <div className="h-2.5 w-[90%] rounded-full bg-white/10" />
                      <div className="h-2.5 w-[64%] rounded-full bg-white/10" />
                    </div>
                    <Button
                      className="mt-6 h-10 rounded-full px-5 text-sm"
                      onClick={() => router.push("/dreams/new")}
                    >
                      {t("marketing.hero.preview.record.action")}
                    </Button>
                  </div>

                  <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300">
                        <Brain className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {t("marketing.hero.preview.insight.title")}
                        </h3>
                        <p className="text-sm text-white/55">
                          {t("marketing.hero.preview.insight.meta")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 h-2.5 w-[34%] rounded-full bg-sky-400" />
                    <div className="mt-4 flex flex-col gap-3">
                      <div className="h-2.5 w-full rounded-full bg-white/10" />
                      <div className="h-2.5 w-[88%] rounded-full bg-white/10" />
                      <div className="h-2.5 w-[76%] rounded-full bg-white/10" />
                      <div className="h-2.5 w-[58%] rounded-full bg-white/10" />
                    </div>
                    <p className="mt-5 text-sm leading-6 text-white/70">
                      {t("marketing.hero.preview.insight.summary")}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full border-sky-400/18 bg-sky-400/10 px-2.5 py-1 text-[11px] text-sky-200">
                        {t("marketing.hero.preview.insight.badges.emotion")}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-sky-400/18 bg-sky-400/10 px-2.5 py-1 text-[11px] text-sky-200">
                        {t("marketing.hero.preview.insight.badges.sleep")}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-sky-400/18 bg-sky-400/10 px-2.5 py-1 text-[11px] text-sky-200">
                        {t("marketing.hero.preview.insight.badges.reports")}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 self-end sm:grid-cols-2 xl:grid-cols-2">
                {previewModules.map(({ title, value, description, progress, Icon, iconClassName, gradientFrom, gradientTo }) => (
                  <MagicCard
                    key={title}
                    className="rounded-3xl border border-white/8 p-5"
                    gradientSize={180}
                    gradientOpacity={0.18}
                    gradientColor="rgba(99,102,241,0.35)"
                    gradientFrom={gradientFrom}
                    gradientTo={gradientTo}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex size-10 items-center justify-center rounded-2xl ${iconClassName}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">{title}</h3>
                        <p className="text-sm text-white/55">{description}</p>
                      </div>
                    </div>
                    <p className="mt-5 text-3xl font-semibold text-white">{value}</p>
                    <div className="mt-4 h-2.5 w-full rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-400 to-sky-400"
                        style={{ width: progress }}
                      />
                    </div>
                  </MagicCard>
                ))}

                <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-5 sm:col-span-2 xl:block">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/14 text-primary">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {t("marketing.hero.preview.community.title")}
                      </h3>
                      <p className="text-sm text-white/55">
                        {t("marketing.hero.preview.community.subtitle")}
                      </p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-white/70">
                    {t("marketing.hero.preview.community.description")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

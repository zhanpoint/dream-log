 "use client";

import {
  Brain,
  Calendar,
  LineChart,
  Sparkles,
  BookOpen,
  Users,
  MessageCircle,
  MoonStar,
} from "lucide-react";
import { MagicCard } from "@/components/magicui/magic-card";
import { useTranslation } from "react-i18next";
import { ScrollReveal } from "@/components/magicui/scroll-reveal";

export default function FeaturesSection() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Brain,
      title: t("marketing.features.items.ai.title"),
      description: t("marketing.features.items.ai.description"),
      gradientFrom: "#9E7AFF",
      gradientTo: "#FE8BBB",
      gradientColor: "#9E7AFF",
      iconColor: "text-purple-400",
      iconBgColor: "bg-purple-950/50",
    },
    {
      icon: Calendar,
      title: t("marketing.features.items.calendar.title"),
      description: t("marketing.features.items.calendar.description"),
      gradientFrom: "#06B6D4",
      gradientTo: "#3B82F6",
      gradientColor: "#06B6D4",
      iconColor: "text-cyan-400",
      iconBgColor: "bg-cyan-950/50",
    },
    {
      icon: LineChart,
      title: t("marketing.features.items.stats.title"),
      description: t("marketing.features.items.stats.description"),
      gradientFrom: "#8B5CF6",
      gradientTo: "#EC4899",
      gradientColor: "#8B5CF6",
      iconColor: "text-pink-400",
      iconBgColor: "bg-pink-950/50",
    },
    {
      icon: Sparkles,
      title: t("marketing.features.items.reports.title"),
      description: t("marketing.features.items.reports.description"),
      gradientFrom: "#14B8A6",
      gradientTo: "#22C55E",
      gradientColor: "#14B8A6",
      iconColor: "text-emerald-400",
      iconBgColor: "bg-emerald-950/50",
    },
    {
      icon: BookOpen,
      title: t("marketing.features.items.symbols.title"),
      description: t("marketing.features.items.symbols.description"),
      gradientFrom: "#F97316",
      gradientTo: "#F43F5E",
      gradientColor: "#F97316",
      iconColor: "text-orange-400",
      iconBgColor: "bg-orange-950/50",
    },
    {
      icon: MoonStar,
      title: t("marketing.features.items.images.title"),
      description: t("marketing.features.items.images.description"),
      gradientFrom: "#6366F1",
      gradientTo: "#A855F7",
      gradientColor: "#6366F1",
      iconColor: "text-indigo-400",
      iconBgColor: "bg-indigo-950/50",
    },
    {
      icon: Users,
      title: t("marketing.features.items.community.title"),
      description: t("marketing.features.items.community.description"),
      gradientFrom: "#FACC15",
      gradientTo: "#FB7185",
      gradientColor: "#FACC15",
      iconColor: "text-amber-400",
      iconBgColor: "bg-amber-950/50",
    },
    {
      icon: MessageCircle,
      title: t("marketing.features.items.chat.title"),
      description: t("marketing.features.items.chat.description"),
      gradientFrom: "#38BDF8",
      gradientTo: "#818CF8",
      gradientColor: "#38BDF8",
      iconColor: "text-sky-400",
      iconBgColor: "bg-sky-950/50",
    },
  ];

  return (
    <section
      id="features"
      className="mx-auto max-w-[80rem] px-4 py-16 text-center sm:px-6 md:px-8 md:py-20"
    >
      {/* 标题：先进入视野浮现 */}
      <ScrollReveal variant="fade-up">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:mb-6 sm:text-5xl md:text-6xl">
            {t("marketing.features.heading")}
          </h2>
          <p className="mb-10 text-base text-muted-foreground sm:mb-16 sm:text-xl">
            {t("marketing.features.subheading")}
          </p>
        </div>
      </ScrollReveal>

      {/* 卡片网格：统一触发，避免逐个错峰导致“乱/拖沓”的体验 */}
      <ScrollReveal variant="fade-up" delay={0.08}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <MagicCard
                key={idx}
                className="group relative flex h-full flex-col rounded-2xl border border-border p-5 text-left transition-all duration-300 sm:p-6 lg:p-8"
                gradientSize={200}
                gradientFrom={feature.gradientFrom}
                gradientTo={feature.gradientTo}
                gradientColor={feature.gradientColor}
                gradientOpacity={0.6}
              >
                <div className="relative flex-shrink-0 mb-5">
                  <div
                    className={`flex size-12 items-center justify-center rounded-lg border border-border transition-all duration-300 group-hover:scale-105 sm:size-14 ${feature.iconBgColor}`}
                  >
                    <Icon
                      className={`h-7 w-7 transition-transform duration-300 group-hover:scale-110 sm:h-8 sm:w-8 ${feature.iconColor}`}
                    />
                  </div>
                </div>

                <div className="relative flex flex-col flex-grow">
                  <h3 className="mb-2 text-xl font-semibold text-left text-card-foreground sm:mb-3 sm:text-2xl">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {feature.description}
                  </p>
                </div>
              </MagicCard>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}

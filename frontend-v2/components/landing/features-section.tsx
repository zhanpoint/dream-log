"use client";

import { Brain, Calendar, LineChart, Sparkles } from "lucide-react";
import { MagicCard } from "@/components/magicui/magic-card";
import { useTranslation } from "react-i18next";

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
      title: t("marketing.features.items.tips.title"),
      description: t("marketing.features.items.tips.description"),
      gradientFrom: "#F59E0B",
      gradientTo: "#EF4444",
      gradientColor: "#F59E0B",
      iconColor: "text-orange-400",
      iconBgColor: "bg-orange-950/50",
    },
  ];

  return (
    <section
      id="features"
      className="mx-auto max-w-[80rem] px-6 text-center md:px-8 py-14"
    >
      <div className="mx-auto max-w-5xl">
        <h2 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl mb-6">
          {t("marketing.features.heading")}
        </h2>
        <p className="text-xl text-muted-foreground mb-16">
          {t("marketing.features.subheading")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <MagicCard
              key={idx}
              className="group relative flex flex-col h-full text-left p-8 rounded-2xl border border-border transition-all duration-300"
              gradientSize={200}
              gradientFrom={feature.gradientFrom}
              gradientTo={feature.gradientTo}
              gradientColor={feature.gradientColor}
              gradientOpacity={0.6}
            >
              <div className="relative flex-shrink-0 mb-5">
                <div
                  className={`w-14 h-14 flex items-center justify-center rounded-lg border border-border transition-all duration-300 group-hover:scale-105 ${feature.iconBgColor}`}
                >
                  <Icon className={`h-8 w-8 transition-transform duration-300 group-hover:scale-110 ${feature.iconColor}`} />
                </div>
              </div>

              <div className="relative flex flex-col flex-grow">
                <h3 className="text-2xl font-semibold text-left text-card-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-base text-muted-foreground text-left leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </MagicCard>
          );
        })}
      </div>
    </section>
  );
}

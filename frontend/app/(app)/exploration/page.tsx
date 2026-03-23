"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpen, Brain, Moon, Shield, Zap, Heart, Layers } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

const modules = [
  {
    href: "/exploration/symbols",
    icon: BookOpen,
    titleKey: "exploration.main.modules.symbolsTitle",
    descriptionKey: "exploration.main.modules.symbolsDesc",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    href: "/exploration/science",
    icon: Brain,
    titleKey: "exploration.main.modules.scienceTitle",
    descriptionKey: "exploration.main.modules.scienceDesc",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    href: "/exploration/nightmare",
    icon: Shield,
    titleKey: "exploration.main.modules.nightmareTitle",
    descriptionKey: "exploration.main.modules.nightmareDesc",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    href: "/exploration/improvement",
    icon: Moon,
    titleKey: "exploration.main.modules.improvementTitle",
    descriptionKey: "exploration.main.modules.improvementDesc",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  {
    href: "/exploration/lucid",
    icon: Zap,
    titleKey: "exploration.main.modules.lucidTitle",
    descriptionKey: "exploration.main.modules.lucidDesc",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    href: "/exploration/psychology",
    icon: Heart,
    titleKey: "exploration.main.modules.psychologyTitle",
    descriptionKey: "exploration.main.modules.psychologyDesc",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    href: "/exploration/phenomena",
    icon: Layers,
    titleKey: "exploration.main.modules.phenomenaTitle",
    descriptionKey: "exploration.main.modules.phenomenaDesc",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

export default function ExplorationPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-10 space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("exploration.main.title")}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t("exploration.main.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.href} href={mod.href} className="group cursor-pointer">
                <Card className="relative h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border-border/50 hover:border-primary/50">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${mod.bg} transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className={`h-6 w-6 ${mod.color}`} />
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {t(mod.titleKey)}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6 pr-12">
                    <CardDescription className="text-sm leading-relaxed text-muted-foreground/90">
                      {t(mod.descriptionKey)}
                    </CardDescription>
                  </CardContent>
                  
                  {/* 箭头指示器 */}
                  <div className="absolute bottom-6 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <div className={`p-1.5 rounded-full ${mod.bg}`}>
                      <ArrowRight className={`h-4 w-4 ${mod.color}`} />
                    </div>
                  </div>
                  
                  {/* 悬浮光效 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

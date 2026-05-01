"use client";

import { ScrollReveal } from "@/components/magicui/scroll-reveal";
import { useTranslation } from "react-i18next";

const BLOCK_KEYS = ["origin", "meaning", "value", "trace"] as const;

export default function MysterySection() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 md:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-52 w-52 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-10">
        <ScrollReveal variant="fade-up">
          <div className="mx-auto max-w-2xl text-left">
            <p className="text-[1.02rem] leading-8 text-foreground/88 dark:text-white/84 sm:text-[1.08rem] sm:leading-9">
              {t("marketing.mystery.intro")}
            </p>
          </div>
        </ScrollReveal>

        <div className="flex w-full flex-col gap-12">
          {BLOCK_KEYS.map((key, index) => (
            <ScrollReveal
              key={key}
              variant="fade-up"
              delay={0.06 * index}
              className="border-t border-border/70 pt-8 dark:border-white/8"
            >
              <div className="mx-auto max-w-2xl text-left">
                <p className="text-[1.02rem] leading-8 text-foreground/88 dark:text-white/84 sm:text-[1.08rem] sm:leading-9">
                  {t(`marketing.mystery.blocks.${key}.body1`)}
                </p>
                <p className="mt-5 text-[1rem] leading-8 text-muted-foreground dark:text-white/68 sm:text-[1.04rem] sm:leading-9">
                  {t(`marketing.mystery.blocks.${key}.body2`)}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

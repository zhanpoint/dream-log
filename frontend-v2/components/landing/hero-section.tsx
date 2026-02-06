"use client";

import { BorderBeam } from "@/components/magicui/border-beam";
import TextShimmer from "@/components/magicui/text-shimmer";
import { ShinyButton } from "@/components/ui/shiny-button";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

export default function HeroSection() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <section
      id="hero"
      className="relative mx-auto mt-32 max-w-[80rem] px-6 text-center md:px-8"
    >
      <div className="hero-tag backdrop-filter-[12px] inline-flex h-8 items-center justify-between rounded-full border border-border/50 bg-accent/90 px-4 text-sm transition-all ease-in hover:cursor-pointer hover:bg-accent group gap-1 translate-y-[-1rem] animate-fade-in opacity-0">
        <TextShimmer className="inline-flex items-center justify-center">
          <span className="font-medium hero-tag-text">
            {t("marketing.hero.tag")}
          </span>{" "}
          <ArrowRightIcon className="ml-1 size-4 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5 hero-tag-icon" />
        </TextShimmer>
      </div>
      <h1 className="hero-title bg-clip-text py-6 text-5xl font-medium leading-none tracking-tighter text-transparent text-balance sm:text-6xl md:text-7xl lg:text-8xl translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
        {t("marketing.hero.titleLine1")}
        <br className="hidden md:block" /> {t("marketing.hero.titleLine2")}
      </h1>
      <p className="hero-subtitle mb-12 text-xl tracking-tight md:text-2xl text-balance translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
        {t("marketing.hero.subtitleLine1")}
        <br className="hidden md:block" /> {t("marketing.hero.subtitleLine2")}
      </p>
      <ShinyButton className="translate-y-[-1rem] animate-fade-in opacity-0 ease-in-out [--animation-delay:600ms] text-base">
        {t("marketing.hero.cta")}
        <ArrowRightIcon className="size-5 transition-transform duration-300 ease-in-out group-hover:translate-x-1" />
      </ShinyButton>
      <div
        ref={ref}
        className="relative mt-[8rem] animate-fade-up opacity-0 [--animation-delay:400ms] [perspective:2000px] after:absolute after:inset-0 after:z-50 after:[background:linear-gradient(to_top,hsl(var(--background))_30%,transparent)]"
      >
        <div
          className={`relative overflow-hidden rounded-xl border border-white/10 bg-white bg-opacity-[0.01] before:absolute before:bottom-1/2 before:left-0 before:top-0 before:h-full before:w-full before:opacity-0 before:[filter:blur(180px)] before:[background-image:linear-gradient(to_bottom,var(--color-one),var(--color-one),transparent_40%)] before:z-0 ${
            inView ? "before:animate-image-glow" : ""
          }`}
        >
          <BorderBeam
            size={400}
            duration={8}
            delay={0}
            borderWidth={2.5}
            colorFrom="#a78bfa"
            colorTo="#c084fc"
            className="z-10"
          />

          <img
            src="/dream-hero-dark.svg"
            alt="Dream Log Hero"
            className="hero-image-dark relative z-0 w-full h-full rounded-[inherit] border object-contain"
          />
          <img
            src="/dream-hero-light.svg"
            alt="Dream Log Hero"
            className="hero-image-light relative z-0 w-full h-full rounded-[inherit] border object-contain"
          />
        </div>
      </div>
    </section>
  );
}

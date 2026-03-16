"use client";

import HeroSection from "@/components/landing/hero-section";
import FeaturesSection from "@/components/landing/features-section";
import TestimonialsSection from "@/components/landing/testimonials-section";
import PricingSection from "@/components/landing/pricing-section";
import Particles from "@/components/magicui/particles";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Page() {
  const { theme } = useTheme();
  const [particleColor, setParticleColor] = useState("#c4b5fd");

  useEffect(() => {
    // 根据主题设置粒子颜色 - 使用更亮的颜色提高亮度
    setParticleColor(theme === "dark" ? "#c4b5fd" : "#a78bfa");
  }, [theme]);

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <Particles
        className="absolute inset-0 -z-10"
        quantity={220}
        ease={70}
        size={0.32}
        staticity={40}
        color={particleColor}
        refresh={theme === "dark"}
      />
    </>
  );
}

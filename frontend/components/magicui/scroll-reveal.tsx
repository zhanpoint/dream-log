"use client";

import type { JSX, ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

type ScrollRevealVariant =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "scale"
  | "rotate";

const variants: Record<ScrollRevealVariant, Variants> = {
  "fade-up": {
    hidden: { opacity: 0, y: 32, filter: "blur(6px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
  },
  "fade-down": {
    hidden: { opacity: 0, y: -32, filter: "blur(6px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
  },
  "fade-left": {
    hidden: { opacity: 0, x: -40, filter: "blur(8px)" },
    visible: { opacity: 1, x: 0, filter: "blur(0px)" },
  },
  "fade-right": {
    hidden: { opacity: 0, x: 40, filter: "blur(8px)" },
    visible: { opacity: 1, x: 0, filter: "blur(0px)" },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.9, filter: "blur(6px)" },
    visible: { opacity: 1, scale: 1, filter: "blur(0px)" },
  },
  rotate: {
    hidden: { opacity: 0, rotateX: -12, y: 20, filter: "blur(10px)" },
    visible: { opacity: 1, rotateX: 0, y: 0, filter: "blur(0px)" },
  },
};

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /**
   * 动画变体，用于控制方向/风格
   */
  variant?: ScrollRevealVariant;
  /**
   * 延迟（秒），用于网格中依次浮现
   */
  delay?: number;
  /**
   * 时长（秒）
   */
  duration?: number;
  /**
   * 是否仅在首次进入视口时触发
   */
  once?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

export function ScrollReveal({
  children,
  className,
  variant = "fade-up",
  delay = 0,
  duration = 0.55,
  once = true,
  as = "div",
}: ScrollRevealProps) {
  const reducedMotion = useReducedMotion();
  const MotionTag = motion[as as "div"];

  if (reducedMotion) {
    return <MotionTag className={cn(className)}>{children}</MotionTag>;
  }

  return (
    <MotionTag
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.16, margin: "0px 0px -60px 0px" }}
      variants={variants[variant]}
      transition={{
        delay,
        duration,
        ease: [0.2, 0.75, 0.3, 1],
      }}
    >
      {children}
    </MotionTag>
  );
}


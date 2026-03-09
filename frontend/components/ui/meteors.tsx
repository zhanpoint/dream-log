"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type MeteorsProps = {
  number?: number;
  minDelay?: number;
  maxDelay?: number;
  minDuration?: number;
  maxDuration?: number;
  angle?: number;
  className?: string;
};

export function Meteors({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
  className,
}: MeteorsProps) {
  const [meteorStyles, setMeteorStyles] = useState<React.CSSProperties[]>([]);

  useEffect(() => {
    const styles = [...new Array(number)].map((_, i) => {
      // 将流星均匀分布在整个时间轴上，避免空窗期
      const baseDelay = (i / number) * (maxDuration + maxDelay);
      const randomOffset = Math.random() * 2;
      
      return {
        ["--angle" as string]: -angle + "deg",
        top: "-5%",
        left: `calc(0% + ${Math.floor(Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1920))}px)`,
        animationDelay: (baseDelay + randomOffset) + "s",
        animationDuration:
          Math.floor(Math.random() * (maxDuration - minDuration) + minDuration) +
          "s",
      };
    });
    setMeteorStyles(styles);
  }, [number, minDelay, maxDelay, minDuration, maxDuration, angle]);

  return (
    <>
      {meteorStyles.map((style, idx) => (
        <span
          key={idx}
          style={style}
          className={cn(
            "pointer-events-none absolute size-0.5 rotate-[var(--angle)] animate-meteor rounded-full bg-white/75 shadow-[0_0_2px_rgba(255,255,255,0.4)]",
            className
          )}
        >
          <div className="pointer-events-none absolute top-1/2 -z-10 h-px w-[60px] -translate-y-1/2 bg-gradient-to-r from-white/75 to-transparent" />
        </span>
      ))}
    </>
  );
}

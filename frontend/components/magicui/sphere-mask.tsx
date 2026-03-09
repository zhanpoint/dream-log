"use client";

import { cn } from "@/lib/utils";

export const SphereMask = ({ reverse = false }: { reverse?: boolean }) => {
  return (
    <div
      className={cn(
        "pointer-events-none relative -z-[2] mx-auto h-[30rem] overflow-visible",
        reverse ? "my-[-15rem] rotate-180 md:mt-[-20rem]" : "my-[-12rem]"
      )}
    >
      {/* 大气辉光效果 - 模拟行星大气层日出/辉光 */}
      {/* 地平线弧线 */}
      <div
        className={cn(
          "absolute -left-1/2 top-1/2 w-[200%] aspect-[1/0.7] rounded-[50%] z-10 relative",
          "before:content-[''] before:absolute before:left-1/2 before:top-0 before:-translate-x-1/2 before:-translate-y-[92%] before:w-[120%] before:h-[28rem] before:rounded-[50%] before:-z-10",
          "before:bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(255,255,255,0.85)_0%,rgba(255,220,140,0.55)_18%,rgba(255,170,70,0.25)_42%,transparent_76%)]",
          "before:blur-[70px] before:opacity-100",
          "dark:before:bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(255,255,255,0.78)_0%,rgba(255,220,150,0.55)_18%,rgba(255,180,90,0.28)_42%,transparent_76%)]",
          "border-t-[2px]",
          "border-amber-600/100 dark:border-amber-200/90",
          "shadow-[0_-2px_40px_rgba(255,215,0,0.7)] dark:shadow-[0_-2px_50px_rgba(255,215,0,0.6)]",
          "[mask-image:linear-gradient(to_right,transparent_10%,white_50%,transparent_90%)]"
        )}
      />
    </div>
  );
};

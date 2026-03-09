"use client";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useMemo } from "react";

interface EChartsWrapperProps {
  option: EChartsOption;
  height?: string | number;
  className?: string;
}

export function EChartsWrapper({
  option,
  height = 300,
  className,
}: EChartsWrapperProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const themeOption = useMemo<EChartsOption>(
    () => ({
      backgroundColor: "transparent",
      textStyle: {
        color: isDark ? "#a1a1aa" : "#71717a",
        fontFamily: "inherit",
      },
      ...option,
    }),
    [option, isDark]
  );

  return (
    <ReactECharts
      option={themeOption}
      style={{ height, width: "100%" }}
      className={className}
      theme={isDark ? "dark" : undefined}
      opts={{ renderer: "svg" }}
      notMerge
    />
  );
}

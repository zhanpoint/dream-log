import React from "react";
import { cn } from "@/utils/ui";

export const PulsatingButton = React.forwardRef((
  {
    className,
    children,
    // Magic UI 文档要求传入 rgb 数字字符串，例如 "158 122 255"
    pulseColor = "158 122 255",
    duration = "2.4s",
    ...props
  },
  ref,
) => {
  return (
    <button
      ref={ref}
      className={cn(
        "relative flex cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2 text-center text-primary-foreground",
        className
      )}
      style={
        {
          "--pulse-color": pulseColor,
          "--duration": duration
        }
      }
      {...props}>
      <div className="relative z-10">{children}</div>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-full -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-lg bg-inherit"
        aria-hidden="true"
      />
    </button>
  );
});

PulsatingButton.displayName = "PulsatingButton";

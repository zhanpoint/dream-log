import * as React from "react";
import { cn } from "@/lib/utils";

interface ShinyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function ShinyButton({
  children,
  className,
  ...props
}: ShinyButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-lg",
        "border border-primary/20 bg-gradient-to-r from-primary via-primary to-primary/80",
        "px-6 py-2.5 font-medium text-primary-foreground",
        "shadow-lg shadow-primary/25",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30",
        "active:scale-[0.98]",
        "dark:border-primary/30 dark:from-primary dark:via-primary dark:to-primary/90 dark:shadow-primary/20 dark:hover:shadow-primary/30",
        className
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      
      {/* Shine effect */}
      <span
        className={cn(
          "absolute inset-0 -z-0 animate-shimmer opacity-0 transition-opacity duration-1000 group-hover:opacity-100",
          "bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.3),transparent)] bg-[length:200%_100%]",
          "dark:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.2),transparent)]"
        )}
      />
    </button>
  );
}

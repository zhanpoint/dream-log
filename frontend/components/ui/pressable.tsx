import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/**
 * A semantic, automation-friendly click target.
 *
 * - Default: renders a real <button type="button">.
 * - asChild: lets you pass a semantic child (e.g. <a>, <Link> wrapped anchor)
 *   while keeping all className/handlers on the child via Radix Slot.
 *
 * NOTE: We keep this intentionally minimal so it never changes visual styles.
 */
export interface PressableProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  asChild?: boolean;
  type?: "button" | "submit" | "reset";
}

export const Pressable = React.forwardRef<HTMLButtonElement, PressableProps>(
  ({ asChild = false, className, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(className)}
        // Only applies when Comp is a real <button>. Slot will pass through
        // and child decides whether 'type' is valid.
        type={asChild ? undefined : type}
        {...props}
      />
    );
  }
);

Pressable.displayName = "Pressable";


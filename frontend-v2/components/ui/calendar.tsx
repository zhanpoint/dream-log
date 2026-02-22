"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-6 [--cell-size:3.25rem] bg-popover text-popover-foreground",
        className
      )}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("flex flex-col gap-8", defaultClassNames.months),
        month: cn("flex flex-col gap-6", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex items-center justify-between px-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 hover:bg-primary/20 dark:hover:bg-primary/40 hover:text-primary transition-colors",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 hover:bg-primary/20 dark:hover:bg-primary/40 hover:text-primary transition-colors",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-9 items-center justify-center font-medium text-sm",
          defaultClassNames.month_caption
        ),
        caption_label: cn("text-sm font-medium", defaultClassNames.caption_label),
        table: "w-full",
        weekdays: cn("grid grid-cols-7 gap-2 mt-3", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground h-8 text-center text-sm font-medium flex items-center justify-center",
          defaultClassNames.weekday
        ),
        week: cn("grid grid-cols-7 gap-2 mt-2", defaultClassNames.week),
        day: cn(
          "group/day relative flex items-center justify-center p-0",
          defaultClassNames.day
        ),
        today: cn(
          "font-semibold",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground/50 aria-selected:text-muted-foreground/50",
          defaultClassNames.outside
        ),
        disabled: cn("text-muted-foreground/30 cursor-not-allowed", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("h-5 w-5", className)} />
          }
          return <ChevronRightIcon className={cn("h-5 w-5", className)} />
        },
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      className={cn(
        "h-[--cell-size] w-[--cell-size] p-0 font-normal rounded-lg",
        "hover:bg-primary/15 hover:text-primary hover:scale-105",
        "focus-visible:ring-2 focus-visible:ring-primary/20",
        "transition-all duration-200",
        modifiers.selected && "bg-primary/30 text-primary hover:bg-primary/35 hover:text-primary scale-110 font-semibold",
        modifiers.today && !modifiers.selected && "bg-primary/5 font-semibold border border-primary/20",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }

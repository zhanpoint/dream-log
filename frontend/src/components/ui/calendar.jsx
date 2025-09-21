import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/utils/ui"
import { buttonVariants } from "@/components/ui/button.jsx"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full table-fixed border-collapse",
                head_row: "",
                head_cell:
                    "text-muted-foreground text-center font-normal text-[0.8rem] h-9 w-9",
                row: "",
                cell: "p-0 text-center text-sm relative focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-blue-500/10 dark:[&:has([aria-selected])]:bg-blue-400/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-blue-600/10 dark:hover:bg-blue-400/10"
                ),
                day_selected:
                    "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700",
                day_today: "bg-gray-200 text-gray-900 dark:bg-gray-700/60 dark:text-gray-100",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle:
                    "aria-selected:bg-transparent aria-selected:text-inherit dark:aria-selected:bg-transparent",
                day_hidden: "invisible",
                ...classNames,
            }}
            components={{
                IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar } 
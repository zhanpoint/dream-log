"use client"

import * as React from "react"
import { format } from "date-fns"
import { zhCN, enUS, ja } from "date-fns/locale"
import type { Locale } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// 根据 i18n 语言代码获取 date-fns locale
function getDateLocale(lang: string): Locale {
  switch (lang) {
    case "zh-CN":
      return zhCN;
    case "ja":
      return ja;
    case "en":
    default:
      return enUS;
  }
}

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  className?: string
  placeholder?: string
}

export function DatePicker({
  date,
  onDateChange,
  className,
  placeholder,
}: DatePickerProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = getDateLocale(i18n.language)
  const [open, setOpen] = React.useState(false)
  
  // 根据语言设置日期格式
  const dateFormat = dateLocale === zhCN || dateLocale === ja ? "yyyy年M月d日" : "MMM d, yyyy"
  const defaultPlaceholder = dateLocale === zhCN ? "选择日期" : dateLocale === ja ? "日付を選択" : "Select date"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "group justify-start text-left font-normal",
            "border-border/60 hover:border-primary/50 hover:bg-transparent",
            "hover:scale-[1.02] active:scale-[0.98]",
            "transition-all duration-300",
            "focus-visible:ring-2 focus-visible:ring-primary/20",
            "shadow-none",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-foreground group-hover:text-primary transition-colors" />
          {date ? (
            <span className="font-medium text-foreground">
              {format(date, dateFormat, { locale: dateLocale })}
            </span>
          ) : (
            <span>{placeholder || defaultPlaceholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 border-border" 
        align="start"
        sideOffset={8}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(nextDate) => {
            onDateChange?.(nextDate)
            if (nextDate) {
              setOpen(false)
            }
          }}
          initialFocus
          locale={dateLocale}
        />
      </PopoverContent>
    </Popover>
  )
}

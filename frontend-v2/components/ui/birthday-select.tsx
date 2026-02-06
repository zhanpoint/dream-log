"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BirthdaySelectProps {
  value?: string; // ISO date string (YYYY-MM-DD)
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function BirthdaySelect({ value, onChange, disabled }: BirthdaySelectProps) {
  const { t } = useTranslation();

  // 解析当前日期值
  const parseDate = (dateStr?: string) => {
    if (!dateStr) return { year: "", month: "", day: "" };
    const [year, month, day] = dateStr.split("-");
    // 移除前导零以便与选项值匹配
    return {
      year,
      month: month ? parseInt(month, 10).toString() : "",
      day: day ? parseInt(day, 10).toString() : "",
    };
  };

  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");

  // 生成年份选项（1900 - 当前年份）
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

  // 生成月份选项（1-12）
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 生成日期选项（根据年月计算天数）
  const getDaysInMonth = (year: string, month: string) => {
    if (!year || !month) return 31;
    const y = parseInt(year);
    const m = parseInt(month);
    return new Date(y, m, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const clampDay = (y: string, m: string, d: string) => {
    if (!y || !m || !d) return d;
    const maxDay = getDaysInMonth(y, m);
    return Math.min(parseInt(d), maxDay).toString();
  };

  const commitChange = (y: string, m: string, d: string) => {
    if (!y || !m || !d) return;
    const normalizedDay = clampDay(y, m, d).padStart(2, "0");
    const dateStr = `${y}-${m.padStart(2, "0")}-${normalizedDay}`;
    onChange?.(dateStr);
  };

  const updateDate = (nextYear?: string, nextMonth?: string, nextDay?: string) => {
    const y = nextYear ?? year;
    const m = nextMonth ?? month;
    const d = nextDay ?? day;
    const normalizedDay = clampDay(y, m, d);

    if (nextYear !== undefined) setYear(y);
    if (nextMonth !== undefined) setMonth(m);
    if (nextDay !== undefined || normalizedDay !== day) setDay(normalizedDay);

    commitChange(y, m, normalizedDay);
  };

  useEffect(() => {
    const parsed = parseDate(value);
    setYear(parsed.year);
    setMonth(parsed.month);
    setDay(parsed.day);
  }, [value]);

  return (
    <div className="flex gap-2">
      {/* 年份选择 */}
      <Select value={year} onValueChange={(v) => updateDate(v, undefined, undefined)} disabled={disabled}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={t("settings.profile.yearPlaceholder", "年")}>
            {year ? `${year} ${t("settings.profile.year", "年")}` : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 月份选择 */}
      <Select value={month} onValueChange={(v) => updateDate(undefined, v, undefined)} disabled={disabled}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={t("settings.profile.monthPlaceholder", "月")}>
            {month ? `${month} ${t("settings.profile.month", "月")}` : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m} value={m.toString()}>
              {m} {t("settings.profile.month", "月")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 日期选择 */}
      <Select value={day} onValueChange={(v) => updateDate(undefined, undefined, v)} disabled={disabled}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={t("settings.profile.dayPlaceholder", "日")}>
            {day ? `${day} ${t("settings.profile.day", "日")}` : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {days.map((d) => (
            <SelectItem key={d} value={d.toString()}>
              {d} {t("settings.profile.day", "日")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

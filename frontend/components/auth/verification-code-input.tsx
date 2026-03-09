"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface VerificationCodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function VerificationCodeInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  className,
}: VerificationCodeInputProps) {
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);

  // 确保 value 不超过指定长度
  const sanitizedValue = value.slice(0, length);

  const handleChange = (index: number, inputValue: string) => {
    // 只允许数字输入
    const numericValue = inputValue.replace(/\D/g, "");

    if (numericValue.length === 0) {
      // 删除当前位
      const newValue =
        sanitizedValue.slice(0, index) + sanitizedValue.slice(index + 1);
      onChange(newValue);
      return;
    }

    if (numericValue.length === 1) {
      // 单个数字输入
      const newValue =
        sanitizedValue.slice(0, index) +
        numericValue +
        sanitizedValue.slice(index + 1);
      onChange(newValue);

      // 自动聚焦下一个输入框
      if (index < length - 1) {
        inputsRef.current[index + 1]?.focus();
      }

      // 检查是否完成
      if (newValue.length === length && onComplete) {
        onComplete(newValue);
      }
    } else if (numericValue.length > 1) {
      // 粘贴多个数字
      const pastedValue = numericValue.slice(0, length);
      onChange(pastedValue);

      // 聚焦到最后一个填充的输入框或最后一个输入框
      const focusIndex = Math.min(pastedValue.length - 1, length - 1);
      inputsRef.current[focusIndex]?.focus();

      // 检查是否完成
      if (pastedValue.length === length && onComplete) {
        onComplete(pastedValue);
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (sanitizedValue[index]) {
        // 当前位有值,删除当前位
        const newValue =
          sanitizedValue.slice(0, index) + sanitizedValue.slice(index + 1);
        onChange(newValue);
      } else if (index > 0) {
        // 当前位没有值,删除前一位并聚焦
        const newValue =
          sanitizedValue.slice(0, index - 1) + sanitizedValue.slice(index);
        onChange(newValue);
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const numericValue = pastedData.replace(/\D/g, "").slice(0, length);
    onChange(numericValue);

    // 聚焦到最后一个填充的输入框或最后一个输入框
    const focusIndex = Math.min(numericValue.length - 1, length - 1);
    inputsRef.current[focusIndex]?.focus();

    // 检查是否完成
    if (numericValue.length === length && onComplete) {
      onComplete(numericValue);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className={cn("flex gap-2 justify-center", className)}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={sanitizedValue[index] || ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={handleFocus}
          disabled={disabled}
          className={cn(
            "h-12 w-12 text-center text-lg font-semibold rounded-lg border-2 bg-background transition-all duration-200",
            "focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-md focus-visible:shadow-primary/10",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-destructive focus-visible:border-destructive"
              : sanitizedValue[index]
              ? "border-primary"
              : "border-border"
          )}
          aria-label={`验证码第 ${index + 1} 位`}
        />
      ))}
    </div>
  );
}

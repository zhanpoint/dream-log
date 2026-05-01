"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeChatOAuthButtonProps {
  onLogin: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const WeChatIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9.73 5C5.46 5 2 7.84 2 11.34c0 2.03 1.17 3.84 2.99 5.01l-.76 2.25 2.64-1.32c.9.23 1.85.35 2.86.35.24 0 .48-.01.71-.03-.45-.8-.7-1.7-.7-2.66 0-3.37 3.07-6.1 6.86-6.1.35 0 .69.02 1.02.08C16.76 6.63 13.5 5 9.73 5Z"
      fill="#34C759"
    />
    <path
      d="M15.87 10.2c-3.01 0-5.45 2.03-5.45 4.54 0 1.44.8 2.72 2.06 3.55l-.52 1.7 1.93-.97c.62.16 1.28.24 1.98.24 3.01 0 5.45-2.03 5.45-4.52 0-2.51-2.44-4.54-5.45-4.54Z"
      fill="#34C759"
      fillOpacity="0.88"
    />
    <circle cx="7.28" cy="10.2" r="0.72" fill="white" />
    <circle cx="12.16" cy="10.2" r="0.72" fill="white" />
    <circle cx="14.33" cy="14.2" r="0.62" fill="white" />
    <circle cx="17.5" cy="14.2" r="0.62" fill="white" />
  </svg>
);

export function WeChatOAuthButton({
  onLogin,
  disabled = false,
  className,
}: WeChatOAuthButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onLogin();
    } catch (error) {
      console.error("WeChat OAuth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        "w-full text-foreground group",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10",
        "border-border/60 hover:border-border",
        className
      )}
      size="lg"
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <span className="transition-transform duration-300 ease-out group-hover:scale-110">
          <WeChatIcon />
        </span>
      )}
      <span className="ml-2">{t("auth.continueWithWeChat")}</span>
    </Button>
  );
}

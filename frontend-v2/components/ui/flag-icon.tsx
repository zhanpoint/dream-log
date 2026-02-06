"use client";

import "@/styles/ui/flag-icon.css";

const FLAG_ICONS: Record<string, React.ReactNode> = {
  "zh-CN": (
    <svg className="flag-icon" viewBox="0 0 24 16" fill="none">
      <rect width="24" height="16" fill="#EE1C25" />
      <g fill="#FFDE00">
        <polygon points="3,2 4,5 7,5 4.5,7 5.5,10 3,8 0.5,10 1.5,7 -1,5 2,5" />
        <polygon points="8,1 8.5,2.5 10,2.5 9,3.5 9.5,5 8,4 6.5,5 7,3.5 6,2.5 7.5,2.5" />
        <polygon points="10,3 10.5,4.5 12,4.5 11,5.5 11.5,7 10,6 8.5,7 9,5.5 8,4.5 9.5,4.5" />
        <polygon points="10,6 10.5,7.5 12,7.5 11,8.5 11.5,10 10,9 8.5,10 9,8.5 8,7.5 9.5,7.5" />
        <polygon points="8,8 8.5,9.5 10,9.5 9,10.5 9.5,12 8,11 6.5,12 7,10.5 6,9.5 7.5,9.5" />
      </g>
    </svg>
  ),
  en: (
    <svg className="flag-icon" viewBox="0 0 24 16" fill="none">
      <rect width="24" height="16" fill="#B22234" />
      <g fill="#FFF">
        <rect width="24" height="1.23" y="1.23" />
        <rect width="24" height="1.23" y="3.69" />
        <rect width="24" height="1.23" y="6.15" />
        <rect width="24" height="1.23" y="8.62" />
        <rect width="24" height="1.23" y="11.08" />
        <rect width="24" height="1.23" y="13.54" />
      </g>
      <rect width="9.6" height="8.62" fill="#3C3B6E" />
    </svg>
  ),
  ja: (
    <svg className="flag-icon" viewBox="0 0 24 16" fill="none">
      <rect width="24" height="16" fill="#FFF" />
      <circle cx="12" cy="8" r="4.8" fill="#BC002D" />
    </svg>
  ),
};

export type FlagIconSize = "sm" | "md" | "lg";

export function FlagIcon({
  countryCode,
  className = "",
  size = "md",
  ...props
}: {
  countryCode: string;
  className?: string;
  size?: FlagIconSize;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const icon = FLAG_ICONS[countryCode];
  const sizeClass = `flag-icon-${size}`;

  if (!icon) {
    return (
      <span
        className={`flag-icon flag-icon-fallback ${sizeClass} ${className}`}
        aria-label={`Flag of ${countryCode}`}
        {...props}
      >
        {countryCode?.toUpperCase().slice(0, 2) || "??"}
      </span>
    );
  }

  return (
    <span
      className={`flag-icon ${sizeClass} ${className}`}
      aria-label={`Flag of ${countryCode}`}
      {...props}
    >
      {icon}
    </span>
  );
}

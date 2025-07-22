import React from "react";
import { cn } from "@/lib/utils";

/**
 * 加载中的Spinner组件
 * 
 * @param {Object} props
 * @param {string} props.className - 额外的CSS类名
 * @param {string} props.size - 大小 (sm, md, lg)
 * @param {string} props.variant - 变体 (default, primary, secondary)
 */
export const Spinner = ({
    className,
    size = "md",
    variant = "default",
    ...props
}) => {
    // 大小映射
    const sizeMap = {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8"
    };

    // 变体颜色映射
    const variantMap = {
        default: "text-gray-400",
        primary: "text-purple-500",
        secondary: "text-blue-500"
    };

    return (
        <div
            className={cn(
                "animate-spin",
                sizeMap[size] || sizeMap.md,
                variantMap[variant] || variantMap.default,
                className
            )}
            {...props}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="w-full h-full"
            >
                <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                />
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
            </svg>
        </div>
    );
};

export default Spinner; 
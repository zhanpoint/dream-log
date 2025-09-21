/*
SVG圆弧进度条组件
提供宁静优雅的等待体验
*/
import React from 'react';
import { cn } from '@/utils/ui';

const CircularProgress = ({
    progress = 0,
    size = 120,
    strokeWidth = 8,
    className = "",
    children
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className={cn("relative inline-flex items-center justify-center", className)}>
            <svg
                className="transform -rotate-90"
                width={size}
                height={size}
            >
                {/* 背景圆环 */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-muted/20"
                />
                {/* 进度圆环 */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="text-primary transition-all duration-1000 ease-out"
                    style={{
                        filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.3))'
                    }}
                />
            </svg>
            {/* 中心内容 */}
            <div className="absolute inset-0 flex items-center justify-center">
                {children}
            </div>
        </div>
    );
};

export default CircularProgress;

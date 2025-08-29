/*
极简梦境进度指示器
以优雅的抽象弧线呈现进度，符合梦境美学
*/
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const DreamProgressIndicator = ({
    progress = 0,
    size = 140,
    className = "",
    children
}) => {
    // 优雅的螺旋弧线（更有流动感，符合意识流动）
    const dreamArcPath = "M30 70 C 20 30, 60 10, 70 50 C 80 10, 120 30, 110 70 C 120 110, 80 130, 70 90 C 60 130, 20 110, 30 70";

    // 动态计算路径长度，保证不同size下过渡更自然
    const progressPathRef = useRef(null);
    const [pathLength, setPathLength] = useState(350);
    useEffect(() => {
        if (progressPathRef.current && typeof progressPathRef.current.getTotalLength === 'function') {
            try {
                setPathLength(progressPathRef.current.getTotalLength());
            } catch (_) {
                // ignore getTotalLength errors in some environments
            }
        }
    }, [size]);

    const strokeDasharray = pathLength;
    const strokeDashoffset = pathLength - (progress / 100) * pathLength;

    return (
        <div className={cn("relative inline-flex items-center justify-center", className)}>
            {/* 简洁背景 */}
            <div
                className="absolute inset-0 rounded-full opacity-10"
                style={{
                    background: `radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 60%)`
                }}
            />

            <svg
                width={size}
                height={size}
                viewBox="0 0 140 140"
                className="drop-shadow-md"
            >
                {/* 简化渐变与光效 */}
                <defs>
                    <linearGradient id="dreamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.7" />
                    </linearGradient>

                    <filter id="softGlow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feOffset in="coloredBlur" dx="0" dy="0" result="offsetBlur" />
                        <feMerge>
                            <feMergeNode in="offsetBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="innerShadow">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                        <feComposite in="blur" in2="SourceGraphic" operator="over" result="composite" />
                    </filter>
                </defs>

                {/* 背景轨迹 */}
                <path
                    d={dreamArcPath}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.8"
                    strokeOpacity="0.15"
                    strokeLinecap="round"
                    filter="url(#innerShadow)"
                />

                {/* 进度流线 */}
                <path
                    ref={progressPathRef}
                    d={dreamArcPath}
                    fill="none"
                    stroke="url(#dreamGradient)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    filter="url(#softGlow)"
                    style={{
                        transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: progress > 0 ? 1 : 0
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

export default DreamProgressIndicator;

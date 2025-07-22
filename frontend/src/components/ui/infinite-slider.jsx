"use client";
import { cn } from "@/lib/utils";
import { useMotionValue, animate, motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

export function InfiniteSlider({
    children,
    gap = 16,
    duration = 25,
    pauseOnHover = true,
    direction = "horizontal",
    reverse = false,
    className,
}) {
    const [currentDuration, setCurrentDuration] = useState(duration);
    const [containerSize, setContainerSize] = useState(0);
    const containerRef = useRef(null);
    const translation = useMotionValue(0);
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        // 计算容器尺寸
        const updateContainerSize = () => {
            const size = direction === "horizontal"
                ? containerRef.current.scrollWidth / 2
                : containerRef.current.scrollHeight / 2;
            setContainerSize(size);
        };

        updateContainerSize();
        window.addEventListener("resize", updateContainerSize);

        return () => {
            window.removeEventListener("resize", updateContainerSize);
        };
    }, [children, containerRef, direction]);

    useEffect(() => {
        if (!containerSize) return;

        const from = reverse ? -containerSize : 0;
        const to = reverse ? 0 : -containerSize;

        // 如果鼠标悬停而且pauseOnHover为true，则不开始动画
        if (isHovering && pauseOnHover) return;

        const controls = animate(translation, [from, to], {
            ease: "linear",
            duration: currentDuration,
            repeat: Infinity,
            repeatType: "loop",
            repeatDelay: 0,
            onRepeat: () => {
                translation.set(from);
            },
        });

        return controls.stop;
    }, [translation, currentDuration, containerSize, reverse, isHovering, pauseOnHover]);

    return (
        <div
            className={cn("overflow-hidden", className)}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <motion.div
                ref={containerRef}
                className="flex"
                style={{
                    ...(direction === "horizontal"
                        ? {
                            x: translation,
                            flexDirection: "row",
                            gap: `${gap}px`,
                        }
                        : {
                            y: translation,
                            flexDirection: "column",
                            gap: `${gap}px`,
                        }),
                }}
            >
                {children}
                {children}
            </motion.div>
        </div>
    );
}

export function DreamGallery({
    images,
    className,
    itemClassName,
    gap = 16,
    speed = 25,
}) {
    return (
        <div className={cn("w-full overflow-hidden", className)}>
            <InfiniteSlider gap={gap} duration={speed}>
                {images.map((src, i) => (
                    <div
                        key={i}
                        className={cn(
                            "relative shrink-0 rounded-lg overflow-hidden",
                            itemClassName || "h-60 w-60 md:h-80 md:w-80"
                        )}
                    >
                        <img
                            src={src}
                            alt={`Dream gallery image ${i}`}
                            className="h-full w-full object-cover transition-all duration-300 hover:scale-105"
                        />
                    </div>
                ))}
            </InfiniteSlider>
        </div>
    );
} 
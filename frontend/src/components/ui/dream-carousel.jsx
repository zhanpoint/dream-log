"use client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";

export function DreamCarousel({
    slides,
    autoPlay = true,
    interval = 5000,
    className,
}) {
    const [current, setCurrent] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const slideRefs = useRef([]);
    const timer = useRef(null);

    // 使用useCallback避免依赖项问题
    const nextSlide = useCallback(() => {
        if (slides && slides.length > 0) {
            setCurrent((prev) => (prev + 1) % slides.length);
        }
    }, [slides]);

    const prevSlide = useCallback(() => {
        if (slides && slides.length > 0) {
            setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
        }
    }, [slides]);

    // 清理旧的定时器
    const clearAutoPlayTimer = useCallback(() => {
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
    }, []);

    // 设置自动播放
    const setupAutoPlay = useCallback(() => {
        if (autoPlay && !isHovering && slides && slides.length > 1) {
            clearAutoPlayTimer();
            timer.current = setTimeout(nextSlide, interval);
        }
    }, [autoPlay, interval, isHovering, nextSlide, slides, clearAutoPlayTimer]);

    // 自动播放效果
    useEffect(() => {
        setupAutoPlay();
        return clearAutoPlayTimer;
    }, [current, setupAutoPlay, clearAutoPlayTimer]);

    const handleMouseEnter = useCallback(() => {
        setIsHovering(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovering(false);
    }, []);

    const handleSlideClick = useCallback((index) => {
        if (current !== index) {
            setCurrent(index);
        }
    }, [current]);

    if (!slides || slides.length === 0) {
        return null;
    }

    return (
        <div
            className={cn("relative w-full h-[70vh] overflow-hidden", className)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <AnimatePresence mode="wait">
                {slides.map((slide, index) => (
                    index === current && (
                        <motion.div
                            key={`slide-${index}`}
                            className="absolute inset-0 w-full h-full"
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.7 }}
                            ref={(el) => (slideRefs.current[index] = el)}
                        >
                            <div className="relative w-full h-full overflow-hidden">
                                <div className="absolute inset-0"></div>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                                    <motion.h2
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3, duration: 0.8 }}
                                        className="text-3xl md:text-5xl font-bold text-white mb-4"
                                    >
                                        {slide.title}
                                    </motion.h2>
                                    {slide.description && (
                                        <motion.p
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.5, duration: 0.8 }}
                                            className="text-lg md:text-xl text-white/90 max-w-2xl mb-8"
                                        >
                                            {slide.description}
                                        </motion.p>
                                    )}
                                    {slide.button && (
                                        <motion.button
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.7, duration: 0.8 }}
                                            className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
                                        >
                                            {slide.button}
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )
                ))}
            </AnimatePresence>

            {/* 导航按钮 */}
            <div className="absolute z-10 left-0 right-0 bottom-8 flex justify-center gap-2">
                {slides.map((_, index) => (
                    <button
                        key={`nav-${index}`}
                        className={cn(
                            "w-3 h-3 rounded-full transition-all duration-300",
                            current === index ? "bg-white w-8" : "bg-white/50 hover:bg-white/70"
                        )}
                        onClick={() => handleSlideClick(index)}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>

            {/* 箭头导航 - 只有多张幻灯片时才显示 */}
            {slides.length > 1 && (
                <>
                    <button
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-colors"
                        onClick={prevSlide}
                        aria-label="Previous slide"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <button
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-colors"
                        onClick={nextSlide}
                        aria-label="Next slide"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>
                </>
            )}
        </div>
    );
} 
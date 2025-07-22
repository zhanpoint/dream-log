"use client";
import { useScroll, useTransform, motion } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export const ParallaxScroll = ({
    images,
    className,
    reverse = false,
    speed = 1,
}) => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"],
    });

    const translateY = useTransform(
        scrollYProgress,
        [0, 1],
        [0, reverse ? -100 * speed : 100 * speed]
    );

    return (
        <div
            ref={containerRef}
            className={cn("relative flex overflow-hidden", className)}
        >
            <motion.div
                style={{ y: translateY }}
                className="flex flex-wrap"
            >
                {images.map((src, i) => (
                    <div
                        key={i}
                        className="relative h-80 w-80 m-2 overflow-hidden rounded-lg"
                    >
                        <img
                            src={src}
                            alt={`Parallax image ${i}`}
                            className="h-full w-full object-cover transition-all duration-500 hover:scale-110"
                        />
                    </div>
                ))}
            </motion.div>
        </div>
    );
};

export const ParallaxScrollText = ({
    children,
    className,
    speed = 20,
}) => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"],
    });

    const translateY = useTransform(
        scrollYProgress,
        [0, 1],
        [0, speed]
    );

    return (
        <div
            ref={containerRef}
            className={cn("relative my-8", className)}
        >
            <motion.div style={{ y: translateY }}>
                {children}
            </motion.div>
        </div>
    );
};

export const ContainerScroll = ({
    titleComponent,
    children,
    className,
}) => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
    });

    const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
    const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1]);
    const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

    return (
        <div
            className={cn("h-[80vh] flex items-center justify-center relative p-4 md:p-8", className)}
            ref={containerRef}
        >
            <div
                className="py-10 md:py-20 w-full relative"
                style={{
                    perspective: "1000px",
                }}
            >
                <motion.div
                    style={{
                        translateY: translate,
                    }}
                    className="div max-w-5xl mx-auto text-center"
                >
                    {titleComponent}
                </motion.div>
                <motion.div
                    style={{
                        rotateX: rotate,
                        scale,
                        boxShadow:
                            "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
                    }}
                    className="max-w-5xl -mt-6 mx-auto h-[40vh] md:h-[50vh] w-full border border-gray-500 p-2 md:p-4 bg-background/50 backdrop-blur-sm rounded-2xl shadow-xl"
                >
                    <div className="h-full w-full overflow-hidden rounded-xl">
                        {children}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}; 
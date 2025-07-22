"use client";
import React, { useId } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, useAnimation } from "framer-motion";

// 自定义Particles组件，没有使用tsparticles，简化实现
export const SparklesCore = (props) => {
    const {
        id,
        className,
        background,
        backgroundColor,
        minSize,
        maxSize,
        speed,
        particleColor,
        particleDensity,
    } = props;
    const [particles, setParticles] = useState([]);
    const controls = useAnimation();

    // 使用传入的backgroundColor或background，确保兼容性
    const bgColor = backgroundColor || background || "transparent";

    useEffect(() => {
        // 生成随机粒子
        const generateParticles = () => {
            const newParticles = [];
            const count = particleDensity || 30;

            for (let i = 0; i < count; i++) {
                newParticles.push({
                    id: i,
                    x: Math.random() * 100,
                    y: Math.random() * 100,
                    size: Math.random() * ((maxSize || 3) - (minSize || 1)) + (minSize || 1),
                    opacity: Math.random() * 0.5 + 0.3,
                    duration: (Math.random() * 20 + 10) / (speed || 1),
                });
            }

            setParticles(newParticles);
            controls.start({
                opacity: 1,
                transition: {
                    duration: 1,
                },
            });
        };

        generateParticles();

        // 定期更新粒子，产生闪烁效果
        const interval = setInterval(() => {
            setParticles(prev => prev.map(particle => ({
                ...particle,
                opacity: Math.random() * 0.5 + 0.3,
            })));
        }, 3000);

        return () => clearInterval(interval);
    }, [particleDensity, minSize, maxSize, speed, controls]);

    const generatedId = useId();

    return (
        <motion.div
            animate={controls}
            className={cn("opacity-0 relative w-full h-full", className)}
            style={{
                backgroundColor: bgColor,
            }}
        >
            {particles.map((particle) => (
                <motion.div
                    key={`${generatedId}-${particle.id}`}
                    className="absolute rounded-full"
                    animate={{
                        opacity: [particle.opacity, particle.opacity * 0.4, particle.opacity],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    style={{
                        top: `${particle.y}%`,
                        left: `${particle.x}%`,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        backgroundColor: particleColor || "#ffffff",
                    }}
                />
            ))}
        </motion.div>
    );
}; 
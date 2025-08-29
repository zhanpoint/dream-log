import React, { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

/**
 * 梦境粒子动画组件
 * @param {Object} props - 组件属性
 * @param {number} props.particleCount - 粒子数量
 * @param {string} props.className - 自定义类名
 */
const DreamParticles = ({ particleCount = 50, className = "" }) => {
    const containerRef = useRef(null);
    const [cursor, setCursor] = useState({ x: 0, y: 0 });
    const [isAutoMode, setIsAutoMode] = useState(true);
    const startTimeRef = useRef(Date.now());
    const animationFrameRef = useRef();

    // 生成粒子数据
    const particles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        opacity: Math.random() * 0.6 + 0.2,
        delay: Math.random() * 2,
        speed: Math.random() * 0.5 + 0.2,
        hue: Math.random() * 60 + 200 // 蓝紫色调
    }));

    // 自动动画循环
    useEffect(() => {
        const animate = () => {
            const currentTime = (Date.now() - startTimeRef.current) * 0.001;

            if (isAutoMode) {
                const x = Math.sin(currentTime * 0.3) * 100 + Math.sin(currentTime * 0.17) * 50;
                const y = Math.cos(currentTime * 0.2) * 80 + Math.cos(currentTime * 0.23) * 40;
                setCursor({ x, y });
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isAutoMode]);

    // 鼠标交互处理
    const handleMouseMove = (e) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        setCursor({
            x: ((e.clientX - rect.left - centerX) / centerX) * 100,
            y: ((e.clientY - rect.top - centerY) / centerY) * 100
        });

        setIsAutoMode(false);

        // 3秒后恢复自动模式
        setTimeout(() => setIsAutoMode(true), 3000);
    };

    return (
        <div
            ref={containerRef}
            className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
            onMouseMove={handleMouseMove}
            style={{ pointerEvents: 'auto' }}
        >
            {/* 背景渐变 */}
            <div className="absolute inset-0 bg-gradient-radial from-purple-900/10 via-blue-900/5 to-transparent opacity-60" />

            {/* 粒子容器 */}
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute rounded-full mix-blend-screen"
                    initial={{
                        x: `${particle.x}%`,
                        y: `${particle.y}%`,
                        opacity: 0,
                        scale: 0
                    }}
                    animate={{
                        opacity: particle.opacity,
                        scale: 1,
                        x: `calc(${particle.x}% + ${cursor.x * particle.speed * 0.5}px)`,
                        y: `calc(${particle.y}% + ${cursor.y * particle.speed * 0.5}px)`
                    }}
                    transition={{
                        duration: 2,
                        delay: particle.delay,
                        x: { duration: 1.5, ease: "easeOut" },
                        y: { duration: 1.5, ease: "easeOut" }
                    }}
                    style={{
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        background: `hsl(${particle.hue}, 80%, 60%)`,
                        boxShadow: `0 0 ${particle.size * 4}px hsl(${particle.hue}, 80%, 60%)`
                    }}
                />
            ))}

            {/* 梦境光晕效果 */}
            <motion.div
                className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-20 mix-blend-screen"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.3, 0.1],
                    rotate: [0, 180, 360]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                style={{
                    background: 'radial-gradient(circle, rgba(147, 51, 234, 0.4) 0%, transparent 70%)',
                    filter: 'blur(40px)'
                }}
            />

            <motion.div
                className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-20 mix-blend-screen"
                animate={{
                    scale: [1.2, 1, 1.2],
                    opacity: [0.15, 0.25, 0.15],
                    rotate: [360, 180, 0]
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
                style={{
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
                    filter: 'blur(50px)'
                }}
            />
        </div>
    );
};

export default DreamParticles;

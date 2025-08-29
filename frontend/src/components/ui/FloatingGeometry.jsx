import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * 浮动几何形状组件 - 创建梦境般的3D视觉效果
 * @param {Object} props - 组件属性
 * @param {string} props.className - 自定义类名
 */
const FloatingGeometry = ({ className = "" }) => {
    const containerRef = useRef(null);

    // 生成几何形状数据
    const shapes = [
        {
            id: 1,
            type: 'circle',
            size: 120,
            position: { top: '10%', left: '10%' },
            gradient: 'from-purple-500/20 to-blue-500/20',
            delay: 0,
            duration: 8
        },
        {
            id: 2,
            type: 'ellipse',
            size: 200,
            position: { top: '20%', right: '15%' },
            gradient: 'from-blue-400/15 to-cyan-400/15',
            delay: 1,
            duration: 10
        },
        {
            id: 3,
            type: 'circle',
            size: 80,
            position: { bottom: '25%', left: '20%' },
            gradient: 'from-indigo-500/25 to-purple-600/25',
            delay: 0.5,
            duration: 6
        },
        {
            id: 4,
            type: 'ellipse',
            size: 150,
            position: { bottom: '15%', right: '10%' },
            gradient: 'from-violet-400/20 to-pink-400/20',
            delay: 2,
            duration: 9
        },
        {
            id: 5,
            type: 'circle',
            size: 60,
            position: { top: '60%', left: '5%' },
            gradient: 'from-cyan-400/30 to-blue-500/30',
            delay: 1.5,
            duration: 7
        }
    ];

    return (
        <div
            ref={containerRef}
            className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
        >
            {shapes.map((shape) => (
                <motion.div
                    key={shape.id}
                    className={`absolute bg-gradient-to-br ${shape.gradient} backdrop-blur-sm rounded-full`}
                    style={{
                        width: `${shape.size}px`,
                        height: `${shape.size}px`,
                        ...shape.position
                    }}
                    initial={{
                        opacity: 0,
                        scale: 0.3,
                        rotate: 0,
                        y: -100
                    }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        rotate: 360,
                        y: [0, 20, 0]
                    }}
                    transition={{
                        duration: shape.duration,
                        delay: shape.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                        y: {
                            duration: shape.duration * 0.8,
                            repeat: Infinity,
                            ease: "easeInOut"
                        },
                        rotate: {
                            duration: shape.duration * 2,
                            repeat: Infinity,
                            ease: "linear"
                        }
                    }}
                />
            ))}

            {/* 动态渐变背景层 */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-blue-900/5 to-indigo-900/5"
                animate={{
                    opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* 中心光晕 */}
            <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                    width: '40vw',
                    height: '40vw',
                    maxWidth: '600px',
                    maxHeight: '600px'
                }}
                animate={{
                    scale: [0.8, 1.1, 0.8],
                    opacity: [0.1, 0.2, 0.1],
                    rotate: [0, 180, 360]
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <div className="w-full h-full rounded-full bg-gradient-radial from-purple-500/10 via-blue-500/5 to-transparent blur-3xl" />
            </motion.div>
        </div>
    );
};

export default FloatingGeometry;

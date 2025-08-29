import React, { useState, useEffect, useCallback, memo, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { TypingAnimation } from '@/components/ui/TypingAnimation.jsx';
import DreamParticles from '@/components/ui/DreamParticles.jsx';
import FloatingGeometry from '@/components/ui/FloatingGeometry.jsx';
import ModernFooter from '@/components/layout/ModernFooter.jsx';
import { motion } from "framer-motion";
import { MultilingualSeo } from '@/components/seo/MultilingualSeo';
import { useI18nContext } from '@/contexts/I18nContext';


/**
 * Dreamlog网站首页组件 - React 19 最佳实践版本
 * 专注稳定性和性能优化
 */
const HomePage = () => {
    // 状态管理
    const [buttonVisible, setButtonVisible] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Hooks - React 19 最佳实践
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { theme, isLoaded: themeLoaded } = useTheme();
    const { t } = useI18nContext();
    const [isPending, startTransition] = useTransition();

    // 打字机文本 - 国际化
    const welcomeText = t('home.welcome', "欢迎来到 Dream Log");

    // 页面加载效果 - React 19 优化
    useEffect(() => {
        if (themeLoaded) {
            setIsLoaded(true);
        }
    }, [themeLoaded]);

    // 鼠标移动处理器 - React 19优化
    const handleMouseMove = useCallback((e) => {
        setMousePosition({
            x: (e.clientX / window.innerWidth - 0.5) * 20,
            y: (e.clientY / window.innerHeight - 0.5) * 20
        });
    }, []);

    // 鼠标跟踪效果
    useEffect(() => {
        const handleMove = (e) => handleMouseMove(e);
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, [handleMouseMove]);

    // 打字完成处理器 - React 19 简化版本
    const handleTypingComplete = useCallback(() => {
        setButtonVisible(true);
    }, []);

    // React 19 最佳实践 - 使用useTransition优化导航
    const handleExploreClick = useCallback(() => {
        startTransition(() => {
            const targetPath = isAuthenticated ? '/dreams/create' : '/login';
            navigate(targetPath);
        });
    }, [navigate, isAuthenticated, startTransition]);

    // 通用导航处理器 - React 19 优化版本
    const handleNavigate = useCallback((path) => {
        startTransition(() => {
            navigate(path);
        });
    }, [navigate, startTransition]);

    // 功能特点数据
    const features = [
        {
            icon: "✨",
            title: t('home.features.items.record.title', '智能记录'),
            description: t('home.features.items.record.description', '使用AI辅助工具轻松记录和分类您的梦境体验'),
            gradient: "from-purple-400 to-pink-400"
        },
        {
            icon: "🔍",
            title: t('home.features.items.analyze.title', '深度解析'),
            description: t('home.features.items.analyze.description', '运用心理学和神经科学方法深度解读梦境含义'),
            gradient: "from-blue-400 to-cyan-400"
        },
        {
            icon: "🤖",
            title: t('home.features.items.assistant.title', 'AI助手'),
            description: t('home.features.items.assistant.description', '个性化AI梦境解析师为您提供专业见解和建议'),
            gradient: "from-indigo-400 to-purple-400"
        },
        {
            icon: "📊",
            title: t('home.features.items.statistics.title', '数据统计'),
            description: t('home.features.items.statistics.description', '可视化展示您的梦境模式、频率和主题趋势'),
            gradient: "from-emerald-400 to-teal-400"
        }
    ];

    // 主题加载状态
    if (!themeLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 dark:from-black dark:via-purple-950/30 dark:to-black light:from-white light:via-purple-50 light:to-gray-50 overflow-hidden">

            {/* SEO Meta Tags */}
            <MultilingualSeo
                title={t('home.title', 'Dream Log - 梦境日志')}
                description={t('home.description', 'Dream Log - 记录、分析和解析您的梦境')}
                keywords={t('home.keywords', '梦境,日志,AI,心理学,梦境解析')}
                path="/"
            />

            {/* 背景视觉效果层 */}
            <motion.div className="absolute inset-0">
                <FloatingGeometry />
                <DreamParticles particleCount={40} />
            </motion.div>

            {/* 主视觉区域 */}
            <section className="relative min-h-screen flex items-center justify-center px-6 py-24">
                <motion.div
                    className="relative z-10 max-w-7xl mx-auto text-center"
                    style={{
                        transform: `translateX(${mousePosition.x * 0.5}px)`,
                    }}
                >
                    {/* 顶部徽章 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 mb-8"
                    >
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse" />
                        <span className="text-sm font-medium text-white/90 dark:text-white/80">
                            {t('home.badge', 'AI驱动的梦境解析平台')}
                        </span>
                    </motion.div>

                    {/* 主标题 - 打字机效果 */}
                    {isLoaded && (
                        <TypingAnimation
                            duration={60}
                            delay={200}
                            startOnView={false}
                            onComplete={handleTypingComplete}
                            className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight tracking-tight mb-6"
                        >
                            {welcomeText}
                        </TypingAnimation>
                    )}

                    {/* 副标题 */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                        className="text-lg md:text-xl text-gray-300 dark:text-gray-300 light:text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
                    >
                        {t('home.subtitle', '探索梦境的神秘世界，解锁潜意识的智慧')}
                    </motion.p>

                    {/* CTA按钮组 */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{
                            opacity: buttonVisible ? 1 : 0,
                            y: buttonVisible ? 0 : 30
                        }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20"
                    >
                        <motion.button
                            onClick={handleExploreClick}
                            disabled={isPending}
                            whileHover={!isPending ? { scale: 1.05, y: -2 } : {}}
                            whileTap={!isPending ? { scale: 0.98 } : {}}
                            className={`group relative px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-lg shadow-2xl shadow-purple-500/25 transition-all duration-300 overflow-hidden ${isPending ? 'opacity-75' : ''
                                }`}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {isPending && (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                    />
                                )}
                                {isPending ? t('common.loading', '正在跳转...') : t('home.cta.primary', '开始记录梦境')}
                            </span>
                        </motion.button>
                    </motion.div>

                    {/* 滚动提示 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: buttonVisible ? 1 : 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                        className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500"
                    >
                        <span className="text-sm font-medium">{t('home.cta.secondary', '了解更多')}</span>
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="w-6 h-6 border-2 border-current rounded-full flex items-center justify-center"
                        >
                            <div className="w-1 h-1 bg-current rounded-full" />
                        </motion.div>
                    </motion.div>
                </motion.div>
            </section>

            {/* 功能特点区域 */}
            <section className="relative py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true, amount: 0.3 }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white dark:text-white light:text-gray-900 mb-6 leading-tight">
                            {t('home.features.title', '为什么选择 Dream Log')}
                        </h2>
                        <p className="text-xl text-gray-300 dark:text-gray-400 light:text-gray-600 max-w-3xl mx-auto">
                            {t('home.features.subtitle', '专业的梦境分析工具，助您深入理解梦境世界')}
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                viewport={{ once: true, amount: 0.3 }}
                                whileHover={{ y: -8 }}
                                className="group relative p-8 rounded-2xl bg-white/5 dark:bg-black/20 backdrop-blur-sm border border-white/10 dark:border-gray-700/30 hover:border-white/20 dark:hover:border-gray-600/50 transition-all duration-300"
                            >
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-2xl mb-6 shadow-lg`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white dark:text-white light:text-gray-900 mb-4">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-300 dark:text-gray-400 light:text-gray-600 leading-relaxed">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 现代化页脚 */}
            <ModernFooter />
        </div>
    );
};

export default memo(HomePage);
import React, { useState, useEffect, useCallback, memo, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { TypingAnimation } from '@/components/ui/TypingAnimation.jsx';

import ModernFooter from '@/components/layout/ModernFooter.jsx';
import { motion } from "framer-motion";
import { MultilingualSeo } from '@/components/seo/MultilingualSeo';
import { useI18nContext } from '@/contexts/I18nContext';
import { TestimonialsSection } from '@/components/ui/testimonials';
import { Sparkles, BrainCircuit, Bot, PieChart } from 'lucide-react';
import { MagicCard } from '@/components/magicui/magic-card';
import { Meteors } from '@/components/magicui/meteors';
import { PulsatingButton } from '@/components/magicui/pulsating-button';


/**
 * Dream Log 主页组件 - React 19 最佳实践
 */
const HomePage = () => {
    const [buttonVisible, setButtonVisible] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { theme, isLoaded: themeLoaded } = useTheme();
    const { t } = useI18nContext();
    const [isPending, startTransition] = useTransition();

    const welcomeText = t('home.welcome', "欢迎来到 Dream Log");

    useEffect(() => {
        if (themeLoaded) {
            setIsLoaded(true);
        }
    }, [themeLoaded]);

    const handleMouseMove = useCallback((e) => {
        setMousePosition({
            x: (e.clientX / window.innerWidth - 0.5) * 20,
            y: (e.clientY / window.innerHeight - 0.5) * 20
        });
    }, []);

    useEffect(() => {
        const handleMove = (e) => handleMouseMove(e);
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, [handleMouseMove]);

    const handleTypingComplete = useCallback(() => {
        setButtonVisible(true);
    }, []);

    const handleExploreClick = useCallback(() => {
        startTransition(() => {
            const targetPath = isAuthenticated ? '/dreams/create' : '/login';
            navigate(targetPath);
        });
    }, [navigate, isAuthenticated, startTransition]);

    const handleNavigate = useCallback((path) => {
        startTransition(() => {
            navigate(path);
        });
    }, [navigate, startTransition]);

    const features = [
        {
            icon: Sparkles,
            title: t('home.features.items.record.title', '智能记录'),
            description: t('home.features.items.record.description', '使用AI辅助工具轻松记录和分类您的梦境体验'),
            iconColor: "text-purple-400 dark:text-purple-400 light:text-purple-500",
            iconBgColor: "dark:bg-purple-950/50 light:bg-purple-100",
            gradientFrom: "#9E7AFF",
            gradientTo: "#FE8BBB",
            gradientColor: "#9E7AFF"
        },
        {
            icon: BrainCircuit,
            title: t('home.features.items.analyze.title', '深度解析'),
            description: t('home.features.items.analyze.description', '运用心理学和神经科学方法深度解读梦境含义'),
            iconColor: "text-cyan-400 dark:text-cyan-400 light:text-cyan-500",
            iconBgColor: "dark:bg-cyan-950/50 light:bg-cyan-100",
            gradientFrom: "#06B6D4",
            gradientTo: "#3B82F6",
            gradientColor: "#06B6D4"
        },
        {
            icon: Bot,
            title: t('home.features.items.assistant.title', 'AI助手'),
            description: t('home.features.items.assistant.description', '个性化AI梦境解析师为您提供专业见解和建议'),
            iconColor: "text-indigo-400 dark:text-indigo-400 light:text-indigo-500",
            iconBgColor: "dark:bg-indigo-950/50 light:bg-indigo-100",
            gradientFrom: "#6366F1",
            gradientTo: "#8B5CF6",
            gradientColor: "#6366F1"
        },
        {
            icon: PieChart,
            title: t('home.features.items.statistics.title', '数据统计'),
            description: t('home.features.items.statistics.description', '可视化展示您的梦境模式、频率和主题趋势'),
            iconColor: "text-emerald-400 dark:text-emerald-400 light:text-emerald-500",
            iconBgColor: "dark:bg-emerald-950/50 light:bg-emerald-100",
            gradientFrom: "#10B981",
            gradientTo: "#059669",
            gradientColor: "#10B981"
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

            <MultilingualSeo
                title={t('home.title', 'Dream Log - 梦境日志')}
                description={t('home.description', 'Dream Log - 记录、分析和解析您的梦境')}
                keywords={t('home.keywords', '梦境,日志,AI,心理学,梦境解析')}
                path="/"
            />

            {/* 流星雨背景效果 - 限制到"为什么选择Dream Log"区域 */}
            <div
                className="absolute top-0 left-0 right-0 overflow-hidden pointer-events-none"
                style={{
                    height: 'calc(100vh + 300px)',
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0.5) 90%, rgba(0,0,0,0) 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0.5) 90%, rgba(0,0,0,0) 100%)'
                }}
            >
                <Meteors
                    number={20}
                    minDelay={0.5}
                    maxDelay={2}
                    minDuration={3}
                    maxDuration={8}
                    angle={215}
                    className="dark:bg-purple-400/30 light:bg-purple-600/20 shadow-[0_0_0_1px_rgba(139,92,246,0.1)]"
                />
            </div>


            <section className="relative flex justify-center px-6 pt-24 pb-4">
                <motion.div
                    className="relative z-10 max-w-7xl mx-auto text-center"
                    style={{
                        transform: `translateX(${mousePosition.x * 0.5}px)`,
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 mb-8"
                    >

                        <span className="text-sm font-medium text-white/90 dark:text-white/80">
                            {t('home.badge', 'AI驱动的梦境解析平台')}
                        </span>
                    </motion.div>

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

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                        className="text-lg md:text-xl text-gray-300 dark:text-gray-300 light:text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
                    >
                        {t('home.subtitle', '用AI解锁梦境奥秘，发现潜意识的宝藏，开启自我探索之旅')}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{
                            opacity: buttonVisible ? 1 : 0,
                            y: buttonVisible ? 0 : 30
                        }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                    >
                        <PulsatingButton
                            onClick={handleExploreClick}
                            disabled={isPending}
                            pulseColor="158 122 255"
                            duration="2.4s"
                            className={`group relative px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-sm shadow-2xl shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0`}
                        >
                            <span className="flex items-center gap-2">
                                {isPending && (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                    />
                                )}
                                {isPending ? t('common.loading', '正在跳转...') : t('home.cta.primary', '开始记录梦境')}
                            </span>
                        </PulsatingButton>
                    </motion.div>
                </motion.div>
            </section>

            <section className="relative py-34 px-6">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true, amount: 0.3 }}
                        className="text-center mb-8"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white dark:text-white light:text-gray-900 mb-6 leading-tight">
                            {t('home.features.title', '为什么选择 Dream Log')}
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 40 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
                                    viewport={{ once: true, amount: 0.3 }}
                                >
                                    <MagicCard
                                        className="group relative flex flex-col h-full text-left p-6 rounded-2xl dark:bg-slate-900/50 light:bg-white border dark:border-white/10 light:border-gray-200/80 transition-all duration-300"
                                        gradientSize={200}
                                        gradientFrom={feature.gradientFrom}
                                        gradientTo={feature.gradientTo}
                                        gradientColor={feature.gradientColor}
                                        gradientOpacity={0.6}
                                    >
                                        <div className="relative flex-shrink-0 mb-5">
                                            <div className={`w-16 h-16 flex items-center justify-center rounded-2xl border dark:border-white/10 light:border-gray-200/80 transition-all duration-300 group-hover:scale-105 ${feature.iconBgColor}`}>
                                                <Icon className={`w-8 h-8 transition-transform duration-300 group-hover:scale-110 ${feature.iconColor}`} />
                                            </div>
                                        </div>

                                        <div className="relative flex flex-col flex-grow">
                                            <h3 className="text-xl font-bold dark:text-white light:text-slate-800 mb-3">
                                                {feature.title}
                                            </h3>
                                            <p className="dark:text-gray-400 light:text-slate-600 leading-relaxed text-sm flex-grow">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </MagicCard>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </section>

            <TestimonialsSection />
            <ModernFooter />
        </div>
    );
};

export default memo(HomePage);
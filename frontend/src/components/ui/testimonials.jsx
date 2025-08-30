import React from 'react';
import { motion } from 'framer-motion';
import { Marquee } from './marquee';
import { cn } from '@/lib/utils';
import { useI18nContext } from '@/contexts/I18nContext';

/**
 * 用户评价数据 - 自动生成的示例数据
 */
const testimonials = [
    {
        id: 1,
        name: "王佳豪",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=wangjiahao&backgroundColor=059669",
        review: "Dream Log 帮助我更好地理解自己的梦境，AI 分析非常准确！"
    },
    {
        id: 2,
        name: "李嘉睦",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lijiamu&backgroundColor=0891b2",
        review: "界面设计很美观，记录梦境变得很有趣，推荐给所有对梦境感兴趣的朋友！"
    },
    {
        id: 3,
        name: "郭泓洋",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=guohongyang&backgroundColor=6366f1",
        review: "从来没想过梦境可以这样被分析，每天都期待看到新的解析结果。"
    },
    {
        id: 4,
        name: "王成浩",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=wangchenhao&backgroundColor=8b5cf6",
        review: "作为一个经常做奇怪梦的人，这个应用让我找到了很多有趣的解释！"
    },
    {
        id: 5,
        name: "亢建新",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kangjianxin&backgroundColor=d946ef",
        review: "AI 助手的建议很有帮助，让我对自己的心理状态有了更深的认识。"
    },
    {
        id: 6,
        name: "张勇",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhaomin&backgroundColor=f59e0b",
        review: "数据统计功能很棒，可以看到自己梦境的变化趋势，很有科学感！"
    },
    {
        id: 7,
        name: "李战胜",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sunxiuying&backgroundColor=059669",
        review: "终于有一个专业的梦境记录工具了，比纸质日记方便太多！"
    },
    {
        id: 8,
        name: "周涛",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhoutao&backgroundColor=0891b2",
        review: "梦境解析的准确度让我惊讶，感觉像有一个专业的心理学家在身边。"
    }
];

/**
 * 评价卡片组件
 */
const TestimonialCard = ({ testimonial }) => {
    return (
        <motion.figure
            whileHover={{ y: -4, scale: 1.02 }}
            className={cn(
                "relative w-80 min-h-[180px] cursor-pointer overflow-hidden rounded-2xl border p-6 shadow-lg transition-all duration-300",
                "bg-white/10 dark:bg-black/20 backdrop-blur-sm",
                "border-white/20 dark:border-gray-700/30",
                "hover:bg-white/15 dark:hover:bg-black/30",
                "hover:border-white/30 dark:hover:border-gray-600/50",
                "hover:shadow-2xl hover:shadow-purple-500/10"
            )}
        >
            {/* 用户信息头部 */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                    <img
                        className="w-12 h-12 rounded-full border-2 border-white/20 dark:border-gray-600/30"
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        loading="lazy"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white dark:text-white light:text-gray-900 truncate">
                        {testimonial.name}
                    </h4>
                </div>
            </div>

            {/* 评价内容 */}
            <blockquote className="text-gray-200 dark:text-gray-300 light:text-gray-700 leading-relaxed text-base font-medium">
                "{testimonial.review}"
            </blockquote>

            {/* 装饰性引号 */}
            <div className="absolute top-4 right-4 text-4xl text-purple-400/20 dark:text-purple-500/20 font-serif">
                "
            </div>
        </motion.figure>
    );
};

/**
 * 用户评价无限滚动组件
 */
export const TestimonialsSection = () => {
    const { t } = useI18nContext();

    // 将评价分为两行
    const firstRow = testimonials.slice(0, Math.ceil(testimonials.length / 2));
    const secondRow = testimonials.slice(Math.ceil(testimonials.length / 2));

    return (
        <section className="relative py-24 px-6 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                {/* 标题区域 */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true, amount: 0.3 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white dark:text-white light:text-gray-900 mb-6 leading-tight text-center w-full">
                        {t('home.testimonials.title', '用户真实评价')}
                    </h2>
                    <p className="text-xl text-gray-300 dark:text-gray-400 light:text-gray-600 text-center w-full flex justify-center">
                        <span>{t('home.testimonials.subtitle', '来自全国各地用户的真实反馈，见证 Dream Log 的专业与贴心')}</span>
                    </p>
                </motion.div>

                {/* 无限滚动评价区域 */}
                <div className="flex w-full flex-col items-center justify-center">
                    {/* 第一行 - 从左到右 */}
                    <Marquee pauseOnHover className="[--duration:60s] mb-4">
                        {firstRow.map((testimonial) => (
                            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
                        ))}
                    </Marquee>

                    {/* 第二行 - 从右到左 */}
                    <Marquee reverse pauseOnHover className="[--duration:60s]">
                        {secondRow.map((testimonial) => (
                            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
                        ))}
                    </Marquee>
                </div>

                {/* 底部统计信息 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    viewport={{ once: true, amount: 0.3 }}
                    className="flex flex-wrap justify-center items-center gap-16 mt-16 text-center"
                >
                    <div className="flex flex-col">
                        <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">10,000+</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                            {t('home.testimonials.stats.users', '活跃用户')}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">50,000+</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                            {t('home.testimonials.stats.dreams', '梦境记录')}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">98%</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                            {t('home.testimonials.stats.satisfaction', '满意度')}
                        </span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

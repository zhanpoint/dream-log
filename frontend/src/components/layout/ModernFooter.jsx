import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { useI18nContext } from '@/contexts/I18nContext';
import { ContactModal } from '../ui/contact-modal';
import { FeedbackModal } from '../ui/feedback-modal';

/**
 * 现代化页脚组件
 * 包含产品功能、帮助支持、法律信息和版权声明
 */
const ModernFooter = () => {
    const { theme } = useTheme();
    const { t } = useI18nContext();

    // 模态框状态
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

    // 处理联系链接点击
    const handleContactClick = (e) => {
        e.preventDefault();
        setIsContactModalOpen(true);
    };

    // 处理反馈建议链接点击
    const handleFeedbackClick = (e) => {
        e.preventDefault();
        setIsFeedbackModalOpen(true);
    };

    const footerLinks = {
        product: {
            title: t('footer.product.title', '产品功能'),
            links: [
                { name: t('footer.product.smartRecord', '记录梦境并智能解析'), href: "/dreams/create" },
                { name: t('footer.product.aiAssistant', 'AI助手'), href: "/assistant" },
                { name: t('footer.product.statistics', '数据统计'), href: "/statistics" },
                { name: t('footer.product.dreamManagement', '梦境管理'), href: "/my-dreams" }
            ]
        },
        support: {
            title: t('footer.support.title', '帮助支持'),
            links: [
                {
                    name: t('footer.support.contact', '联系我们'),
                    href: "#contact",
                    onClick: handleContactClick
                },
                {
                    name: t('footer.support.feedback', '反馈建议'),
                    href: "#feedback",
                    onClick: handleFeedbackClick
                }
            ]
        },
        legal: {
            title: t('footer.legal.title', '法律信息'),
            links: [
                { name: t('footer.legal.privacy', '隐私政策'), href: "/privacy-policy" },
                { name: t('footer.legal.terms', '服务条款'), href: "/terms-of-service" },
                { name: t('footer.legal.cookies', 'Cookie政策'), href: "/cookie-policy" },
                { name: t('footer.legal.disclaimer', '免责声明'), href: "/disclaimer" }
            ]
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 }
        }
    };

    return (
        <footer className="relative">
            <div className="relative max-w-7xl mx-auto px-6 py-12">
                {/* 主要内容区域 - 左右布局 */}
                <motion.div
                    className="flex flex-col lg:flex-row justify-between gap-12 mb-8"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                >
                    {/* 左侧：品牌信息 */}
                    <motion.div
                        variants={itemVariants}
                        className="flex-shrink-0 lg:max-w-sm"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <img src="/logo.svg" alt="Dream Log" className="w-8 h-8 rounded-lg" />
                            <div>
                                <h4 className="text-white dark:text-white light:text-gray-800 font-semibold">
                                    Dream Log
                                </h4>
                                <p className="text-gray-300 dark:text-gray-300 light:text-gray-700 text-sm">
                                    {t('footer.brand.tagline', '探索梦境的无限可能')}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* 右侧：链接分组 */}
                    <motion.div
                        variants={itemVariants}
                        className="flex-1"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-16 items-start">
                            {Object.entries(footerLinks).map(([key, section]) => (
                                <div key={key} className="flex flex-col items-start">
                                    <h3 className="text-sm font-semibold text-white dark:text-white light:text-gray-900 uppercase tracking-wider mb-4">
                                        {section.title}
                                    </h3>
                                    <ul className="space-y-3 list-none p-0 m-0">
                                        {section.links.map((link, index) => (
                                            <li key={index}>
                                                <a
                                                    href={link.href}
                                                    onClick={link.onClick || undefined}
                                                    className="text-sm text-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white light:text-gray-700 light:hover:text-gray-900 transition-colors duration-200 block cursor-pointer"
                                                >
                                                    {link.name}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>

                {/* 分割线 */}
                <motion.div
                    className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700/50 light:via-gray-400 to-transparent mb-6"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3 }}
                />

                {/* 底部版权信息 */}
                <motion.div
                    className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    <p className="text-gray-300 dark:text-gray-400 light:text-gray-700">
                        © {new Date().getFullYear()} Dream Log. {t('footer.copyright.tech', '基于React 19与AI技术构建')}.
                    </p>

                    <div className="flex items-center gap-4">
                        <a
                            href="https://beian.miit.gov.cn/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-300 dark:text-gray-400 light:text-gray-700 hover:text-purple-500 transition-colors duration-200"
                        >
                            豫ICP备2025135141号-1
                        </a>
                        <span className="text-gray-600 dark:text-gray-600 light:text-gray-400">|</span>
                        <a
                            href="https://beian.mps.gov.cn/#/query/webSearch?code=41911002000051"
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-300 dark:text-gray-400 light:text-gray-700 hover:text-purple-500 transition-colors duration-200 flex items-center gap-1"
                        >
                            <img src="/beian.png" alt="公安备案" className="w-3 h-3" />
                            豫公网安备41911002000051号
                        </a>
                    </div>
                </motion.div>
            </div>

            {/* 联系我们模态框 */}
            <ContactModal
                open={isContactModalOpen}
                onOpenChange={setIsContactModalOpen}
            />

            {/* 反馈建议模态框 */}
            <FeedbackModal
                open={isFeedbackModalOpen}
                onOpenChange={setIsFeedbackModalOpen}
            />
        </footer>
    );
};

export default ModernFooter;

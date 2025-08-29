import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext.jsx';

/**
 * 现代化页脚组件
 * 包含产品功能、帮助支持、法律信息和版权声明
 */
const ModernFooter = () => {
    const { theme } = useTheme();

    const footerLinks = {
        product: {
            title: "产品功能",
            links: [
                { name: "智能记录", href: "#features" },
                { name: "梦境解析", href: "#analysis" },
                { name: "AI 助手", href: "/assistant" },
                { name: "数据统计", href: "/statistics" },
                { name: "梦境管理", href: "/my-dreams" }
            ]
        },
        support: {
            title: "帮助支持",
            links: [
                { name: "使用指南", href: "#guide" },
                { name: "常见问题", href: "#faq" },
                { name: "联系我们", href: "#contact" },
                { name: "反馈建议", href: "#feedback" },
                { name: "在线客服", href: "#support" }
            ]
        },
        legal: {
            title: "法律信息",
            links: [
                { name: "隐私政策", href: "#privacy" },
                { name: "服务条款", href: "#terms" },
                { name: "Cookie 政策", href: "#cookies" },
                { name: "免责声明", href: "#disclaimer" }
            ]
        },
        social: {
            title: "关注我们",
            links: [
                { name: "官方微博", href: "#weibo", icon: "📱" },
                { name: "微信公众号", href: "#wechat", icon: "💬" },
                { name: "QQ 群", href: "#qq", icon: "👥" },
                { name: "GitHub", href: "#github", icon: "⚡" }
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
            <div className="relative max-w-7xl mx-auto px-6 py-16">
                {/* 主要内容区域 */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                >
                    {Object.entries(footerLinks).map(([key, section]) => (
                        <motion.div
                            key={key}
                            variants={itemVariants}
                            className="space-y-6"
                        >
                            <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-800">
                                {section.title}
                            </h3>
                            <ul className="space-y-3">
                                {section.links.map((link, index) => (
                                    <motion.li key={index}>
                                        <a
                                            href={link.href}
                                            className="group flex items-center gap-2 text-gray-400 hover:text-white dark:text-gray-400 dark:hover:text-white light:text-gray-600 light:hover:text-gray-900 transition-colors duration-200"
                                        >
                                            {link.icon && (
                                                <span className="text-sm">{link.icon}</span>
                                            )}
                                            <span className="group-hover:translate-x-1 transition-transform duration-200">
                                                {link.name}
                                            </span>
                                        </a>
                                    </motion.li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </motion.div>

                {/* 分割线 */}
                <motion.div
                    className="h-px bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/50 light:via-gray-300 to-transparent mb-8"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3 }}
                />

                {/* 底部版权和品牌信息 */}
                <motion.div
                    className="flex flex-col md:flex-row items-center justify-between gap-6"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    {/* 品牌信息 */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">D</span>
                        </div>
                        <div>
                            <h4 className="text-white dark:text-white light:text-gray-800 font-semibold">
                                Dream Log
                            </h4>
                            <p className="text-gray-300 dark:text-gray-300 light:text-gray-700 text-sm">
                                探索梦境的无限可能
                            </p>
                        </div>
                    </div>

                    {/* 版权信息 */}
                    <div className="text-center md:text-right space-y-2">
                        <p className="text-gray-300 dark:text-gray-300 light:text-gray-700 text-sm">
                            © {new Date().getFullYear()} Dream Log. using React 19 & AI Technology.
                        </p>
                        <div className="flex flex-col md:flex-row md:justify-end items-center gap-2 text-xs">
                            <a
                                href="https://beian.miit.gov.cn/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-300 dark:text-gray-300 light:text-gray-700 hover:text-purple-400 transition-colors duration-200"
                            >
                                豫ICP备2025135141号-1
                            </a>
                            <span className="hidden md:inline text-gray-600">|</span>
                            <a
                                href="https://beian.mps.gov.cn/#/query/webSearch?code=41911002000051"
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-300 dark:text-gray-300 light:text-gray-700 hover:text-purple-400 transition-colors duration-200 flex items-center gap-1"
                            >
                                <img src="/assets/备案图标.png" alt="公安备案" className="w-4 h-4" />
                                豫公网安备41911002000051号
                            </a>
                        </div>
                    </div>
                </motion.div>

                {/* 额外装饰元素 */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-50" />
            </div>

            {/* 底部渐变覆盖 */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-purple-500/50" />
        </footer>
    );
};

export default ModernFooter;

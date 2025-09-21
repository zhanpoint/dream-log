import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Book, Menu, X, Brain, Eye, Lightbulb } from "lucide-react";
import "@/styles/layout/Navbar.css";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/user/UserAvatar";
import ThemeToggle from "@/components/ui/theme-toggle";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useTranslation } from 'react-i18next';

import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from "@/components/ui/navigation-menu.jsx";
import { Button } from "@/components/ui/button.jsx";


// 定义导航栏属性接口
const Navbar = ({
    logo = {
        url: "/",
        src: "/logo.svg",
        alt: "Dream Log",
        title: "Dream Log",
    }
}) => {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // 切换移动端菜单
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    // 关闭移动端菜单
    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    // 处理菜单项点击
    const handleMenuItemClick = (url) => {
        if (url !== "#") {
            navigate(url);
            closeMobileMenu();
        }
    };

    // 动态生成菜单项
    const menu = [
        { title: t('navigation.home'), url: "/" },
        // 只有登录用户才显示AI助手和统计
        ...(isAuthenticated ? [
            { title: t('navigation.assistant'), url: "/assistant" },
            { title: t('navigation.statistics'), url: "/statistics" },
        ] : []),
        {
            title: t('navigation.knowledge'),
            url: "#",
            icon: <Book className="size-5 shrink-0" />,
            items: [
                {
                    title: t('knowledge.science.title', '梦境科学'),
                    description: t('knowledge.science.description', '了解梦境背后的科学原理'),
                    icon: <Brain className="size-5 shrink-0" />,
                    url: "/knowledge/science",
                },
                {
                    title: t('knowledge.symbols.title', '梦境符号学'),
                    description: t('knowledge.symbols.description', '探索梦境中符号的含义'),
                    icon: <Eye className="size-5 shrink-0" />,
                    url: "/knowledge/symbols",
                },
                {
                    title: t('knowledge.techniques.title', '梦境技巧'),
                    description: t('knowledge.techniques.description', '学习记忆和控制梦境的技巧'),
                    icon: <Lightbulb className="size-5 shrink-0" />,
                    url: "/knowledge/techniques",
                },
            ],
        },
    ];

    // 渲染桌面端菜单项
    const renderMenuItem = (item) => {
        if (item.items) {
            return (
                <NavigationMenuItem key={item.title} className="nav-menu-trigger">
                    <NavigationMenuTrigger className="nav-menu-trigger">{item.title}</NavigationMenuTrigger>
                    <NavigationMenuContent className="nav-menu-content">
                        <ul className="nav-menu-grid">
                            {item.items.map((subItem) => (
                                <li key={subItem.title}>
                                    <NavigationMenuLink asChild>
                                        <a
                                            className="nav-menu-item"
                                            href={subItem.url}
                                        >
                                            <div className="nav-menu-item-title">
                                                {subItem.icon}
                                                <div>{subItem.title}</div>
                                            </div>
                                            {subItem.description && (
                                                <p className="nav-menu-item-desc">
                                                    {subItem.description}
                                                </p>
                                            )}
                                        </a>
                                    </NavigationMenuLink>
                                </li>
                            ))}
                        </ul>
                    </NavigationMenuContent>
                </NavigationMenuItem>
            );
        }

        return (
            <NavigationMenuItem key={item.title}>
                <NavigationMenuLink asChild>
                    <a
                        className="nav-link"
                        href={item.url}
                    >
                        {item.title}
                    </a>
                </NavigationMenuLink>
            </NavigationMenuItem>
        );
    };



    // 在用户登录时增加"我的梦境"选项
    const MyDreamsButton = () => {
        if (!isAuthenticated) return null;

        return (
            <Button
                variant="ghost"
                size="sm"
                className="my-dreams-btn"
                onClick={() => navigate('/my-dreams')}
            >
                {t('navigation.myDreams')}
            </Button>
        );
    };

    return (
        <header className="dream-navbar">
            <div className="navbar-container">
                {/* Logo */}
                <div className="navbar-logo">
                    <a href={logo.url} className="flex items-center gap-2">
                        <img src={logo.src} className="h-12 w-12" alt={logo.alt} />
                        <span className="navbar-logo-text">
                            {logo.title}
                        </span>
                    </a>
                </div>

                {/* 桌面端导航 */}
                <div className="navbar-menu">
                    <NavigationMenu>
                        <NavigationMenuList>
                            {menu.map((item) => renderMenuItem(item))}
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>

                {/* 用户工具栏 */}
                <div className="navbar-tools">
                    {/* 桌面端工具 */}
                    <div className="navbar-tools-desktop">
                        <LanguageSelector variant="ghost" size="sm" showFlag={true} />
                        <ThemeToggle />
                    </div>

                    {/* 用户菜单 */}
                    {!isLoading && (
                        isAuthenticated ? (
                            <div className="user-actions">
                                <MyDreamsButton />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="my-dreams-btn desktop-only"
                                    onClick={() => navigate('/dreams/create')}
                                >
                                    {t('navigation.createDream')}
                                </Button>
                                <UserAvatar />
                            </div>
                        ) : (
                            <div className="auth-buttons">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="login-btn"
                                    onClick={() => navigate('/login')}
                                >
                                    {t('navigation.login')}
                                </Button>
                                <Button
                                    size="sm"
                                    className="register-btn"
                                    onClick={() => navigate('/register')}
                                >
                                    {t('navigation.register')}
                                </Button>
                            </div>
                        )
                    )}

                    {/* 移动端菜单按钮 */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mobile-menu-btn"
                        onClick={toggleMobileMenu}
                        aria-label="Toggle mobile menu"
                    >
                        {isMobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>

            {/* 移动端菜单 */}
            {isMobileMenuOpen && (
                <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
                    <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
                        {/* 移动端导航菜单 */}
                        <nav className="mobile-nav">
                            {menu.map((item) => (
                                <div key={item.title} className="mobile-nav-section">
                                    <button
                                        className="mobile-nav-item"
                                        onClick={() => handleMenuItemClick(item.url)}
                                    >
                                        {item.title}
                                    </button>
                                    {item.items && (
                                        <div className="mobile-nav-submenu">
                                            {item.items.map((subItem) => (
                                                <button
                                                    key={subItem.title}
                                                    className="mobile-nav-submenu-item"
                                                    onClick={() => handleMenuItemClick(subItem.url)}
                                                >
                                                    <div className="mobile-nav-submenu-content">
                                                        {subItem.icon}
                                                        <div>
                                                            <div className="mobile-nav-submenu-title">
                                                                {subItem.title}
                                                            </div>
                                                            {subItem.description && (
                                                                <div className="mobile-nav-submenu-desc">
                                                                    {subItem.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </nav>

                        {/* 移动端用户操作 */}
                        {!isLoading && (
                            <div className="mobile-user-actions">
                                {isAuthenticated ? (
                                    <>
                                        <Button
                                            variant="ghost"
                                            className="mobile-nav-item"
                                            onClick={() => handleMenuItemClick('/my-dreams')}
                                        >
                                            {t('navigation.myDreams')}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="mobile-nav-item"
                                            onClick={() => handleMenuItemClick('/dreams/create')}
                                        >
                                            {t('navigation.createDream')}
                                        </Button>
                                    </>
                                ) : (
                                    <div className="mobile-auth-buttons">
                                        <Button
                                            variant="ghost"
                                            className="mobile-nav-item"
                                            onClick={() => handleMenuItemClick('/login')}
                                        >
                                            {t('navigation.login')}
                                        </Button>
                                        <Button
                                            className="mobile-nav-item mobile-register-btn"
                                            onClick={() => handleMenuItemClick('/register')}
                                        >
                                            {t('navigation.register')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 移动端工具 */}
                        <div className="mobile-tools">
                            <div className="mobile-tool-section">
                                <span className="mobile-tool-label">{t('common.language', '语言')}</span>
                                <LanguageSelector variant="ghost" size="sm" showFlag={true} />
                            </div>
                            <div className="mobile-tool-section">
                                <span className="mobile-tool-label">{t('common.theme', '主题')}</span>
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export { Navbar };
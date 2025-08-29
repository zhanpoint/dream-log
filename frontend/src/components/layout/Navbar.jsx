import React from "react";
import { useNavigate } from "react-router-dom";
import { Book, Compass, Users, Moon, BarChart3, Bot } from "lucide-react";
import "./Navbar.css";
import { useAuth } from "@/hooks/useAuth";
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
        src: "/assets/logo.svg",
        alt: "Dream Log",
        title: "Dream Log",
    }
}) => {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();

    // 动态生成菜单项
    const menu = [
        { title: t('navigation.home'), url: "/" },
        {
            title: t('navigation.knowledge'),
            url: "#",
            icon: <Book className="size-5 shrink-0" />,
            items: [
                {
                    title: t('knowledge.science.title', '梦境科学'),
                    description: t('knowledge.science.description', '了解梦境背后的科学原理'),
                    icon: <Book className="size-5 shrink-0" />,
                    url: "/knowledge/science",
                },
                {
                    title: t('knowledge.symbols.title', '梦境符号学'),
                    description: t('knowledge.symbols.description', '探索梦境中符号的含义'),
                    icon: <Book className="size-5 shrink-0" />,
                    url: "/knowledge/symbols",
                },
                {
                    title: t('knowledge.techniques.title', '梦境技巧'),
                    description: t('knowledge.techniques.description', '学习记忆和控制梦境的技巧'),
                    icon: <Book className="size-5 shrink-0" />,
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
                    {/* 语言选择器 */}
                    <LanguageSelector variant="ghost" size="sm" showFlag={true} />

                    {/* 主题切换按钮 */}
                    <ThemeToggle />

                    {/* 用户菜单 */}
                    {!isLoading && (
                        isAuthenticated ? (
                            <div className="user-actions">
                                <MyDreamsButton />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="my-dreams-btn"
                                    onClick={() => navigate('/assistant')}
                                >
                                    <Bot className="h-4 w-4 mr-1" />
                                    {t('navigation.assistant')}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="my-dreams-btn"
                                    onClick={() => navigate('/statistics')}
                                >
                                    <BarChart3 className="h-4 w-4 mr-1" />
                                    {t('navigation.statistics')}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="my-dreams-btn"
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


                </div>
            </div>
        </header>
    );
};

export { Navbar };
import React from "react";
import { useNavigate } from "react-router-dom";
import { Book, Compass, Users, Moon } from "lucide-react";
import "./Navbar.css";
import { useAuth } from "@/hooks/useAuth";
import UserAvatar from "@/components/user/UserAvatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
    },
    menu = [
        { title: "首页", url: "/" },
        {
            title: "探索",
            url: "#",
            icon: <Compass className="size-5 shrink-0" />,
            items: [
                {
                    title: "最新梦境",
                    description: "浏览最新记录的梦境内容",
                    icon: <Compass className="size-5 shrink-0" />,
                    url: "/explore/latest",
                },
                {
                    title: "热门梦境",
                    description: "查看社区热门的梦境记录",
                    icon: <Compass className="size-5 shrink-0" />,
                    url: "/explore/trending",
                },
            ],
        },
        {
            title: "知识中心",
            url: "#",
            icon: <Book className="size-5 shrink-0" />,
            items: [
                {
                    title: "梦境科学",
                    description: "了解梦境背后的科学原理",
                    icon: <Book className="size-5 shrink-0" />,
                    url: "/knowledge/science",
                },
                {
                    title: "梦境符号学",
                    description: "探索梦境中符号的含义",
                    icon: <Book className="size-5 shrink-0" />,
                    url: "/knowledge/symbols",
                },
                {
                    title: "梦境技巧",
                    description: "学习记忆和控制梦境的技巧",
                    icon: <Book className="size-5 shrink-0" />,
                    url: "/knowledge/techniques",
                },
            ],
        },
        {
            title: "社区",
            url: "#",
            icon: <Users className="size-5 shrink-0" />,
            items: [
                {
                    title: "解梦论坛",
                    description: "分享您的梦境，获取他人解读",
                    icon: <Users className="size-5 shrink-0" />,
                    url: "/community/forum",
                },
                {
                    title: "梦境挑战",
                    description: "参与社区梦境记录挑战",
                    icon: <Users className="size-5 shrink-0" />,
                    url: "/community/challenges",
                },
            ],
        },
    ],
}) => {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();

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
                我的梦境
            </Button>
        );
    };

    return (
        <header className="dream-navbar">
            <div className="navbar-container">
                {/* Logo */}
                <div className="navbar-logo">
                    <a href={logo.url} className="flex items-center gap-2">
                        <img src={logo.src} className="h-8 w-8" alt={logo.alt} />
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
                    {/* 主题切换按钮 */}
                    <ThemeToggle />

                    {/* 用户菜单 */}
                    {!isLoading && (
                        isAuthenticated ? (
                            <div className="user-actions">
                                <MyDreamsButton />
                                <Button
                                    size="sm"
                                    className="create-dream-btn"
                                    onClick={() => navigate('/dreams/create')}
                                >
                                    创建梦境
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
                                    登录
                                </Button>
                                <Button
                                    size="sm"
                                    className="register-btn"
                                    onClick={() => navigate('/register')}
                                >
                                    注册
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
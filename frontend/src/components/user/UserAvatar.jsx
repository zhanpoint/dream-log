import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut } from 'lucide-react';
import notification from '@/utils/notification';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getDefaultAvatarUrl, getInitials } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const UserAvatar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            notification.error('退出登录失败: ' + (error.message || '未知错误'));
        }
    };

    const navigateToProfile = () => {
        navigate('/profile');
    };

    const navigateToSettings = () => {
        navigate('/settings');
    };

    const avatarUrl = user?.avatar || getDefaultAvatarUrl(user?.username);
    const initials = getInitials(user?.username);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarImage src={avatarUrl} alt={user?.username || '用户'} />
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.username || '用户'}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email || '未设置邮箱'}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={navigateToProfile}>
                    <User className="mr-2 h-4 w-4" />
                    <span>个人中心</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={navigateToSettings}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>设置</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default UserAvatar; 
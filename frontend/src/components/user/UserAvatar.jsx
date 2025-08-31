import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip';
import { getInitials } from '@/lib/utils';
import { getUserAvatarUrl, handleAvatarError } from '@/utils/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

const UserAvatar = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const avatarUrl = getUserAvatarUrl(user);
    const initials = getInitials(user?.username);

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Avatar
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate('/settings')}
                    >
                        <AvatarImage
                            src={avatarUrl}
                            alt={user?.username || t('settings:userAvatar.alt')}
                            onError={(e) => handleAvatarError(e, getUserAvatarUrl({ username: user?.username || 'User' }))}
                        />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{t('settings:userAvatar.tooltip')}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default UserAvatar; 
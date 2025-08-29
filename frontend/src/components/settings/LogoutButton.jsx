import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import notification from '@/utils/notification';

/**
 * 退出登录按钮组件
 * 提供二次确认对话框
 */
const LogoutButton = () => {
    const { logout } = useAuth();
    const { t } = useTranslation('settings');
    const navigate = useNavigate();

    /**
     * 处理退出登录
     */
    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
            notification.success(t('security.logout.success'));
        } catch (error) {
            notification.error(t('security.logout.failed') + ': ' + (error.message || 'Unknown error'));
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-600 border-red-500/50 hover:border-red-500 dark:text-red-400 dark:border-red-400/50 dark:hover:border-red-400 dark:hover:text-red-300"
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('security.logout.button')}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('security.logout.confirm')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('security.logout.confirmDescription')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('security.logout.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleLogout}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {t('security.logout.confirmButton')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default LogoutButton;

import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, User, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import AvatarUpload from './AvatarUpload';
import { profileManager } from '@/services/auth/profileManager';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useTranslation } from 'react-i18next';

/**
 * 个人资料设置组件
 * 采用现代企业级设计风格
 */
const ProfileSettings = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || ''
    });
    const [originalData, setOriginalData] = useState({
        username: user?.username || '',
        email: user?.email || ''
    });
    const [errors, setErrors] = useState({});
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState(null);

    // 防抖用户名检查
    const debouncedUsername = useDebounce(formData.username, 500);

    /**
     * 检查用户名是否可用
     */
    const checkUsernameAvailability = async (username) => {
        if (!username || username === originalData.username) {
            setUsernameAvailable(null);
            return;
        }

        setIsCheckingUsername(true);
        try {
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 500));
            setUsernameAvailable(username.length >= 3);
        } catch (error) {
            console.error('检查用户名失败:', error);
            setUsernameAvailable(false);
        } finally {
            setIsCheckingUsername(false);
        }
    };

    /**
     * 验证表单
     */
    const validateForm = () => {
        const newErrors = {};

        if (!formData.username.trim()) {
            newErrors.username = t('settings:profile.errors.usernameRequired');
        } else if (formData.username.length < 3) {
            newErrors.username = t('settings:profile.errors.usernameTooShort');
        } else if (formData.username.length > 20) {
            newErrors.username = t('settings:profile.errors.usernameTooLong');
        } else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(formData.username)) {
            newErrors.username = t('settings:profile.errors.usernameInvalid');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * 处理输入变化
     */
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // 清除相关错误
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    /**
     * 保存个人资料
     */
    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            const resp = await profileManager.updateUserProfile({
                username: formData.username
            });
            if (resp?.data?.data) {
                setOriginalData({ ...formData });
            }
        } catch (error) {
            console.error('保存失败:', error);
        }
    };

    // 监听用户名变化进行可用性检查
    useEffect(() => {
        if (debouncedUsername && debouncedUsername !== originalData.username) {
            checkUsernameAvailability(debouncedUsername);
        }
    }, [debouncedUsername, originalData.username]);

    // 初始化数据
    useEffect(() => {
        if (user) {
            const userData = {
                username: user.username || '',
                email: user.email || ''
            };
            setFormData(userData);
            setOriginalData(userData);
        }
    }, [user]);

    // 验证表单
    useEffect(() => {
        validateForm();
    }, [formData]);

    const getUsernameStatus = () => {
        if (formData.username === originalData.username) return null;
        if (isCheckingUsername) return 'checking';
        if (usernameAvailable === true) return 'available';
        if (usernameAvailable === false) return 'unavailable';
        return null;
    };

    const usernameStatus = getUsernameStatus();
    const hasChanges = formData.username !== originalData.username;

    return (
        <div className="space-y-6">
            {/* 头像上传 */}
            <AvatarUpload />

            <Separator />

            {/* 基本信息 */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{t('settings:profile.basicInfo')}</h3>
                </div>

                <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-6 space-y-6">
                        {/* 用户名 */}
                        <div className="space-y-3">
                            <Label htmlFor="username" className="text-sm font-medium">
                                {t('settings:profile.username')}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="username"
                                    value={formData.username}
                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                    placeholder={t('settings:profile.usernamePlaceholder')}
                                    className={`pr-10 ${errors.username ? 'border-destructive focus:border-destructive' : ''} ${usernameStatus === 'available' ? 'border-green-500 focus:border-green-500' : ''
                                        }`}
                                    maxLength={20}
                                />

                                {/* 状态图标 */}
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    {isCheckingUsername && (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                                    )}
                                    {usernameStatus === 'available' && (
                                        <Check className="h-4 w-4 text-green-500" />
                                    )}
                                    {usernameStatus === 'unavailable' && (
                                        <AlertCircle className="h-4 w-4 text-destructive" />
                                    )}
                                </div>
                            </div>

                            {/* 状态提示 */}
                            <div className="min-h-[20px]">
                                {errors.username && (
                                    <p className="text-sm text-destructive">{errors.username}</p>
                                )}
                                {usernameStatus === 'available' && (
                                    <p className="text-sm text-green-600">{t('settings:profile.usernameAvailable')}</p>
                                )}
                                {usernameStatus === 'unavailable' && (
                                    <p className="text-sm text-destructive">{t('settings:profile.usernameTaken')}</p>
                                )}
                            </div>
                        </div>

                        {/* 邮箱显示 */}
                        <div className="space-y-3">
                            <Label htmlFor="email" className="text-sm font-medium">
                                {t('settings:profile.primaryEmail')}
                            </Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    id="email"
                                    value={formData.email}
                                    disabled
                                    className="flex-1 bg-muted/30"
                                />
                                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded">
                                    {t('settings:profile.emailEditHint')}
                                </span>
                            </div>
                        </div>

                        {/* 保存按钮 */}
                        {hasChanges && (
                            <div className="flex justify-end pt-4 border-t">
                                <Button
                                    onClick={handleSave}
                                    disabled={!!errors.username || usernameStatus === 'unavailable'}
                                    className="gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {t('settings:profile.saveChanges')}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProfileSettings;
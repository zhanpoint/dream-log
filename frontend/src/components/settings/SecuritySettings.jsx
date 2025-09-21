import React, { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, Send, Edit3, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { profileManager } from '@/services/auth/profileManager';
import notification from '@/utils/notification';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import unifiedAuthService from '@/services/auth/unifiedAuth';

/**
 * 账号安全设置组件
 * 采用现代企业级设计风格
 */
const SecuritySettings = () => {
    const { user } = useAuth();
    const { t } = useTranslation('settings');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // 邮箱更换相关状态
    const [emailChangeData, setEmailChangeData] = useState({
        newEmail: '',
        verificationCode: '',
        isVerificationSent: false,
        countdown: 0
    });

    // 密码更换相关状态
    const [passwordChangeData, setPasswordChangeData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // 备用邮箱状态
    const [backupEmailData, setBackupEmailData] = useState({
        email: user?.backup_email || '',
        verificationCode: '',
        isVerificationSent: false,
        countdown: 0
    });

    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    // 控制弹窗显隐
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [isBackupEmailDialogOpen, setIsBackupEmailDialogOpen] = useState(false);

    // 修改密码验证方式：current_password | primary_email | backup_email
    const [verificationMethod, setVerificationMethod] = useState('current_password');
    const [passwordVerification, setPasswordVerification] = useState({
        code: '',
        isSent: false,
        countdown: 0
    });

    /**
     * 验证邮箱格式
     */
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    /**
     * 校验密码复杂度，至少8位，含大小写字母、数字、特殊字符
     */
    const validatePassword = (pwd) => {
        const lengthOk = pwd.length >= 8;
        const upperOk = /[A-Z]/.test(pwd);
        const lowerOk = /[a-z]/.test(pwd);
        const numberOk = /\d/.test(pwd);
        const specialOk = /[^A-Za-z0-9]/.test(pwd);
        return lengthOk && upperOk && lowerOk && numberOk && specialOk;
    };

    /**
     * 发送邮箱验证码
     */
    const handleSendVerificationCode = async () => {
        if (!emailChangeData.newEmail) {
            setErrors(prev => ({ ...prev, newEmail: t('security.enterNewEmail') }));
            return;
        }

        if (!validateEmail(emailChangeData.newEmail)) {
            setErrors(prev => ({ ...prev, newEmail: t('security.invalidEmail') }));
            return;
        }

        setIsLoading(true);
        try {
            // 实际发送验证码到后端
            await profileManager.sendVerificationCode(emailChangeData.newEmail, 'change_email');

            setEmailChangeData(prev => ({
                ...prev,
                isVerificationSent: true,
                countdown: 60
            }));

            const timer = setInterval(() => {
                setEmailChangeData(prev => {
                    if (prev.countdown <= 1) {
                        clearInterval(timer);
                        return { ...prev, countdown: 0 };
                    }
                    return { ...prev, countdown: prev.countdown - 1 };
                });
            }, 1000);

            notification.success(t('security.verificationCodeSentToNewEmail'));
        } catch (error) {
            notification.error(t('security.sendCodeFailed') + ': ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 处理邮箱更换
     */
    const handleEmailChange = async () => {
        const newErrors = {};

        if (!emailChangeData.newEmail) {
            newErrors.newEmail = t('security.enterNewEmail');
        } else if (!validateEmail(emailChangeData.newEmail)) {
            newErrors.newEmail = t('security.invalidEmail');
        }

        if (!emailChangeData.verificationCode) {
            newErrors.verificationCode = t('security.enterVerificationCode');
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            return false;
        }

        try {
            await profileManager.changeEmail(emailChangeData.newEmail, emailChangeData.verificationCode);
            notification.success(t('security.emailChanged'));

            setEmailChangeData({
                newEmail: '',
                verificationCode: '',
                isVerificationSent: false,
                countdown: 0
            });

            // 关闭弹窗
            setIsEmailDialogOpen(false);
            return true;
        } catch (error) {
            notification.error(t('security.emailChangeFailed') + ': ' + error.message);
            return false;
        }
    };

    /**
     * 处理密码更换
     */
    const handlePasswordChange = async () => {
        const newErrors = {};

        // 新密码规则校验
        if (!passwordChangeData.newPassword) {
            newErrors.newPassword = t('security.enterNewPassword');
        } else if (!validatePassword(passwordChangeData.newPassword)) {
            newErrors.newPassword = t('security.passwordRequirements');
        }

        if (!passwordChangeData.confirmPassword) {
            newErrors.confirmPassword = t('security.enterConfirmPassword');
        } else if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
            newErrors.confirmPassword = t('security.passwordsDoNotMatch');
        }

        // 根据验证方式检查必填项
        if (verificationMethod === 'current_password') {
            if (!passwordChangeData.currentPassword) {
                newErrors.currentPassword = t('security.enterCurrentPassword');
            }
        } else {
            if (!passwordVerification.code) {
                newErrors.passwordVerificationCode = t('security.enterVerificationCode');
            }
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            return false;
        }

        try {
            if (verificationMethod === 'current_password') {
                // 统一接口：current_password 模式
                await unifiedAuthService.resetPassword('current_password', {
                    username: user?.username, // 未登录可传 username/email/phone 其一
                    currentPassword: passwordChangeData.currentPassword,
                    newPassword: passwordChangeData.newPassword
                });
            } else {
                // 统一接口：email 模式
                const targetEmail = verificationMethod === 'primary_email' ? user?.email : user?.backup_email;
                await unifiedAuthService.resetPassword('email', {
                    email: targetEmail,
                    verificationCode: passwordVerification.code,
                    newPassword: passwordChangeData.newPassword
                });
            }
            notification.success(t('security.passwordChanged'));

            setPasswordChangeData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            // 关闭弹窗并强制登出（后端通常会使所有会话失效）
            setIsPasswordDialogOpen(false);
            unifiedAuthService.logout();
            return true;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            const errorDetails = error.response?.data?.errors;

            if (errorDetails?.currentPassword) {
                setErrors(prev => ({ ...prev, currentPassword: errorDetails.currentPassword[0] }));
            }

            notification.error(t('security.passwordChangeFailed') + ': ' + errorMessage);
            return false;
        }
    };

    /**
     * 发送修改密码所需验证码（主/备邮箱）
     */
    const handleSendPasswordVerifyCode = async () => {
        const targetEmail = verificationMethod === 'primary_email' ? user?.email : user?.backup_email;
        if (!targetEmail) {
            notification.error(t('security.noEmailSet'));
            return;
        }
        setIsLoading(true);
        try {
            await profileManager.sendVerificationCode(targetEmail, 'reset_password');
            setPasswordVerification({ isSent: true, countdown: 60, code: '' });
            const timer = setInterval(() => {
                setPasswordVerification(prev => {
                    if (prev.countdown <= 1) {
                        clearInterval(timer);
                        return { ...prev, countdown: 0 };
                    }
                    return { ...prev, countdown: prev.countdown - 1 };
                });
            }, 1000);
            notification.success(t('security.verificationCodeSent'));
        } catch (error) {
            notification.error(t('security.sendCodeFailed') + ': ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 发送备用邮箱验证码
     */
    const handleSendBackupEmailVerificationCode = async () => {
        if (!backupEmailData.email) {
            setErrors(prev => ({ ...prev, backupEmail: t('security.enterBackupEmail') }));
            return;
        }

        if (!validateEmail(backupEmailData.email)) {
            setErrors(prev => ({ ...prev, backupEmail: t('security.invalidEmail') }));
            return;
        }

        if (backupEmailData.email === user?.email) {
            setErrors(prev => ({ ...prev, backupEmail: t('security.cannotUseSameEmail') }));
            return;
        }

        setIsLoading(true);
        try {
            // 实际发送验证码到后端
            await profileManager.sendVerificationCode(backupEmailData.email, 'backup_email');

            setBackupEmailData(prev => ({
                ...prev,
                isVerificationSent: true,
                countdown: 60
            }));

            const timer = setInterval(() => {
                setBackupEmailData(prev => {
                    if (prev.countdown <= 1) {
                        clearInterval(timer);
                        return { ...prev, countdown: 0 };
                    }
                    return { ...prev, countdown: prev.countdown - 1 };
                });
            }, 1000);

            notification.success(t('security.verificationCodeSentToBackupEmail'));
        } catch (error) {
            notification.error(t('security.sendCodeFailed') + ': ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 处理备用邮箱保存
     */
    const handleBackupEmailSave = async () => {
        if (!backupEmailData.verificationCode) {
            setErrors(prev => ({ ...prev, backupEmailCode: t('security.enterVerificationCode') }));
            return false;
        }

        try {
            await profileManager.setBackupEmailWithVerification(
                backupEmailData.email,
                backupEmailData.verificationCode
            );
            notification.success(t('security.backupEmailSet'));

            // 重置状态
            setBackupEmailData(prev => ({
                email: backupEmailData.email,
                verificationCode: '',
                isVerificationSent: false,
                countdown: 0
            }));

            // 关闭弹窗
            setIsBackupEmailDialogOpen(false);

            return true;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            notification.error(t('security.backupEmailSetFailed') + ': ' + errorMessage);
            return false;
        }
    };

    return (
        <div className="space-y-6">
            {/* 邮箱管理 */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{t('security.emailManagement')}</h3>
                </div>

                {/* 主邮箱卡片 */}
                <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-muted-foreground">{t('security.primaryEmail')}</span>
                                    <div className="h-1 w-1 rounded-full bg-green-500"></div>
                                    <span className="text-xs text-green-600">{t('security.verified')}</span>
                                </div>
                                <p className="text-base font-medium">{user?.email || t('security.noEmailSet')}</p>
                            </div>
                            <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Edit3 className="h-4 w-4" />
                                        {t('settings:security.change')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>{t('settings:security.changePrimaryEmail')}</DialogTitle>
                                        <DialogDescription>
                                            {t('settings:security.emailChangeDescription')}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label>{t('settings:security.enterNewEmail')}</Label>
                                            <Input
                                                type="email"
                                                value={emailChangeData.newEmail}
                                                onChange={(e) => {
                                                    const email = e.target.value;
                                                    setEmailChangeData(prev => ({
                                                        ...prev,
                                                        newEmail: email
                                                    }));

                                                    // 实时邮箱格式校验
                                                    if (email && !validateEmail(email)) {
                                                        setErrors(prev => ({ ...prev, newEmail: t('security.invalidEmail') }));
                                                    } else if (errors.newEmail) {
                                                        setErrors(prev => ({ ...prev, newEmail: undefined }));
                                                    }
                                                }}
                                                placeholder={t('settings:security.enterNewEmail')}
                                                className={errors.newEmail ? 'border-destructive' : ''}
                                            />
                                            {errors.newEmail && (
                                                <p className="text-sm text-destructive">{errors.newEmail}</p>
                                            )}
                                        </div>

                                        <Button
                                            onClick={handleSendVerificationCode}
                                            disabled={isLoading || emailChangeData.countdown > 0}
                                            variant="outline"
                                            className="w-full gap-2"
                                        >
                                            <Send className="h-4 w-4" />
                                            {emailChangeData.countdown > 0
                                                ? `${t('security.resendCode')}(${emailChangeData.countdown}s)`
                                                : t('security.sendVerificationCode')
                                            }
                                        </Button>

                                        {emailChangeData.isVerificationSent && (
                                            <div className="space-y-2">
                                                <Label>验证码</Label>
                                                <Input
                                                    value={emailChangeData.verificationCode}
                                                    onChange={(e) => setEmailChangeData(prev => ({
                                                        ...prev,
                                                        verificationCode: e.target.value
                                                    }))}
                                                    placeholder={t('security.verificationCodePlaceholder')}
                                                    maxLength={6}
                                                    className={errors.verificationCode ? 'border-destructive' : ''}
                                                />
                                                {errors.verificationCode && (
                                                    <p className="text-sm text-destructive">{errors.verificationCode}</p>
                                                )}
                                            </div>
                                        )}

                                        <Button
                                            onClick={handleEmailChange}
                                            disabled={!emailChangeData.isVerificationSent || isLoading}
                                            className="w-full"
                                        >
                                            {t('security.confirmChange')}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>

                {/* 备用邮箱卡片 */}
                <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-muted-foreground">{t('security.backupEmail')}</span>
                                    {user?.backup_email ? (
                                        <>
                                            <div className="h-1 w-1 rounded-full bg-green-500"></div>
                                            <span className="text-xs text-green-600">{t('security.verified')}</span>
                                        </>
                                    ) : null}
                                </div>
                                <p className="text-base font-medium">
                                    {user?.backup_email || t('security.notSetBackupEmail')}
                                </p>
                            </div>

                            <Dialog open={isBackupEmailDialogOpen} onOpenChange={setIsBackupEmailDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Edit3 className="h-4 w-4" />
                                        {user?.backup_email ? t('security.change') : t('security.set')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>{backupEmailData.email ? t('security.changeBackupEmail') : t('security.setBackupEmail')}</DialogTitle>
                                        <DialogDescription>{t('security.backupEmailChangeDescription')}</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label>{t('security.enterBackupEmail')}</Label>
                                            <Input
                                                type="email"
                                                value={backupEmailData.email}
                                                onChange={(e) => {
                                                    const email = e.target.value;
                                                    setBackupEmailData(prev => ({ ...prev, email }));

                                                    if (email && !validateEmail(email)) {
                                                        setErrors(prev => ({ ...prev, backupEmail: t('security.invalidEmail') }));
                                                    } else if (email === user?.email) {
                                                        setErrors(prev => ({ ...prev, backupEmail: t('security.cannotUseSameEmail') }));
                                                    } else if (errors.backupEmail) {
                                                        setErrors(prev => ({ ...prev, backupEmail: undefined }));
                                                    }
                                                }}
                                                placeholder={t('security.backupEmailPlaceholder')}
                                                className={errors.backupEmail ? 'border-destructive' : ''}
                                            />
                                            {errors.backupEmail && (
                                                <p className="text-sm text-destructive">{errors.backupEmail}</p>
                                            )}
                                        </div>

                                        <Button
                                            onClick={handleSendBackupEmailVerificationCode}
                                            disabled={isLoading || backupEmailData.countdown > 0}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            {backupEmailData.countdown > 0 ? `${t('security.resendCode')}(${backupEmailData.countdown}s)` : t('security.sendVerificationCode')}
                                        </Button>

                                        {backupEmailData.isVerificationSent && (
                                            <div className="space-y-2">
                                                <Label>验证码</Label>
                                                <Input
                                                    value={backupEmailData.verificationCode}
                                                    onChange={(e) => {
                                                        setBackupEmailData(prev => ({ ...prev, verificationCode: e.target.value }));
                                                        if (errors.backupEmailCode) {
                                                            setErrors(prev => ({ ...prev, backupEmailCode: undefined }));
                                                        }
                                                    }}
                                                    placeholder={t('security.verificationCodePlaceholder')}
                                                    maxLength={6}
                                                    className={errors.backupEmailCode ? 'border-destructive' : ''}
                                                />
                                                {errors.backupEmailCode && (
                                                    <p className="text-sm text-destructive">{errors.backupEmailCode}</p>
                                                )}
                                            </div>
                                        )}

                                        <Button onClick={handleBackupEmailSave} disabled={!backupEmailData.isVerificationSent || isLoading} className="w-full">
                                            {t('security.confirmSet')}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            {/* 密码管理 */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{t('security.passwordManagement')}</h3>
                </div>

                <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium text-muted-foreground">{t('security.loginPassword')}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{t('security.lastModified')}: 2024年1月15日</p>
                            </div>
                            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Edit3 className="h-4 w-4" />
                                        {t('security.changePassword')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>{t('security.changePassword')}</DialogTitle>
                                        <DialogDescription>{t('security.passwordChangeDescription')}</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                        {/* 验证方式 */}
                                        <div className="space-y-2">
                                            <Label>{t('security.verificationMethod')}</Label>
                                            <RadioGroup value={verificationMethod} onValueChange={setVerificationMethod} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                                <label className="flex items-center gap-2 rounded border p-2 cursor-pointer">
                                                    <RadioGroupItem value="current_password" />
                                                    <span className="text-sm">{t('security.currentPasswordMethod')}</span>
                                                </label>
                                                <label className="flex items-center gap-2 rounded border p-2 cursor-pointer">
                                                    <RadioGroupItem value="primary_email" />
                                                    <span className="text-sm">{t('security.primaryEmailMethod')}</span>
                                                </label>
                                                <label className="flex items-center gap-2 rounded border p-2 cursor-pointer">
                                                    <RadioGroupItem value="backup_email" />
                                                    <span className="text-sm">{t('security.backupEmailMethod')}</span>
                                                </label>
                                            </RadioGroup>
                                        </div>

                                        {/* 当前密码 */}
                                        {verificationMethod === 'current_password' && (
                                            <div className="space-y-2">
                                                <Label>{t('security.currentPassword')}</Label>
                                                <div className="relative">
                                                    <Input
                                                        type={showCurrentPassword ? "text" : "password"}
                                                        value={passwordChangeData.currentPassword}
                                                        onChange={(e) => setPasswordChangeData(prev => ({
                                                            ...prev,
                                                            currentPassword: e.target.value
                                                        }))}
                                                        className={errors.currentPassword ? 'border-destructive pr-10' : 'pr-10'}
                                                        placeholder={t('security.currentPasswordPlaceholder')}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    >
                                                        {showCurrentPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                                {errors.currentPassword && (
                                                    <p className="text-sm text-destructive">{errors.currentPassword}</p>
                                                )}
                                            </div>
                                        )}

                                        {/* 邮箱验证码（主/备通用） */}
                                        {(verificationMethod === 'primary_email' || verificationMethod === 'backup_email') && (
                                            <div className="space-y-2">
                                                <Label>{t('security.emailVerificationCode')}</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={passwordVerification.code}
                                                        onChange={(e) => {
                                                            setPasswordVerification(prev => ({ ...prev, code: e.target.value }));
                                                            if (errors.passwordVerificationCode) {
                                                                setErrors(prev => ({ ...prev, passwordVerificationCode: undefined }));
                                                            }
                                                        }}
                                                        placeholder={t('security.verificationCodePlaceholder')}
                                                        maxLength={6}
                                                        className={`flex-1 ${errors.passwordVerificationCode ? 'border-destructive' : ''}`}
                                                    />
                                                    <Button
                                                        onClick={handleSendPasswordVerifyCode}
                                                        disabled={isLoading || passwordVerification.countdown > 0}
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2"
                                                    >
                                                        <Send className="h-4 w-4" />
                                                        {passwordVerification.countdown > 0 ? `${t('security.resendCode')}(${passwordVerification.countdown}s)` : t('security.sendVerificationCode')}
                                                    </Button>
                                                </div>
                                                {errors.passwordVerificationCode && (
                                                    <p className="text-sm text-destructive">{errors.passwordVerificationCode}</p>
                                                )}
                                            </div>
                                        )}

                                        {/* 新密码 */}
                                        <div className="space-y-2">
                                            <Label>{t('security.newPassword')}</Label>
                                            <div className="relative">
                                                <Input
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={passwordChangeData.newPassword}
                                                    onChange={(e) => setPasswordChangeData(prev => ({
                                                        ...prev,
                                                        newPassword: e.target.value
                                                    }))}
                                                    className={errors.newPassword ? 'border-destructive pr-10' : 'pr-10'}
                                                    placeholder={t('security.newPasswordPlaceholder')}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                >
                                                    {showNewPassword ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                            {errors.newPassword && (
                                                <p className="text-sm text-destructive">{errors.newPassword}</p>
                                            )}
                                        </div>

                                        {/* 确认密码 */}
                                        <div className="space-y-2">
                                            <Label>{t('security.confirmPassword')}</Label>
                                            <div className="relative">
                                                <Input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={passwordChangeData.confirmPassword}
                                                    onChange={(e) => setPasswordChangeData(prev => ({
                                                        ...prev,
                                                        confirmPassword: e.target.value
                                                    }))}
                                                    className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                                                    placeholder={t('security.confirmPasswordPlaceholder')}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                            {errors.confirmPassword && (
                                                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                                            )}
                                        </div>

                                        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                                            <p>{t('security.passwordRequirementsText')}</p>
                                            <p>{t('security.passwordRequirementsDetail')}</p>
                                        </div>

                                        <Button
                                            onClick={handlePasswordChange}
                                            disabled={isLoading}
                                            className="w-full"
                                        >
                                            {t('security.confirmModify')}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SecuritySettings;
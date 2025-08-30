import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Eye, EyeOff, User, Lock, Phone, Mail, Shield, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Label } from "@/components/ui/label.jsx";
import notification from "@/utils/notification";
import { smsService } from "@/services/notification/sms";
import { emailService } from "@/services/notification/email";
import { useFeatureFlags } from "@/contexts/FeatureFlagContext";
import { useI18nContext } from "@/contexts/I18nContext";
import "./css/DreamTheme.css";
import "./css/pc-responsive.css";
import { useAuth } from "@/hooks/useAuth";

/**
 * 注册表单组件
 * 支持手机号和邮箱两种注册方式
 */
export function RegisterForm() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const { isFeatureEnabled, getAvailableRegisterMethods } = useFeatureFlags();
    const { t } = useI18nContext();

    // 获取可用的注册方式
    const availableRegisterMethods = getAvailableRegisterMethods();

    // 注册方式状态 - 默认选择第一个可用的注册方式
    const [registerMode, setRegisterMode] = useState(availableRegisterMethods[0] || "email");

    // 手机号注册表单状态
    const [phoneFormData, setPhoneFormData] = useState({
        username: "",
        password: "",
        confirmPassword: "",
        phone: "",
        verificationCode: "",
    });

    // 邮箱注册表单状态
    const [emailFormData, setEmailFormData] = useState({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
        verificationCode: "",
    });

    // 错误信息状态
    const [errors, setErrors] = useState({});

    // 密码可见性状态
    const [showPassword, setShowPassword] = useState(false);

    // 验证码倒计时状态
    const [phoneCountdown, setPhoneCountdown] = useState(0);
    const [emailCountdown, setEmailCountdown] = useState(0);

    // 加载状态
    const [isLoading, setIsLoading] = useState(false);

    // 倒计时效果
    useEffect(() => {
        let timer;
        if (phoneCountdown > 0) {
            timer = setTimeout(() => setPhoneCountdown(phoneCountdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [phoneCountdown]);

    useEffect(() => {
        let timer;
        if (emailCountdown > 0) {
            timer = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [emailCountdown]);

    // 处理手机号注册表单变化
    const handlePhoneFormChange = useCallback((e) => {
        const { name, value } = e.target;
        setPhoneFormData(prev => ({ ...prev, [name]: value }));

        // 清除对应字段的错误
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    }, [errors]);

    // 处理邮箱注册表单变化
    const handleEmailFormChange = useCallback((e) => {
        const { name, value } = e.target;
        setEmailFormData(prev => ({ ...prev, [name]: value }));

        // 清除对应字段的错误
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    }, [errors]);

    // 验证手机号注册表单
    const validatePhoneForm = () => {
        const newErrors = {};
        const { username, password, confirmPassword, phone, verificationCode } = phoneFormData;

        // 验证用户名
        if (!username.trim()) {
            newErrors.username = t('auth.register.validation.usernameRequired', '请输入用户名');
        } else if (username.length < 3) {
            newErrors.username = t('auth.register.validation.usernameMinLength', '用户名长度至少为3个字符');
        } else if (username.length > 20) {
            newErrors.username = t('auth.register.validation.usernameMaxLength', '用户名长度不能超过20个字符');
        }

        // 验证密码
        if (!password) {
            newErrors.password = t('auth.register.validation.passwordRequired', '请输入密码');
        } else if (password.length < 8) {
            newErrors.password = t('auth.register.validation.passwordMinLength', '密码长度至少为8个字符');
        } else if (password.length > 32) {
            newErrors.password = t('auth.register.validation.passwordMaxLength', '密码长度不能超过32个字符');
        }

        // 验证确认密码
        if (!confirmPassword) {
            newErrors.confirmPassword = t('auth.register.validation.confirmPasswordRequired', '请确认密码');
        } else if (confirmPassword !== password) {
            newErrors.confirmPassword = t('auth.register.validation.passwordMismatch', '两次输入的密码不一致');
        }

        // 验证手机号
        if (!phone) {
            newErrors.phone = t('auth.register.validation.phoneRequired', '请输入手机号');
        } else if (!/^1[3-9]\d{9}$/.test(phone)) {
            newErrors.phone = t('auth.register.validation.phoneInvalid', '请输入有效的手机号');
        }

        // 验证验证码
        if (!verificationCode) {
            newErrors.verificationCode = t('auth.register.validation.codeRequired', '请输入验证码');
        } else if (!/^\d{6}$/.test(verificationCode)) {
            newErrors.verificationCode = t('auth.register.validation.codeInvalid', '验证码为6位数字');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 验证邮箱注册表单
    const validateEmailForm = () => {
        const newErrors = {};
        const { username, password, confirmPassword, email, verificationCode } = emailFormData;

        // 验证用户名
        if (!username.trim()) {
            newErrors.username = t('auth.register.validation.usernameRequired', '请输入用户名');
        } else if (username.length < 3) {
            newErrors.username = t('auth.register.validation.usernameMinLength', '用户名长度至少为3个字符');
        } else if (username.length > 20) {
            newErrors.username = t('auth.register.validation.usernameMaxLength', '用户名长度不能超过20个字符');
        }

        // 验证密码
        if (!password) {
            newErrors.password = t('auth.register.validation.passwordRequired', '请输入密码');
        } else if (password.length < 8) {
            newErrors.password = t('auth.register.validation.passwordMinLength', '密码长度至少为8个字符');
        } else if (password.length > 32) {
            newErrors.password = t('auth.register.validation.passwordMaxLength', '密码长度不能超过32个字符');
        }

        // 验证确认密码
        if (!confirmPassword) {
            newErrors.confirmPassword = t('auth.register.validation.confirmPasswordRequired', '请确认密码');
        } else if (confirmPassword !== password) {
            newErrors.confirmPassword = t('auth.register.validation.passwordMismatch', '两次输入的密码不一致');
        }

        // 验证邮箱
        if (!email) {
            newErrors.email = t('auth.register.validation.emailRequired', '请输入邮箱地址');
        } else if (!emailService.validateEmail(email)) {
            newErrors.email = t('auth.register.validation.emailInvalid', '请输入有效的邮箱地址');
        }

        // 验证验证码
        if (!verificationCode) {
            newErrors.verificationCode = t('auth.register.validation.codeRequired', '请输入验证码');
        } else if (!/^\d{6}$/.test(verificationCode)) {
            newErrors.verificationCode = t('auth.register.validation.codeInvalid', '验证码为6位数字');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 发送手机验证码
    const handleSendPhoneVerificationCode = async () => {
        if (!phoneFormData.phone) {
            setErrors(prev => ({ ...prev, phone: t('auth.register.validation.phoneRequired', '请输入手机号') }));
            return;
        }

        if (!/^1[3-9]\d{9}$/.test(phoneFormData.phone)) {
            setErrors(prev => ({ ...prev, phone: t('auth.register.validation.phoneInvalid', '请输入有效的手机号') }));
            return;
        }

        try {
            setIsLoading(true);
            const response = await smsService.sendVerificationCode(phoneFormData.phone, 'register');

            if (response.data.code === 200) {
                notification.success("验证码发送成功，请查收短信");
                setPhoneCountdown(60);
                setErrors(prev => ({ ...prev, phone: "" }));
            } else {
                notification.warning(response.data.message || "验证码发送可能失败，请稍后再试");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "发送验证码失败，请稍后再试";
            setErrors(prev => ({ ...prev, phone: errorMessage }));
        } finally {
            setIsLoading(false);
        }
    };

    // 发送邮箱验证码
    const handleSendEmailVerificationCode = async () => {
        if (!emailFormData.email) {
            setErrors(prev => ({ ...prev, email: t('auth.register.validation.emailRequired', '请输入邮箱地址') }));
            return;
        }

        if (!emailService.validateEmail(emailFormData.email)) {
            setErrors(prev => ({ ...prev, email: t('auth.register.validation.emailInvalid', '请输入有效的邮箱地址') }));
            return;
        }

        try {
            setIsLoading(true);
            const response = await emailService.sendVerificationCode(emailFormData.email, 'register');

            if (response.data.code === 200) {
                notification.success("验证码发送成功，请查收邮箱");
                setEmailCountdown(60);
                setErrors(prev => ({ ...prev, email: "" }));
            } else {
                notification.warning(response.data.message || "验证码发送可能失败，请稍后再试");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "发送验证码失败，请稍后再试";
            setErrors(prev => ({ ...prev, email: errorMessage }));
        } finally {
            setIsLoading(false);
        }
    };

    // 处理手机号注册
    const handlePhoneSubmit = async (e) => {
        e.preventDefault();

        if (!validatePhoneForm()) return;

        setIsLoading(true);
        setErrors({});

        try {
            const result = await register('sms', {
                username: phoneFormData.username,
                password: phoneFormData.password,
                phone: phoneFormData.phone,
                verificationCode: phoneFormData.verificationCode,
            });

            if (result.success) {
                notification.success(t('auth.messages.success.registerSuccess', '注册成功！请登录您的账户'));
                navigate("/login");
            } else {
                // 仅设置表单错误状态
                if (result.field) {
                    setErrors({ [result.field]: result.message });
                } else {
                    setErrors({ general: result.message });
                }
            }
        } catch (error) {
            setErrors({ general: t('auth.messages.error.registerFailed', '注册失败，请重试') });
        } finally {
            setIsLoading(false);
        }
    };

    // 处理邮箱注册
    const handleEmailSubmit = async (e) => {
        e.preventDefault();

        if (!validateEmailForm()) return;

        setIsLoading(true);
        setErrors({});

        try {
            const result = await register('email', {
                username: emailFormData.username,
                password: emailFormData.password,
                email: emailFormData.email,
                verificationCode: emailFormData.verificationCode,
            });

            if (result.success) {
                notification.success(t('auth.messages.success.registerSuccess', '注册成功！请登录您的账户'));
                navigate("/login");
            } else {
                // 仅设置表单错误状态
                if (result.field) {
                    setErrors({ [result.field]: result.message });
                } else {
                    setErrors({ general: result.message });
                }
            }
        } catch (error) {
            setErrors({ general: t('auth.messages.error.registerFailed', '注册失败，请重试') });
        } finally {
            setIsLoading(false);
        }
    };

    // 跳转到登录页面
    const handleGoToLogin = () => {
        navigate("/login");
    };

    return (
        <Card className="w-full max-w-md mx-auto card">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center card-title">{t('auth.register.title', '创建账户')}</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={registerMode} onValueChange={setRegisterMode} className="w-full">
                    <TabsList
                        className="w-full tabs-list"
                        style={{
                            display: 'flex',
                            gap: '4px',
                            gridTemplateColumns: 'none'
                        }}
                    >
                        {isFeatureEnabled('SMS_SERVICE_ENABLED') && (
                            <TabsTrigger
                                value="phone"
                                className="flex items-center gap-2"
                                style={{ flex: 1, minWidth: 0 }}
                            >
                                <Phone className="w-4 h-4" />
                                {t('auth.register.tabs.phone', '手机注册')}
                            </TabsTrigger>
                        )}
                        {isFeatureEnabled('EMAIL_SERVICE_ENABLED') && (
                            <TabsTrigger
                                value="email"
                                className="flex items-center gap-2"
                                style={{ flex: 1, minWidth: 0 }}
                            >
                                <Mail className="w-4 h-4" />
                                {t('auth.register.tabs.email', '邮箱注册')}
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* 手机号注册 */}
                    {isFeatureEnabled('SMS_SERVICE_ENABLED') && (
                        <TabsContent value="phone" className="space-y-4">
                            <form onSubmit={handlePhoneSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone-username">{t('auth.register.form.username', '用户名')}</Label>
                                    <div className="input-container">
                                        <User className="input-icon" />
                                        <Input
                                            id="phone-username"
                                            name="username"
                                            type="text"
                                            placeholder={t('auth.register.placeholders.username', '请输入用户名')}
                                            value={phoneFormData.username}
                                            onChange={handlePhoneFormChange}
                                            className={`input ${errors.username ? 'input-error' : ''}`}
                                        />
                                    </div>
                                    {errors.username && (
                                        <p className="error-message">{errors.username}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone-password">{t('auth.register.form.password', '密码')}</Label>
                                    <div className="input-container">
                                        <Lock className="input-icon" />
                                        <Input
                                            id="phone-password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder={t('auth.register.placeholders.password', '请输入密码')}
                                            value={phoneFormData.password}
                                            onChange={handlePhoneFormChange}
                                            className={`input ${errors.password ? 'input-error' : ''}`}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="password-toggle"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        密码需包含至少8个字符，包括字母、数字、符号
                                    </p>
                                    {errors.password && (
                                        <p className="error-message">{errors.password}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone-confirmPassword">{t('auth.register.form.confirmPassword', '确认密码')}</Label>
                                    <div className="input-container">
                                        <Lock className="input-icon" />
                                        <Input
                                            id="phone-confirmPassword"
                                            name="confirmPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder={t('auth.register.placeholders.confirmPassword', '请再次输入密码')}
                                            value={phoneFormData.confirmPassword}
                                            onChange={handlePhoneFormChange}
                                            className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                                        />
                                    </div>
                                    {errors.confirmPassword && (
                                        <p className="error-message">{errors.confirmPassword}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">{t('auth.register.form.phone', '手机号')}</Label>
                                    <div className="input-container">
                                        <Phone className="input-icon" />
                                        <Input
                                            id="phone"
                                            name="phone"
                                            type="text"
                                            placeholder={t('auth.register.placeholders.phone', '请输入手机号')}
                                            value={phoneFormData.phone}
                                            onChange={handlePhoneFormChange}
                                            className={`input ${errors.phone ? 'input-error' : ''}`}
                                        />
                                    </div>
                                    {errors.phone && (
                                        <p className="error-message">{errors.phone}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone-verificationCode">{t('auth.register.form.verificationCode', '验证码')}</Label>
                                    <div className="verification-container">
                                        <div className="input-container flex-1">
                                            <Shield className="input-icon" />
                                            <Input
                                                id="phone-verificationCode"
                                                name="verificationCode"
                                                type="text"
                                                placeholder={t('auth.register.placeholders.verificationCode', '请输入验证码')}
                                                value={phoneFormData.verificationCode}
                                                onChange={handlePhoneFormChange}
                                                className={`verification-input ${errors.verificationCode ? 'input-error' : ''}`}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={handleSendPhoneVerificationCode}
                                            disabled={phoneCountdown > 0 || isLoading}
                                            className="verification-button"
                                        >
                                            {phoneCountdown > 0 ? `${phoneCountdown}s` : t('auth.register.form.sendCode', '获取验证码')}
                                        </Button>
                                    </div>
                                    {errors.verificationCode && (
                                        <p className="error-message">{errors.verificationCode}</p>
                                    )}
                                </div>

                                {errors.general && (
                                    <div className="text-sm text-red-500 text-center error-message">
                                        {errors.general}
                                    </div>
                                )}

                                <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
                                    {isLoading ? t('auth.register.form.registering', '注册中...') : t('auth.register.form.registerButton', '注册')}
                                </Button>
                            </form>
                        </TabsContent>
                    )}

                    {/* 邮箱注册 */}
                    {isFeatureEnabled('EMAIL_SERVICE_ENABLED') && (
                        <TabsContent value="email" className="space-y-4">
                            <form onSubmit={handleEmailSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email-username">{t('auth.register.form.username', '用户名')}</Label>
                                    <div className="input-container">
                                        <User className="input-icon" />
                                        <Input
                                            id="email-username"
                                            name="username"
                                            type="text"
                                            placeholder={t('auth.register.placeholders.username', '请输入用户名')}
                                            value={emailFormData.username}
                                            onChange={handleEmailFormChange}
                                            className={`input ${errors.username ? 'input-error' : ''}`}
                                        />
                                    </div>
                                    {errors.username && (
                                        <p className="error-message">{errors.username}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email-password">{t('auth.register.form.password', '密码')}</Label>
                                    <div className="input-container">
                                        <Lock className="input-icon" />
                                        <Input
                                            id="email-password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder={t('auth.register.placeholders.password', '请输入密码')}
                                            value={emailFormData.password}
                                            onChange={handleEmailFormChange}
                                            className={`input ${errors.password ? 'input-error' : ''}`}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="password-toggle"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('auth.register.form.passwordTip', '密码需包含至少8个字符，包括字母、数字、符号')}
                                    </p>
                                    {errors.password && (
                                        <p className="error-message">{errors.password}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email-confirmPassword">{t('auth.register.form.confirmPassword', '确认密码')}</Label>
                                    <div className="input-container">
                                        <Lock className="input-icon" />
                                        <Input
                                            id="email-confirmPassword"
                                            name="confirmPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder={t('auth.register.placeholders.confirmPassword', '请再次输入密码')}
                                            value={emailFormData.confirmPassword}
                                            onChange={handleEmailFormChange}
                                            className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                                        />
                                    </div>
                                    {errors.confirmPassword && (
                                        <p className="error-message">{errors.confirmPassword}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email-address">{t('auth.register.form.email', '邮箱地址')}</Label>
                                    <div className="input-container">
                                        <Mail className="input-icon" />
                                        <Input
                                            id="email-address"
                                            name="email"
                                            type="email"
                                            placeholder={t('auth.register.placeholders.email', '请输入邮箱地址')}
                                            value={emailFormData.email}
                                            onChange={handleEmailFormChange}
                                            className={`input ${errors.email ? 'input-error' : ''}`}
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="error-message">{errors.email}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email-verificationCode">{t('auth.register.form.verificationCode', '验证码')}</Label>
                                    <div className="verification-container">
                                        <div className="input-container flex-1">
                                            <Shield className="input-icon" />
                                            <Input
                                                id="email-verificationCode"
                                                name="verificationCode"
                                                type="text"
                                                placeholder={t('auth.register.placeholders.verificationCode', '请输入验证码')}
                                                value={emailFormData.verificationCode}
                                                onChange={handleEmailFormChange}
                                                className={`verification-input ${errors.verificationCode ? 'input-error' : ''}`}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={handleSendEmailVerificationCode}
                                            disabled={emailCountdown > 0 || isLoading}
                                            className="verification-button"
                                        >
                                            {emailCountdown > 0 ? `${emailCountdown}s` : t('auth.register.form.sendCode', '获取验证码')}
                                        </Button>
                                    </div>
                                    {errors.verificationCode && (
                                        <p className="error-message">{errors.verificationCode}</p>
                                    )}
                                </div>

                                {errors.general && (
                                    <div className="text-sm text-red-500 text-center error-message">
                                        {errors.general}
                                    </div>
                                )}

                                <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
                                    {isLoading ? t('auth.register.form.registering', '注册中...') : t('auth.register.form.registerButton', '注册')}
                                </Button>
                            </form>
                        </TabsContent>
                    )}
                </Tabs>
            </CardContent>
            <CardFooter>
                <div className="text-center w-full login-link">
                    <span className="text-sm text-muted-foreground">{t('auth.register.links.hasAccount', '已有账户？')}</span>
                    <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); handleGoToLogin(); }}
                        className="dream-link ml-1"
                    >
                        <Star className="w-3 h-3 inline mr-1" />
                        {t('auth.register.links.login', '立即登录')}
                    </a>
                </div>
            </CardFooter>
        </Card>
    );
}

export default RegisterForm; 
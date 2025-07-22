import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Eye, EyeOff, User, Lock, Phone, Mail, Shield, Sparkles, Star } from "lucide-react";
import { smsService } from "@/services/notification/sms";
import { emailService } from "@/services/notification/email";
import notification from "@/utils/notification";
import { isFeatureEnabled, getAvailableLoginMethods } from "@/config/features";
import "./css/DreamTheme.css";

/**
 * 三模式登录表单组件
 * 支持用户名密码、手机号验证码、邮箱验证码三种登录方式
 */
export function DualLoginForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    // 获取重定向地址（如果有）
    const from = location.state?.from?.pathname || "/";

    // 获取可用的登录方式
    const availableLoginMethods = getAvailableLoginMethods();

    // 登录模式状态 - 默认选择第一个可用的登录方式
    const [loginMode, setLoginMode] = useState(availableLoginMethods[0] || "password");

    // 用户名密码登录表单
    const [passwordForm, setPasswordForm] = useState({
        username: "",
        password: "",
    });

    // 手机号验证码登录表单
    const [smsForm, setSmsForm] = useState({
        phone: "",
        verificationCode: "",
    });

    // 邮箱验证码登录表单
    const [emailForm, setEmailForm] = useState({
        email: "",
        verificationCode: "",
    });

    // 错误信息状态
    const [errors, setErrors] = useState({});

    // 密码可见性
    const [showPassword, setShowPassword] = useState(false);

    // 验证码计时器状态
    const [smsCountdown, setSmsCountdown] = useState(0);
    const [emailCountdown, setEmailCountdown] = useState(0);

    // 加载状态
    const [isLoading, setIsLoading] = useState(false);

    // 倒计时效果
    useEffect(() => {
        let timer;
        if (smsCountdown > 0) {
            timer = setTimeout(() => setSmsCountdown(smsCountdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [smsCountdown]);

    useEffect(() => {
        let timer;
        if (emailCountdown > 0) {
            timer = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [emailCountdown]);

    // 处理用户名密码表单变化
    const handlePasswordFormChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm({ ...passwordForm, [name]: value });

        // 清除错误
        if (errors[name]) {
            setErrors({ ...errors, [name]: "" });
        }
    };

    // 处理短信验证码表单变化
    const handleSmsFormChange = (e) => {
        const { name, value } = e.target;
        setSmsForm({ ...smsForm, [name]: value });

        // 清除错误
        if (errors[name]) {
            setErrors({ ...errors, [name]: "" });
        }
    };

    // 处理邮箱验证码表单变化
    const handleEmailFormChange = (e) => {
        const { name, value } = e.target;
        setEmailForm({ ...emailForm, [name]: value });

        // 清除错误
        if (errors[name]) {
            setErrors({ ...errors, [name]: "" });
        }
    };

    // 验证密码登录表单
    const validatePasswordForm = () => {
        const newErrors = {};

        if (!passwordForm.username.trim()) {
            newErrors.username = "请输入用户名";
        } else if (passwordForm.username.length < 3) {
            newErrors.username = "用户名长度至少为3个字符";
        } else if (passwordForm.username.length > 20) {
            newErrors.username = "用户名长度不能超过20个字符";
        }

        if (!passwordForm.password) {
            newErrors.password = "请输入密码";
        } else if (passwordForm.password.length < 8) {
            newErrors.password = "密码长度至少为8个字符";
        } else if (passwordForm.password.length > 32) {
            newErrors.password = "密码长度不能超过32个字符";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 验证短信登录表单
    const validateSmsForm = () => {
        const newErrors = {};

        if (!smsForm.phone) {
            newErrors.phone = "请输入手机号码";
        } else if (!/^1[3-9]\d{9}$/.test(smsForm.phone)) {
            newErrors.phone = "请输入有效的手机号码";
        }

        if (!smsForm.verificationCode) {
            newErrors.verificationCode = "请输入验证码";
        } else if (!/^\d{6}$/.test(smsForm.verificationCode)) {
            newErrors.verificationCode = "验证码为6位数字";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 验证邮箱登录表单
    const validateEmailForm = () => {
        const newErrors = {};

        if (!emailForm.email) {
            newErrors.email = "请输入邮箱地址";
        } else if (!emailService.validateEmail(emailForm.email)) {
            newErrors.email = "请输入有效的邮箱地址";
        }

        if (!emailForm.verificationCode) {
            newErrors.verificationCode = "请输入验证码";
        } else if (!/^\d{6}$/.test(emailForm.verificationCode)) {
            newErrors.verificationCode = "验证码为6位数字";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 发送短信验证码
    const handleSendSmsVerificationCode = async () => {
        // 验证手机号
        if (!smsForm.phone) {
            setErrors({ ...errors, phone: "请输入手机号码" });
            return;
        } else if (!/^1[3-9]\d{9}$/.test(smsForm.phone)) {
            setErrors({ ...errors, phone: "请输入有效的手机号码" });
            return;
        }

        try {
            setIsLoading(true);
            const response = await smsService.sendVerificationCode(smsForm.phone, 'login');

            if (response.data.code === 200) {
                notification.success(response.data.message || "验证码发送成功，请查收短信");
                setSmsCountdown(60);
                setErrors(prev => ({ ...prev, phone: "" }));
            } else {
                notification.warning(response.data.message || "验证码发送可能失败，请稍后再试");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "发送验证码失败，请稍后再试";
            notification.error(errorMessage);

            if (error.response?.data?.field) {
                setErrors({ ...errors, [error.response.data.field]: errorMessage });
            } else {
                setErrors({ ...errors, phone: errorMessage });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 发送邮箱验证码
    const handleSendEmailVerificationCode = async () => {
        // 验证邮箱
        if (!emailForm.email) {
            setErrors({ ...errors, email: "请输入邮箱地址" });
            return;
        } else if (!emailService.validateEmail(emailForm.email)) {
            setErrors({ ...errors, email: "请输入有效的邮箱地址" });
            return;
        }

        try {
            setIsLoading(true);
            const response = await emailService.sendVerificationCode(emailForm.email, 'login');

            if (response.data.code === 200) {
                notification.success(response.data.message || "验证码发送成功，请查收邮箱");
                setEmailCountdown(60);
                setErrors(prev => ({ ...prev, email: "" }));
            } else {
                notification.warning(response.data.message || "验证码发送可能失败，请稍后再试");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "发送验证码失败，请稍后再试";
            notification.error(errorMessage);

            if (error.response?.data?.field) {
                setErrors({ ...errors, [error.response.data.field]: errorMessage });
            } else {
                setErrors({ ...errors, email: errorMessage });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 统一的登录处理函数
    const handleLogin = async (e, loginType) => {
        e.preventDefault();

        // 验证表单
        let isValid = false;
        let credentials = {};

        switch (loginType) {
            case 'password':
                isValid = validatePasswordForm();
                credentials = {
                    username: passwordForm.username,
                    password: passwordForm.password
                };
                break;
            case 'sms':
                isValid = validateSmsForm();
                credentials = {
                    phone: smsForm.phone,
                    verificationCode: smsForm.verificationCode
                };
                break;
            case 'email':
                isValid = validateEmailForm();
                credentials = {
                    email: emailForm.email,
                    verificationCode: emailForm.verificationCode
                };
                break;
        }

        if (!isValid) return;

        setIsLoading(true);
        setErrors({});

        try {
            const result = await login(loginType, credentials);

            if (result.success) {
                notification.success("登录成功！");
                navigate(from, { replace: true });
            } else {
                if (result.field) {
                    setErrors({ [result.field]: result.message });
                } else {
                    setErrors({ general: result.message });
                }
            }
        } catch (error) {
            setErrors({ general: "登录失败，请重试" });
        } finally {
            setIsLoading(false);
        }
    };

    // 处理跳转到注册页面
    const handleGoToRegister = (e) => {
        e.preventDefault();
        navigate("/register");
    };

    // 处理跳转到忘记密码页面
    const handleGoToForgotPassword = (e) => {
        e.preventDefault();
        navigate("/reset-password");
    };

    return (
        <Card className="w-full max-w-md mx-auto card">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center card-title">
                    <div className="flex items-center justify-center gap-2">
                        <Sparkles className="w-6 h-6 text-purple-500" />
                        梦境门户
                        <Star className="w-5 h-5 text-yellow-400" />
                    </div>
                </CardTitle>
                <CardDescription className="text-center">登录您的账户，开始梦想之旅</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={loginMode} onValueChange={setLoginMode} className="w-full">
                    <TabsList
                        className="w-full tabs-list"
                        style={{
                            display: 'flex',
                            gap: '4px',
                            gridTemplateColumns: 'none' // 覆盖任何grid样式
                        }}
                    >
                        {isFeatureEnabled('PASSWORD_LOGIN_ENABLED') && (
                            <TabsTrigger
                                value="password"
                                className="flex items-center gap-2"
                                style={{ flex: 1, minWidth: 0 }}
                            >
                                <Lock className="w-4 h-4" />
                                账号密码
                            </TabsTrigger>
                        )}
                        {isFeatureEnabled('SMS_SERVICE_ENABLED') && (
                            <TabsTrigger
                                value="sms"
                                className="flex items-center gap-2"
                                style={{ flex: 1, minWidth: 0 }}
                            >
                                <Phone className="w-4 h-4" />
                                手机验证
                            </TabsTrigger>
                        )}
                        {isFeatureEnabled('EMAIL_SERVICE_ENABLED') && (
                            <TabsTrigger
                                value="email"
                                className="flex items-center gap-2"
                                style={{ flex: 1, minWidth: 0 }}
                            >
                                <Mail className="w-4 h-4" />
                                邮箱验证
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* 密码登录 */}
                    {isFeatureEnabled('PASSWORD_LOGIN_ENABLED') && (
                        <TabsContent value="password" className="space-y-4">
                            <form onSubmit={(e) => handleLogin(e, 'password')} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">用户名</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="username"
                                            name="username"
                                            type="text"
                                            placeholder="请输入用户名"
                                            value={passwordForm.username}
                                            onChange={handlePasswordFormChange}
                                            className={`pl-10 input ${errors.username ? 'error-input' : ''}`}
                                        />
                                    </div>
                                    {errors.username && (
                                        <p className="text-sm text-red-500 error-message">{errors.username}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">密码</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="请输入密码"
                                            value={passwordForm.password}
                                            onChange={handlePasswordFormChange}
                                            className={`pl-10 pr-10 input ${errors.password ? 'error-input' : ''}`}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </Button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-sm text-red-500 error-message">{errors.password}</p>
                                    )}
                                </div>

                                {errors.general && (
                                    <div className="text-sm text-red-500 text-center error-message">
                                        {errors.general}
                                    </div>
                                )}

                                <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
                                    {isLoading ? "登录中..." : "登录"}
                                </Button>
                            </form>
                        </TabsContent>
                    )}

                    {/* 手机验证码登录 */}
                    {isFeatureEnabled('SMS_SERVICE_ENABLED') && (
                        <TabsContent value="sms" className="space-y-4">
                            <form onSubmit={(e) => handleLogin(e, 'sms')} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">手机号</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="phone"
                                            name="phone"
                                            type="text"
                                            placeholder="请输入手机号"
                                            value={smsForm.phone}
                                            onChange={handleSmsFormChange}
                                            className={`pl-10 input ${errors.phone ? 'error-input' : ''}`}
                                        />
                                    </div>
                                    {errors.phone && (
                                        <p className="text-sm text-red-500 error-message">{errors.phone}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="verificationCode">验证码</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="verificationCode"
                                                name="verificationCode"
                                                type="text"
                                                placeholder="请输入验证码"
                                                value={smsForm.verificationCode}
                                                onChange={handleSmsFormChange}
                                                className={`pl-10 input ${errors.verificationCode ? 'error-input' : ''}`}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleSendSmsVerificationCode}
                                            disabled={smsCountdown > 0 || isLoading}
                                            className="whitespace-nowrap"
                                        >
                                            {smsCountdown > 0 ? `${smsCountdown}s` : "获取验证码"}
                                        </Button>
                                    </div>
                                    {errors.verificationCode && (
                                        <p className="text-sm text-red-500 error-message">{errors.verificationCode}</p>
                                    )}
                                </div>

                                {errors.general && (
                                    <div className="text-sm text-red-500 text-center error-message">
                                        {errors.general}
                                    </div>
                                )}

                                <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
                                    {isLoading ? "登录中..." : "登录"}
                                </Button>
                            </form>
                        </TabsContent>
                    )}

                    {/* 邮箱验证码登录 */}
                    {isFeatureEnabled('EMAIL_SERVICE_ENABLED') && (
                        <TabsContent value="email" className="space-y-4">
                            <form onSubmit={(e) => handleLogin(e, 'email')} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">邮箱地址</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="请输入邮箱地址"
                                            value={emailForm.email}
                                            onChange={handleEmailFormChange}
                                            className={`pl-10 input ${errors.email ? 'error-input' : ''}`}
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="text-sm text-red-500 error-message">{errors.email}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="emailVerificationCode">验证码</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="emailVerificationCode"
                                                name="verificationCode"
                                                type="text"
                                                placeholder="请输入验证码"
                                                value={emailForm.verificationCode}
                                                onChange={handleEmailFormChange}
                                                className={`pl-10 input ${errors.verificationCode ? 'error-input' : ''}`}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleSendEmailVerificationCode}
                                            disabled={emailCountdown > 0 || isLoading}
                                            className="whitespace-nowrap"
                                        >
                                            {emailCountdown > 0 ? `${emailCountdown}s` : "获取验证码"}
                                        </Button>
                                    </div>
                                    {errors.verificationCode && (
                                        <p className="text-sm text-red-500 error-message">{errors.verificationCode}</p>
                                    )}
                                </div>

                                {errors.general && (
                                    <div className="text-sm text-red-500 text-center error-message">
                                        {errors.general}
                                    </div>
                                )}

                                <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
                                    {isLoading ? "登录中..." : "登录"}
                                </Button>
                            </form>
                        </TabsContent>
                    )}
                </Tabs>

                {/* 底部链接区域 */}
                <div className="mt-6 space-y-4">
                    <div className="text-center">
                        <a
                            href="#"
                            onClick={handleGoToForgotPassword}
                            className="dream-link text-sm"
                        >
                            <Sparkles className="w-3 h-3 inline mr-1" />
                            忘记密码？
                        </a>
                    </div>
                    <div className="text-center login-link">
                        <span className="text-sm text-muted-foreground">还没有账户？</span>
                        <a
                            href="#"
                            onClick={handleGoToRegister}
                            className="text-primary dream-link ml-1"
                        >
                            <Star className="w-3 h-3 inline mr-1" />
                            立即注册
                        </a>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default DualLoginForm; 
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Phone, Mail, Shield, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Label } from "@/components/ui/label.jsx";
import { emailService } from "@/services/notification/email";
import { smsService } from "@/services/notification/sms";
import notification from "@/utils/notification";
import { isFeatureEnabled, getAvailableResetMethods } from "@/config/features";
import { useAuth } from "@/hooks/useAuth";
import "./css/DreamTheme.css";

/**
 * 密码重置表单组件
 * 支持通过手机号或邮箱重置密码功能
 */
export function ResetPasswordForm() {
    const navigate = useNavigate();
    const { resetPassword } = useAuth();

    // 获取可用的重置方式
    const availableResetMethods = getAvailableResetMethods();

    // 重置方式状态 - 默认选择第一个可用的重置方式
    const [resetMode, setResetMode] = useState(availableResetMethods[0] || "email");

    // 手机号重置表单状态
    const [phoneFormData, setPhoneFormData] = useState({
        phone: "",
        verificationCode: "",
        newPassword: "",
        confirmPassword: ""
    });

    // 邮箱重置表单状态
    const [emailFormData, setEmailFormData] = useState({
        email: "",
        verificationCode: "",
        newPassword: "",
        confirmPassword: ""
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
    React.useEffect(() => {
        let timer;
        if (phoneCountdown > 0) {
            timer = setTimeout(() => setPhoneCountdown(phoneCountdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [phoneCountdown]);

    React.useEffect(() => {
        let timer;
        if (emailCountdown > 0) {
            timer = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [emailCountdown]);

    // 处理手机号重置表单变化
    const handlePhoneFormChange = (e) => {
        const { name, value } = e.target;
        setPhoneFormData(prev => ({ ...prev, [name]: value }));

        // 清除对应字段的错误
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    // 处理邮箱重置表单变化
    const handleEmailFormChange = (e) => {
        const { name, value } = e.target;
        setEmailFormData(prev => ({ ...prev, [name]: value }));

        // 清除对应字段的错误
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    // 验证手机号重置表单
    const validatePhoneForm = () => {
        const newErrors = {};
        const { phone, verificationCode, newPassword, confirmPassword } = phoneFormData;

        // 验证手机号
        if (!phone) {
            newErrors.phone = "请输入手机号";
        } else if (!/^1[3-9]\d{9}$/.test(phone)) {
            newErrors.phone = "请输入有效的手机号";
        }

        // 验证验证码
        if (!verificationCode) {
            newErrors.verificationCode = "请输入验证码";
        } else if (!/^\d{6}$/.test(verificationCode)) {
            newErrors.verificationCode = "验证码为6位数字";
        }

        // 验证新密码
        if (!newPassword) {
            newErrors.newPassword = "请输入新密码";
        } else if (newPassword.length < 8) {
            newErrors.newPassword = "密码长度至少为8个字符";
        } else if (newPassword.length > 32) {
            newErrors.newPassword = "密码长度不能超过32个字符";
        }

        // 验证确认密码
        if (!confirmPassword) {
            newErrors.confirmPassword = "请确认新密码";
        } else if (confirmPassword !== newPassword) {
            newErrors.confirmPassword = "两次输入的密码不一致";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 验证邮箱重置表单
    const validateEmailForm = () => {
        const newErrors = {};
        const { email, verificationCode, newPassword, confirmPassword } = emailFormData;

        // 验证邮箱
        if (!email) {
            newErrors.email = "请输入邮箱地址";
        } else if (!emailService.validateEmail(email)) {
            newErrors.email = "请输入有效的邮箱地址";
        }

        // 验证验证码
        if (!verificationCode) {
            newErrors.verificationCode = "请输入验证码";
        } else if (!/^\d{6}$/.test(verificationCode)) {
            newErrors.verificationCode = "验证码为6位数字";
        }

        // 验证新密码
        if (!newPassword) {
            newErrors.newPassword = "请输入新密码";
        } else if (newPassword.length < 8) {
            newErrors.newPassword = "密码长度至少为8个字符";
        } else if (newPassword.length > 32) {
            newErrors.newPassword = "密码长度不能超过32个字符";
        }

        // 验证确认密码
        if (!confirmPassword) {
            newErrors.confirmPassword = "请确认新密码";
        } else if (confirmPassword !== newPassword) {
            newErrors.confirmPassword = "两次输入的密码不一致";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 发送手机验证码
    const handleSendPhoneVerificationCode = async () => {
        if (!phoneFormData.phone) {
            setErrors(prev => ({ ...prev, phone: "请输入手机号" }));
            return;
        }

        if (!/^1[3-9]\d{9}$/.test(phoneFormData.phone)) {
            setErrors(prev => ({ ...prev, phone: "请输入有效的手机号" }));
            return;
        }

        try {
            setIsLoading(true);
            const response = await smsService.sendVerificationCode(phoneFormData.phone, 'reset_password');

            if (response.data.code === 200) {
                notification.success("验证码发送成功，请查收短信");
                setPhoneCountdown(60);
                setErrors(prev => ({ ...prev, phone: "" }));
            } else {
                notification.warning(response.data.message || "验证码发送可能失败，请稍后再试");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "发送验证码失败，请稍后再试";
            notification.error(errorMessage);
            setErrors(prev => ({ ...prev, phone: errorMessage }));
        } finally {
            setIsLoading(false);
        }
    };

    // 发送邮箱验证码
    const handleSendEmailVerificationCode = async () => {
        if (!emailFormData.email) {
            setErrors(prev => ({ ...prev, email: "请输入邮箱地址" }));
            return;
        }

        if (!emailService.validateEmail(emailFormData.email)) {
            setErrors(prev => ({ ...prev, email: "请输入有效的邮箱地址" }));
            return;
        }

        try {
            setIsLoading(true);
            const response = await emailService.sendVerificationCode(emailFormData.email, 'reset_password');

            if (response.data.code === 200) {
                notification.success("验证码发送成功，请查收邮箱");
                setEmailCountdown(60);
                setErrors(prev => ({ ...prev, email: "" }));
            } else {
                notification.warning(response.data.message || "验证码发送可能失败，请稍后再试");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "发送验证码失败，请稍后再试";
            notification.error(errorMessage);
            setErrors(prev => ({ ...prev, email: errorMessage }));
        } finally {
            setIsLoading(false);
        }
    };

    // 处理手机号重置
    const handlePhoneSubmit = async (e) => {
        e.preventDefault();

        if (!validatePhoneForm()) return;

        setIsLoading(true);
        setErrors({});

        try {
            const result = await resetPassword('sms', {
                phone: phoneFormData.phone,
                verificationCode: phoneFormData.verificationCode,
                newPassword: phoneFormData.newPassword,
            });

            if (result.success) {
                notification.success("密码重置成功！请使用新密码登录");
                navigate("/login");
            } else {
                if (result.field) {
                    setErrors({ [result.field]: result.message });
                } else {
                    setErrors({ general: result.message });
                }
            }
        } catch (error) {
            setErrors({ general: "重置密码失败，请重试" });
        } finally {
            setIsLoading(false);
        }
    };

    // 处理邮箱重置
    const handleEmailSubmit = async (e) => {
        e.preventDefault();

        if (!validateEmailForm()) return;

        setIsLoading(true);
        setErrors({});

        try {
            const result = await resetPassword('email', {
                email: emailFormData.email,
                verificationCode: emailFormData.verificationCode,
                newPassword: emailFormData.newPassword,
            });

            if (result.success) {
                notification.success("密码重置成功！请使用新密码登录");
                navigate("/login");
            } else {
                if (result.field) {
                    setErrors({ [result.field]: result.message });
                } else {
                    setErrors({ general: result.message });
                }
            }
        } catch (error) {
            setErrors({ general: "重置密码失败，请重试" });
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
                <CardTitle className="text-2xl font-bold text-center card-title">重置密码</CardTitle>
                <CardDescription className="text-center">
                    通过手机号或邮箱重置您的密码
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={resetMode} onValueChange={setResetMode} className="w-full">
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
                                手机重置
                            </TabsTrigger>
                        )}
                        {isFeatureEnabled('EMAIL_SERVICE_ENABLED') && (
                            <TabsTrigger
                                value="email"
                                className="flex items-center gap-2"
                                style={{ flex: 1, minWidth: 0 }}
                            >
                                <Mail className="w-4 h-4" />
                                邮箱重置
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* 手机号重置 */}
                    {isFeatureEnabled('SMS_SERVICE_ENABLED') && (
                        <TabsContent value="phone" className="space-y-4">
                            <form onSubmit={handlePhoneSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">手机号</Label>
                                    <div className="input-container">
                                        <Phone className="input-icon" />
                                        <Input
                                            id="phone"
                                            name="phone"
                                            type="text"
                                            placeholder="请输入手机号"
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
                                    <Label htmlFor="phone-verificationCode">验证码</Label>
                                    <div className="verification-container">
                                        <div className="input-container flex-1">
                                            <Shield className="input-icon" />
                                            <Input
                                                id="phone-verificationCode"
                                                name="verificationCode"
                                                type="text"
                                                placeholder="请输入验证码"
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
                                            {phoneCountdown > 0 ? `${phoneCountdown}s` : "获取验证码"}
                                        </Button>
                                    </div>
                                    {errors.verificationCode && (
                                        <p className="error-message">{errors.verificationCode}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone-newPassword">新密码</Label>
                                    <div className="input-container">
                                        <Lock className="input-icon" />
                                        <Input
                                            id="phone-newPassword"
                                            name="newPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="请输入新密码"
                                            value={phoneFormData.newPassword}
                                            onChange={handlePhoneFormChange}
                                            className={`input ${errors.newPassword ? 'input-error' : ''}`}
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
                                    {errors.newPassword && (
                                        <p className="error-message">{errors.newPassword}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone-confirmPassword">确认新密码</Label>
                                    <div className="input-container">
                                        <Lock className="input-icon" />
                                        <Input
                                            id="phone-confirmPassword"
                                            name="confirmPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="请再次输入新密码"
                                            value={phoneFormData.confirmPassword}
                                            onChange={handlePhoneFormChange}
                                            className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                                        />
                                    </div>
                                    {errors.confirmPassword && (
                                        <p className="error-message">{errors.confirmPassword}</p>
                                    )}
                                </div>

                                {errors.general && (
                                    <div className="text-sm text-red-500 text-center error-message">
                                        {errors.general}
                                    </div>
                                )}

                                <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
                                    {isLoading ? "重置中..." : "重置密码"}
                                </Button>
                            </form>
                        </TabsContent>
                    )}

                    {/* 邮箱重置 */}
                    {isFeatureEnabled('EMAIL_SERVICE_ENABLED') && (
                        <TabsContent value="email" className="space-y-4">
                            <form onSubmit={handleEmailSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email-address">邮箱地址</Label>
                                    <div className="input-container">
                                        <Mail className="input-icon" />
                                        <Input
                                            id="email-address"
                                            name="email"
                                            type="email"
                                            placeholder="请输入邮箱地址"
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
                                    <Label htmlFor="email-verificationCode">验证码</Label>
                                    <div className="verification-container">
                                        <div className="input-container flex-1">
                                            <Shield className="input-icon" />
                                            <Input
                                                id="email-verificationCode"
                                                name="verificationCode"
                                                type="text"
                                                placeholder="请输入验证码"
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
                                            {emailCountdown > 0 ? `${emailCountdown}s` : "获取验证码"}
                                        </Button>
                                    </div>
                                    {errors.verificationCode && (
                                        <p className="error-message">{errors.verificationCode}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email-newPassword">新密码</Label>
                                    <div className="input-container">
                                        <Lock className="input-icon" />
                                        <Input
                                            id="email-newPassword"
                                            name="newPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="请输入新密码"
                                            value={emailFormData.newPassword}
                                            onChange={handleEmailFormChange}
                                            className={`input ${errors.newPassword ? 'input-error' : ''}`}
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
                                    {errors.newPassword && (
                                        <p className="error-message">{errors.newPassword}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email-confirmPassword">确认新密码</Label>
                                    <div className="input-container">
                                        <Lock className="input-icon" />
                                        <Input
                                            id="email-confirmPassword"
                                            name="confirmPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="请再次输入新密码"
                                            value={emailFormData.confirmPassword}
                                            onChange={handleEmailFormChange}
                                            className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                                        />
                                    </div>
                                    {errors.confirmPassword && (
                                        <p className="error-message">{errors.confirmPassword}</p>
                                    )}
                                </div>

                                {errors.general && (
                                    <div className="text-sm text-red-500 text-center error-message">
                                        {errors.general}
                                    </div>
                                )}

                                <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
                                    {isLoading ? "重置中..." : "重置密码"}
                                </Button>
                            </form>
                        </TabsContent>
                    )}
                </Tabs>
            </CardContent>
            <CardFooter>
                <div className="text-center w-full login-link">
                    <span className="text-sm text-muted-foreground">想起密码了？</span>
                    <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); handleGoToLogin(); }}
                        className="dream-link ml-1"
                    >
                        <Star className="w-3 h-3 inline mr-1" />
                        返回登录
                    </a>
                </div>
            </CardFooter>
        </Card>
    );
}

export default ResetPasswordForm; 
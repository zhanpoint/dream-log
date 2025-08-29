import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { useI18nContext } from "@/contexts/I18nContext";
import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher";
import "@/styles/features/auth.css";

/**
 * 注册页面组件
 * 展示用户注册表单
 */
function Register() {
    const { t } = useI18nContext();

    return (
        <div className="auth-page">
            {/* 简化版导航栏，包含返回按钮和品牌logo */}
            <header className="auth-header">
                <div className="auth-header-container">
                    <Link to="/login" className="auth-back-button dream-link">
                        <ArrowLeft />
                        {t('auth.register.links.backToLogin', '返回登录')}
                    </Link>

                    <Link to="/" className="auth-logo">
                        <img src="/assets/logo.svg" className="auth-logo-image" alt="Dreamlog" />
                        <span className="auth-logo-text">Dreamlog</span>
                    </Link>

                    <AuthLanguageSwitcher />
                </div>
            </header>

            <div className="auth-container">
                <div className="auth-content">
                    <RegisterForm />
                </div>

                {/* 背景装饰 */}
                <div className="bg-decoration bg-decoration-1"></div>
                <div className="bg-decoration bg-decoration-2"></div>
                <div className="bg-decoration bg-decoration-3"></div>
            </div>
        </div>
    );
}

export { Register };
export default Register; 
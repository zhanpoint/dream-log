import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DualLoginForm } from "@/features/auth/components/DualLoginForm";
import { useI18nContext } from "@/contexts/I18nContext";
import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher";
import "@/styles/features/auth.css";

/**
 * 登录页面组件
 */
function LoginPage() {
    const { t } = useI18nContext();

    return (
        <div className="auth-page">
            {/* 简化版导航栏，包含返回按钮和品牌logo */}
            <header className="auth-header">
                <div className="auth-header-container">
                    <Link to="/" className="auth-back-button">
                        <ArrowLeft />
                        {t('auth.login.links.backToHome', '返回首页')}
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
                    <DualLoginForm />
                </div>

                {/* 背景装饰元素 */}
                <div className="bg-decoration bg-decoration-1"></div>
                <div className="bg-decoration bg-decoration-2"></div>
                <div className="bg-decoration bg-decoration-3"></div>
            </div>
        </div>
    );
}

export { LoginPage };
export default LoginPage; 
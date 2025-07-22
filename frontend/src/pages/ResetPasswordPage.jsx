import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import "@/styles/features/auth.css";

/**
 * 重置密码页面组件
 */
export function ResetPasswordPage() {
    return (
        <div className="auth-page">
            {/* 简化版导航栏，包含返回按钮和品牌logo */}
            <header className="auth-header">
                <div className="auth-header-container">
                    <Link to="/login" className="auth-back-button dream-link">
                        <ArrowLeft />
                        返回登录
                    </Link>

                    <Link to="/" className="auth-logo">
                        <img src="/assets/logo.svg" className="auth-logo-image" alt="梦境门户" />
                        <span className="auth-logo-text">梦境门户</span>
                    </Link>
                </div>
            </header>

            <div className="auth-container">
                <div className="auth-content">
                    <ResetPasswordForm />
                </div>

                {/* 背景装饰元素 */}
                <div className="bg-decoration bg-decoration-1"></div>
                <div className="bg-decoration bg-decoration-2"></div>
                <div className="bg-decoration bg-decoration-3"></div>
            </div>
        </div>
    );
}

export default ResetPasswordPage; 
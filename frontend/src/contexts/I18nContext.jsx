import React from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import i18n from '@/i18n';

/**
 * 简化的国际化提供者组件
 * 直接使用react-i18next的标准实现
 */
export function I18nProvider({ children }) {
    return (
        <I18nextProvider i18n={i18n}>
            {children}
        </I18nextProvider>
    );
}

/**
 * 向后兼容的 useI18nContext hook
 * 提供完整的向后兼容接口
 */
export function useI18nContext() {
    const { t, i18n } = useTranslation();

    // 简化的语言切换函数
    const changeLanguage = async (language) => {
        if (!SUPPORTED_LANGUAGES[language] || language === i18n.language) {
            return false;
        }

        try {
            await i18n.changeLanguage(language);
            // 保存到本地存储
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('dreamlog-language', language);
            }
            return true;
        } catch (error) {
            console.error('语言切换失败:', error);
            return false;
        }
    };

    return {
        // react-i18next 标准接口
        t,
        i18n,

        // 向后兼容的接口
        changeLanguage,
        isChangingLanguage: false,
        currentLanguage: SUPPORTED_LANGUAGES[i18n.language] || SUPPORTED_LANGUAGES['zh-CN'],
        supportedLanguages: SUPPORTED_LANGUAGES,

        // 工具函数
        formatDate: (date, options = {}) => {
            const locale = i18n.language.replace('_', '-');
            return new Intl.DateTimeFormat(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                ...options
            }).format(new Date(date));
        },

        formatTime: (date, options = {}) => {
            const locale = i18n.language.replace('_', '-');
            return new Intl.DateTimeFormat(locale, {
                hour: '2-digit',
                minute: '2-digit',
                ...options
            }).format(new Date(date));
        },

        formatNumber: (number, options = {}) => {
            const locale = i18n.language.replace('_', '-');
            return new Intl.NumberFormat(locale, options).format(number);
        },

        safeT: (key, fallback, options = {}) => {
            try {
                const translation = t(key, options);
                return translation === key ? fallback : translation;
            } catch (error) {
                console.warn(`Translation error for key: ${key}`, error);
                return fallback;
            }
        }
    };
}

export default I18nProvider;

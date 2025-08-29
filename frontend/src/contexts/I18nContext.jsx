import React from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, DEFAULT_NAMESPACES } from '@/i18n';
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
    const { t: baseT, i18n } = useTranslation(DEFAULT_NAMESPACES);

    /**
     * 规范化 key：将 "ns.key" 自动转换为 "ns:key"
     * 这样现有代码里使用的 auth.register.title 可无缝映射到命名空间
     */
    const normalizeKey = (key) => {
        if (typeof key !== 'string') return key;
        if (key.includes(':')) return key; // 已是命名空间写法

        const [maybeNs, ...rest] = key.split('.');
        if (!rest.length) {
            // 没有点分隔，默认归入 common 命名空间
            return `common:${key}`;
        }

        if (DEFAULT_NAMESPACES.includes(maybeNs)) {
            // 特殊处理 common：我们的 common.json 采用 common.xxx 的嵌套结构
            if (maybeNs === 'common') {
                return `common:${key}`; // 即 common:common.xxx
            }
            // 其他命名空间维持 ns:xxx（home.xxx → home:xxx 等）
            return `${maybeNs}:${rest.join('.')}`;
        }

        // 其他顶层分类（如 assistant、navigation、statistics）存放在 common 命名空间
        return `common:${key}`;
    };

    /**
     * t 包装器：
     * - 支持传入字符串作为默认值
     * - 兼容 "ns.key" 写法
     */
    const t = (key, defaultOrOptions, maybeOptions) => {
        const finalKey = normalizeKey(key);
        if (typeof defaultOrOptions === 'string') {
            return baseT(finalKey, { defaultValue: defaultOrOptions, ...(maybeOptions || {}) });
        }
        return baseT(finalKey, defaultOrOptions);
    };

    // 简化的语言切换函数
    const changeLanguage = async (language) => {
        if (!SUPPORTED_LANGUAGES[language]) return false;
        const current = i18n.resolvedLanguage || i18n.language;
        if (language === current) return false;
        try {
            await i18n.changeLanguage(language);
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('dreamlog-language', language);
            }
            return true;
        } catch {
            return false;
        }
    };

    // 规整后的语言代码（兼容 en-US → en）
    const resolved = i18n.resolvedLanguage || i18n.language;
    const normalizedLangCode = SUPPORTED_LANGUAGES[resolved]
        ? resolved
        : (resolved && resolved.includes('-') && SUPPORTED_LANGUAGES[resolved.split('-')[0]])
            ? resolved.split('-')[0]
            : 'zh-CN';

    return {
        t,
        i18n,
        changeLanguage,
        isChangingLanguage: false,
        currentLanguage: SUPPORTED_LANGUAGES[normalizedLangCode],
        supportedLanguages: SUPPORTED_LANGUAGES,

        // 工具函数
        formatDate: (date, options = {}) => {
            const locale = (i18n.resolvedLanguage || i18n.language).replace('_', '-');
            return new Intl.DateTimeFormat(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                ...options
            }).format(new Date(date));
        },

        formatTime: (date, options = {}) => {
            const locale = (i18n.resolvedLanguage || i18n.language).replace('_', '-');
            return new Intl.DateTimeFormat(locale, {
                hour: '2-digit',
                minute: '2-digit',
                ...options
            }).format(new Date(date));
        },

        formatNumber: (number, options = {}) => {
            const locale = (i18n.resolvedLanguage || i18n.language).replace('_', '-');
            return new Intl.NumberFormat(locale, options).format(number);
        },

        safeT: (key, fallback, options = {}) => {
            const translated = t(key, { defaultValue: fallback, ...options });
            return translated;
        }
    };
}

export default I18nProvider;

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/i18n';

/**
 * 布局控制器组件
 * 简化版本，只处理基本的语言设置
 */
export const LayoutController = ({ children }) => {
    const { i18n } = useTranslation();
    const resolved = i18n.resolvedLanguage || i18n.language;
    const normalized = SUPPORTED_LANGUAGES[resolved]
        ? resolved
        : (resolved && resolved.includes('-') && SUPPORTED_LANGUAGES[resolved.split('-')[0]])
            ? resolved.split('-')[0]
            : 'zh-CN';
    const currentLanguage = SUPPORTED_LANGUAGES[normalized] || SUPPORTED_LANGUAGES['zh-CN'];

    useEffect(() => {
        // 设置HTML语言属性
        document.documentElement.lang = i18n.language;

        // 设置文本方向
        document.documentElement.dir = currentLanguage.dir || 'ltr';

        // 添加语言类名
        const body = document.body;
        body.classList.remove(
            'lang-zh-cn', 'lang-zh-tw', 'lang-en',
            'lang-ja', 'lang-ko', 'lang-es', 'lang-fr', 'lang-de'
        );
        body.classList.add(`lang-${normalized.toLowerCase().replace('-', '')}`);

    }, [normalized, currentLanguage.dir]);

    return (
        <div className={`layout-controller lang-${normalized.toLowerCase().replace('-', '')}`}>
            {children}
        </div>
    );
};



export default LayoutController;

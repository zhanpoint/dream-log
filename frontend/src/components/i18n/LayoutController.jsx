import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/i18n';

/**
 * 布局控制器组件
 * 简化版本，只处理基本的语言设置
 */
export const LayoutController = ({ children }) => {
    const { i18n } = useTranslation();
    const currentLanguage = SUPPORTED_LANGUAGES[i18n.language] || SUPPORTED_LANGUAGES['zh-CN'];

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
        body.classList.add(`lang-${i18n.language.toLowerCase().replace('-', '')}`);

    }, [i18n.language, currentLanguage.dir]);

    return (
        <div className={`layout-controller lang-${i18n.language.toLowerCase().replace('-', '')}`}>
            {children}
        </div>
    );
};



export default LayoutController;

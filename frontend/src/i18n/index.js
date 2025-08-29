import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

/**
 * 支持的语言配置
 */
export const SUPPORTED_LANGUAGES = {
    'zh-CN': {
        name: 'Simplified Chinese',
        nativeName: '简体中文',
        flag: '🇨🇳',
        dir: 'ltr'
    },
    'zh-TW': {
        name: 'Traditional Chinese',
        nativeName: '繁體中文',
        flag: '🇹🇼',
        dir: 'ltr'
    },
    'en': {
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸',
        dir: 'ltr'
    },
    'es': {
        name: 'Spanish',
        nativeName: 'Español',
        flag: '🇪🇸',
        dir: 'ltr'
    },
    'fr': {
        name: 'French',
        nativeName: 'Français',
        flag: '🇫🇷',
        dir: 'ltr'
    },
    'de': {
        name: 'German',
        nativeName: 'Deutsch',
        flag: '🇩🇪',
        dir: 'ltr'
    },
    'ja': {
        name: 'Japanese',
        nativeName: '日本語',
        flag: '🇯🇵',
        dir: 'ltr'
    },
    'ko': {
        name: 'Korean',
        nativeName: '한국어',
        flag: '🇰🇷',
        dir: 'ltr'
    }
};

/**
 * 默认命名空间
 */
export const DEFAULT_NAMESPACES = ['common', 'dreams', 'auth', 'settings'];

/**
 * 语言检测配置
 */
const languageDetectorOptions = {
    order: ['localStorage', 'navigator'],
    lookupLocalStorage: 'dreamlog-language',
    caches: ['localStorage']
};

/**
 * i18next 配置
 */
i18n
    .use(LanguageDetector)
    .use(resourcesToBackend((language, namespace) => {
        return import(`../locales/${language}/${namespace}.json`);
    }))
    .use(initReactI18next)
    .init({
        fallbackLng: 'zh-CN',
        debug: false, // 关闭调试信息，避免控制台大量输出

        // 支持的语言
        supportedLngs: Object.keys(SUPPORTED_LANGUAGES),

        // 命名空间配置
        ns: DEFAULT_NAMESPACES,
        defaultNS: 'common',

        // 语言检测
        detection: languageDetectorOptions,

        // 插值配置
        interpolation: {
            escapeValue: false, // React 已经处理了 XSS
            formatSeparator: ',',
        },

        // 加载配置
        load: 'all', // 加载所有语言代码和区域代码

        // React 特定配置
        react: {
            useSuspense: true,
            bindI18n: 'languageChanged loaded',
            bindI18nStore: 'added removed',
            transEmptyNodeValue: '',
            transSupportBasicHtmlNodes: true,
            transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em']
        },

        // 键分隔符
        keySeparator: '.',
        nsSeparator: ':',

        // 错误处理
        missingKeyHandler: (lng, ns, key, fallbackValue) => {
            if (process.env.NODE_ENV === 'development') {
                console.warn(`Missing translation key: ${lng}.${ns}.${key}`);
            }
        }
    });

export default i18n;

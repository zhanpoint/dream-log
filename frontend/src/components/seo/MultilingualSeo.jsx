import React from 'react';
import { useI18nContext } from '@/contexts/I18nContext';
import { Seo } from './Seo';

/**
 * 多语言SEO组件
 * 简化版本，只处理基本的SEO标签
 */
export const MultilingualSeo = ({
    title,
    description,
    keywords,
    ogImage,
    article = false,
    noindex = false,
    customMeta = {},
    ...props
}) => {
    const { currentLanguage, i18n } = useI18nContext();
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    // 构建最终的SEO props
    const seoProps = {
        title,
        description,
        keywords,
        noindex,

        // Open Graph
        ogTitle: title,
        ogDescription: description,
        ogImage: ogImage || `${baseUrl}/assets/og-image.jpg`,
        ogType: article ? 'article' : 'website',
        ogUrl: typeof window !== 'undefined' ? window.location.href : baseUrl,

        // Twitter Card
        twitterCard: 'summary_large_image',
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: ogImage || `${baseUrl}/assets/twitter-card.jpg`,

        // 语言设置
        htmlLang: i18n.language,
        htmlDir: currentLanguage.dir || 'ltr',

        // 自定义meta
        ...customMeta,
        ...props
    };

    return (
        <>
            <Seo {...seoProps} />

            {/* 简化的结构化数据 */}
            {typeof document !== 'undefined' && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'WebSite',
                            name: 'Dream Log',
                            description: description || 'Dream Log - 记录、分析和解析您的梦境',
                            url: baseUrl,
                            inLanguage: i18n.language
                        })
                    }}
                />
            )}
        </>
    );
};

/**
 * 页面专用的多语言SEO组件
 */
export const PageSeo = ({
    titleKey,
    descriptionKey,
    keywordsKey,
    namespace = 'common',
    ...props
}) => {
    const { t } = useI18nContext();

    const title = t(`${namespace}:${titleKey}`, titleKey);
    const description = t(`${namespace}:${descriptionKey}`, descriptionKey);
    const keywords = keywordsKey ? t(`${namespace}:${keywordsKey}`, keywordsKey) : undefined;

    return (
        <MultilingualSeo
            title={title}
            description={description}
            keywords={keywords}
            {...props}
        />
    );
};

/**
 * 文章专用的多语言SEO组件
 */
export const ArticleSeo = ({
    author,
    publishedTime,
    modifiedTime,
    tags = [],
    ...props
}) => {
    const { i18n } = useI18nContext();
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return (
        <>
            <MultilingualSeo
                article={true}
                {...props}
            />

            {/* 文章结构化数据 */}
            {typeof document !== 'undefined' && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'Article',
                            headline: props.title,
                            description: props.description,
                            image: props.ogImage,
                            author: {
                                '@type': 'Person',
                                name: author || 'Dream Log'
                            },
                            publisher: {
                                '@type': 'Organization',
                                name: 'Dream Log'
                            },
                            datePublished: publishedTime,
                            dateModified: modifiedTime || publishedTime,
                            inLanguage: i18n.language,
                            keywords: tags.join(', ')
                        })
                    }}
                />
            )}
        </>
    );
};

export default MultilingualSeo;

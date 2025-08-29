import React, { useEffect } from "react";

/**
 * Seo 组件：在客户端动态更新文档 <head> 中的标题与常见 SEO 元信息。
 *
 * 设计目标：
 * - 替代 react-helmet-async，兼容 React 19，无额外 peer 依赖冲突
 * - 仅在浏览器环境生效（Vite SPA），不做 SSR 处理
 * - 轻量、幂等、可维护
 *
 * @param {Object} props - SEO 配置项
 * @param {string} [props.title] - 页面标题
 * @param {string} [props.titleTemplate] - 标题模板（如 "%s - Dream Log"）
 * @param {string} [props.description] - 页面描述
 * @param {string} [props.keywords] - 关键词（逗号分隔）
 * @param {string} [props.canonical] - 规范化链接 URL
 * @param {boolean} [props.noindex] - 是否阻止收录
 * @param {string} [props.ogTitle] - Open Graph 标题
 * @param {string} [props.ogDescription] - Open Graph 描述
 * @param {string} [props.ogImage] - Open Graph 图片 URL
 * @param {string} [props.ogType] - Open Graph 类型（如 website/article）
 * @param {string} [props.ogUrl] - Open Graph URL
 * @param {string} [props.twitterCard] - Twitter 卡片类型（如 summary, summary_large_image）
 * @param {string} [props.twitterTitle] - Twitter 标题
 * @param {string} [props.twitterDescription] - Twitter 描述
 * @param {string} [props.twitterImage] - Twitter 图片 URL
 * @returns {null}
 */
export default function Seo(props) {
    /**
     * 在 <head> 中查找或创建一个指定属性的 <meta> 标签，并设置其 content。
     *
     * @param {"name"|"property"} attrName - 属性名
     * @param {string} attrValue - 属性值
     * @param {string|undefined} content - 内容
     */
    function upsertMetaTag(attrName, attrValue, content) {
        if (typeof document === "undefined" || !content) return;
        const selector = `meta[${attrName}="${attrValue}"]`;
        let element = document.head.querySelector(selector);
        if (!element) {
            element = document.createElement("meta");
            element.setAttribute(attrName, attrValue);
            document.head.appendChild(element);
        }
        element.setAttribute("content", String(content));
    }

    /**
     * 在 <head> 中查找或创建一个指定 rel 的 <link> 标签，并设置其 href。
     *
     * @param {string} rel - link 的 rel 属性值
     * @param {string|undefined} href - 链接地址
     */
    function upsertLinkTag(rel, href) {
        if (typeof document === "undefined" || !href) return;
        const selector = `link[rel="${rel}"]`;
        let element = document.head.querySelector(selector);
        if (!element) {
            element = document.createElement("link");
            element.setAttribute("rel", rel);
            document.head.appendChild(element);
        }
        element.setAttribute("href", String(href));
    }

    useEffect(() => {
        if (typeof document === "undefined") return;

        // 标题
        if (props.title) {
            const finalTitle = props.titleTemplate
                ? props.titleTemplate.replace("%s", props.title)
                : props.title;
            document.title = finalTitle;
        }

        // robots
        if (props.noindex) {
            upsertMetaTag("name", "robots", "noindex,nofollow");
        }

        // 基础 meta
        upsertMetaTag("name", "description", props.description);
        upsertMetaTag("name", "keywords", props.keywords);

        // canonical 链接
        upsertLinkTag("canonical", props.canonical);

        // Open Graph
        upsertMetaTag("property", "og:title", props.ogTitle || props.title);
        upsertMetaTag(
            "property",
            "og:description",
            props.ogDescription || props.description
        );
        upsertMetaTag("property", "og:image", props.ogImage);
        upsertMetaTag("property", "og:type", props.ogType);
        upsertMetaTag(
            "property",
            "og:url",
            props.ogUrl || (typeof window !== "undefined" ? window.location.href : undefined)
        );

        // Twitter
        upsertMetaTag("name", "twitter:card", props.twitterCard);
        upsertMetaTag("name", "twitter:title", props.twitterTitle || props.title);
        upsertMetaTag(
            "name",
            "twitter:description",
            props.twitterDescription || props.description
        );
        upsertMetaTag("name", "twitter:image", props.twitterImage);
    }, [
        props.title,
        props.titleTemplate,
        props.description,
        props.keywords,
        props.canonical,
        props.noindex,
        props.ogTitle,
        props.ogDescription,
        props.ogImage,
        props.ogType,
        props.ogUrl,
        props.twitterCard,
        props.twitterTitle,
        props.twitterDescription,
        props.twitterImage,
    ]);

    return null;
}

export { Seo };



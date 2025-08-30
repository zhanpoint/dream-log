import React from 'react';
import './flag-icon.css';

/**
 * 国旗图标组件 - 使用SVG图标替代Emoji确保跨浏览器兼容性
 * 支持所有主流浏览器的一致显示效果
 */
const FLAG_ICONS = {
    'zh-CN': (
        <svg className="flag-icon" viewBox="0 0 24 16" fill="none">
            <rect width="24" height="16" fill="#EE1C25" />
            <g fill="#FFDE00">
                <polygon points="3,2 4,5 7,5 4.5,7 5.5,10 3,8 0.5,10 1.5,7 -1,5 2,5" />
                <polygon points="8,1 8.5,2.5 10,2.5 9,3.5 9.5,5 8,4 6.5,5 7,3.5 6,2.5 7.5,2.5" />
                <polygon points="10,3 10.5,4.5 12,4.5 11,5.5 11.5,7 10,6 8.5,7 9,5.5 8,4.5 9.5,4.5" />
                <polygon points="10,6 10.5,7.5 12,7.5 11,8.5 11.5,10 10,9 8.5,10 9,8.5 8,7.5 9.5,7.5" />
                <polygon points="8,8 8.5,9.5 10,9.5 9,10.5 9.5,12 8,11 6.5,12 7,10.5 6,9.5 7.5,9.5" />
            </g>
        </svg>
    ),
    'zh-TW': (
        <svg className="flag-icon" viewBox="0 0 24 16" fill="none">
            <rect width="24" height="16" fill="#FE0000" />
            <rect width="12" height="8" fill="#000095" />
            <circle cx="6" cy="4" r="1.5" fill="#FFF" />
            <g fill="#FFF">
                <polygon points="6,1.5 6.5,2.5 7.5,2.5 6.8,3.2 7,4.2 6,3.5 5,4.2 5.2,3.2 4.5,2.5 5.5,2.5" />
                <polygon points="6,4.8 6.5,5.8 7.5,5.8 6.8,6.5 7,7.5 6,6.8 5,7.5 5.2,6.5 4.5,5.8 5.5,5.8" />
                <polygon points="3.5,4 4,5 5,5 4.3,5.7 4.5,6.7 3.5,6 2.5,6.7 2.7,5.7 2,5 3,5" />
                <polygon points="8.5,4 9,5 10,5 9.3,5.7 9.5,6.7 8.5,6 7.5,6.7 7.7,5.7 7,5 8,5" />
            </g>
        </svg>
    ),
    'en': (
        <svg className="flag-icon" viewBox="0 0 24 16" fill="none">
            <rect width="24" height="16" fill="#B22234" />
            <g fill="#FFF">
                <rect width="24" height="1.23" y="1.23" />
                <rect width="24" height="1.23" y="3.69" />
                <rect width="24" height="1.23" y="6.15" />
                <rect width="24" height="1.23" y="8.62" />
                <rect width="24" height="1.23" y="11.08" />
                <rect width="24" height="1.23" y="13.54" />
            </g>
            <rect width="9.6" height="8.62" fill="#3C3B6E" />
        </svg>
    ),
    'es': (
        <svg className="flag-icon" viewBox="0 0 24 16" fill="none">
            <rect width="24" height="4" fill="#AA151B" />
            <rect width="24" height="8" y="4" fill="#F1BF00" />
            <rect width="24" height="4" y="12" fill="#AA151B" />
        </svg>
    ),
    'fr': (
        <svg className="flag-icon" viewBox="0 0 24 16" fill="none">
            <rect width="8" height="16" fill="#0055A4" />
            <rect width="8" height="16" x="8" fill="#FFF" />
            <rect width="8" height="16" x="16" fill="#EF4135" />
        </svg>
    ),
    'de': (
        <svg className="flag-icon" viewBox="0 0 24 16" fill="none">
            <rect width="24" height="5.33" fill="#000" />
            <rect width="24" height="5.33" y="5.33" fill="#DD0000" />
            <rect width="24" height="5.33" y="10.67" fill="#FFCE00" />
        </svg>
    ),
    'ja': (
        <svg className="flag-icon" viewBox="0 0 24 16" fill="none">
            <rect width="24" height="16" fill="#FFF" />
            <circle cx="12" cy="8" r="4.8" fill="#BC002D" />
        </svg>
    ),
    'ko': (
        <svg className="flag-icon" viewBox="0 0 24 16" fill="none">
            <rect width="24" height="16" fill="#FFF" />
            <circle cx="12" cy="8" r="4" fill="none" stroke="#CD2E3A" strokeWidth="0.8" />
            <path d="M8 8 A4 4 0 0 1 16 8 A2 2 0 0 0 12 8 A2 2 0 0 1 8 8" fill="#0047A0" />
            <path d="M8 8 A4 4 0 0 0 16 8 A2 2 0 0 1 12 8 A2 2 0 0 0 8 8" fill="#CD2E3A" />
        </svg>
    )
};

/**
 * 国旗图标组件
 * @param {string} countryCode - 国家代码
 * @param {string} className - 额外的CSS类名
 * @param {string} size - 图标尺寸: 'sm' | 'md' | 'lg'
 */
export const FlagIcon = ({
    countryCode,
    className = '',
    size = 'md',
    ...props
}) => {
    const sizeClasses = {
        sm: 'w-4 h-3',
        md: 'w-5 h-4',
        lg: 'w-6 h-5'
    };

    const icon = FLAG_ICONS[countryCode];

    if (!icon) {
        // 如果没有对应的SVG图标，显示国家代码缩写
        return (
            <span
                className={`flag-icon flag-icon-fallback inline-flex items-center justify-center text-xs font-semibold ${sizeClasses[size]} ${className}`}
                aria-label={`Flag of ${countryCode}`}
                {...props}
            >
                {countryCode?.toUpperCase().slice(0, 2) || '??'}
            </span>
        );
    }

    return (
        <span
            className={`flag-icon ${sizeClasses[size]} ${className}`}
            aria-label={`Flag of ${countryCode}`}
            {...props}
        >
            {icon}
        </span>
    );
};



export default FlagIcon;

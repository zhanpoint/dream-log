/**
 * 用户头像处理工具
 * 确保头像显示的一致性和可靠性
 */

import { getDefaultAvatarUrl } from '@/lib/utils';

/**
 * 获取用户头像URL，确保正确的fallback处理
 * @param {Object} user - 用户对象
 * @returns {string} 头像URL
 */
export function getUserAvatarUrl(user) {
    if (!user) return getDefaultAvatarUrl('');

    // 优先使用带签名的URL，然后是稳定URL，最后是默认头像
    const avatarUrl = user.avatar_signed || user.avatar;
    return avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim()
        ? avatarUrl
        : getDefaultAvatarUrl(user.username || user.id || 'User');
}



/**
 * 处理头像加载错误的回调
 * @param {Event} event - 错误事件
 * @param {string} fallbackUrl - 备用URL
 */
export function handleAvatarError(event, fallbackUrl) {
    if (event.target && fallbackUrl) {
        event.target.src = fallbackUrl;
    }
}

/**
 * 用户头像处理工具
 * 确保头像显示的一致性和可靠性
 */

/**
 * 获取用户姓名的首字母缩写
 * @param {string} name - 用户姓名
 * @returns {string} 首字母缩写
 */
export function getInitials(name) {
    if (!name || typeof name !== 'string') return '';

    return name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * 生成默认头像URL (使用DiceBear API生成头像)
 * @param {string} seed - 用于生成头像的种子字符串
 * @returns {string} 默认头像URL
 */
export function getDefaultAvatarUrl(seed) {
    if (!seed) return '';

    // 使用DiceBear API生成一致的头像
    const encodedSeed = encodeURIComponent(seed);
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodedSeed}&backgroundColor=059669,0891b2,6366f1,8b5cf6,d946ef,f59e0b&textColor=ffffff`;
}


/**
 * 获取用户头像URL，确保正确的fallback处理
 * @param {Object} user - 用户对象
 * @returns {string} 头像URL
 */
export function getUserAvatarUrl(user) {
    if (!user) return getDefaultAvatarUrl('');

    // 直接优先使用带签名的URL，否则是默认头像
    const avatarUrl = user.avatar_signed;
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

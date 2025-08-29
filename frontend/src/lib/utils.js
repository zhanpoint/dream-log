import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

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
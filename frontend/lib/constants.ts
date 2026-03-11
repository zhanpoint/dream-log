/**
 * 梦境系统前端常量
 */

// 情绪分组 (受控词表)
export const EMOTION_CATEGORIES = [
  {
    name: "positive",
    label: "积极情绪",
    emotions: ["喜悦", "兴奋", "平静", "满足", "温暖", "安全", "放松", "希望"],
  },
  {
    name: "negative",
    label: "消极情绪",
    emotions: ["悲伤", "孤独", "失落", "恐惧", "焦虑", "紧张", "愤怒", "沮丧"],
  },
  {
    name: "complex",
    label: "复杂情绪",
    emotions: [
      "怀旧", "不安", "烦躁", "无奈", "厌恶", "困惑",
      "惊讶", "好奇", "疑惑", "期待", "渴望", "激动",
    ],
  },
] as const;

// 情绪 -> 颜色映射已移至下方

// 情绪 -> 颜色映射 (用于卡片左边框)
export const EMOTION_COLOR_MAP: Record<string, string> = {
  喜悦: "#fbbf24", 兴奋: "#f59e0b", 平静: "#6ee7b7", 满足: "#fb923c",
  温暖: "#fca5a5", 安全: "#93c5fd", 放松: "#a5b4fc", 希望: "#c4b5fd",
  悲伤: "#93c5fd", 孤独: "#a5b4fc", 失落: "#d1d5db", 恐惧: "#6366f1",
  焦虑: "#a78bfa", 紧张: "#8b5cf6", 愤怒: "#ef4444", 沮丧: "#f87171",
  怀旧: "#fcd34d", 不安: "#c084fc", 烦躁: "#fb7185", 无奈: "#9ca3af",
  厌恶: "#86efac", 困惑: "#67e8f9", 惊讶: "#fbbf24", 好奇: "#38bdf8",
  疑惑: "#a5f3fc", 期待: "#d946ef", 渴望: "#f0abfc", 激动: "#f97316",
};

// 情绪强度
export const EMOTION_INTENSITIES = [
  { value: "1", label: "很弱" },
  { value: "2", label: "轻微" },
  { value: "3", label: "明显" },
  { value: "4", label: "强烈" },
  { value: "5", label: "非常强" },
] as const;

// 睡眠质量
export const SLEEP_QUALITIES = [
  { value: "1", emoji: "😵", label: "非常差", desc: "频繁醒来", color: "from-red-500 to-red-600" },
  { value: "2", emoji: "😟", label: "偏差", desc: "睡不稳", color: "from-orange-500 to-orange-600" },
  { value: "3", emoji: "😐", label: "一般", desc: "勉强接受", color: "from-yellow-500 to-yellow-600" },
  { value: "4", emoji: "🙂", label: "不错", desc: "睡得好", color: "from-green-500 to-green-600" },
  { value: "5", emoji: "😴", label: "非常好", desc: "精神饱满", color: "from-blue-500 to-blue-600" },
] as const;

// 睡眠深度
export const SLEEP_DEPTHS = [
  { value: "1", label: "浅睡", desc: "容易醒", icon: "☁️" },
  { value: "2", label: "中等", desc: "一般深度", icon: "🌙" },
  { value: "3", label: "深睡", desc: "很难醒", icon: "🌌" },
] as const;

// 醒来状态
export const AWAKENING_STATES = [
  { value: "NATURAL", label: "自然醒来", desc: "自然清醒" },
  { value: "ALARM", label: "闹钟唤醒", desc: "被闹钟叫醒" },
  { value: "STARTLED", label: "受惊醒来", desc: "突然惊醒" },
  { value: "GRADUAL", label: "逐渐清醒", desc: "慢慢醒来" },
] as const;

// 梦境类型
export const DREAM_TYPES = [
  { value: "NORMAL", label: "普通梦", icon: "MessageCircle", desc: "日常的梦境", color: "#6366f1" },
  { value: "LUCID", label: "清醒梦", icon: "Sparkles", desc: "知道自己在做梦", color: "#8b5cf6" },
  { value: "NIGHTMARE", label: "噩梦", icon: "Flame", desc: "令人恐惧或不安", color: "#ef4444" },
  { value: "RECURRING", label: "重复梦", icon: "RotateCw", desc: "之前梦到过类似的", color: "#f59e0b" },
  { value: "SYMBOLIC", label: "象征性强", icon: "Palette", desc: "充满象征和隐喻", color: "#ec4899" },
  { value: "VIVID", label: "特别清晰", icon: "Sparkle", desc: "如同现实般清晰", color: "#06b6d4" },
] as const;

// 清晰度
export const VIVIDNESS_LEVELS = [
  { value: "1", label: "模糊", desc: "印象很模糊" },
  { value: "2", label: "一般", desc: "记得大概" },
  { value: "3", label: "清晰", desc: "记得很清楚" },
  { value: "4", label: "非常清晰", desc: "细节丰富" },
  { value: "5", label: "如同现实", desc: "和现实一样" },
] as const;

// 完整度评分
export const COMPLETENESS_LEVELS = [
  { value: "1", label: "碎片", desc: "单个画面" },
  { value: "2", label: "片段", desc: "几个场景" },
  { value: "3", label: "部分完整", desc: "有主线" },
  { value: "4", label: "基本完整", desc: "情节清晰" },
  { value: "5", label: "完整叙事", desc: "完整故事" },
] as const;

// 清醒程度
export const LUCIDITY_LEVELS = [
  { value: "1", label: "完全无意识", desc: "不知道在做梦" },
  { value: "2", label: "有朦胧意识", desc: "隐约感觉怪怪的" },
  { value: "3", label: "偶尔察觉", desc: "偶尔意识到在做梦" },
  { value: "4", label: "经常知道", desc: "大部分时间知道" },
  { value: "5", label: "完全清醒控制", desc: "能完全控制梦境" },
] as const;

// 现实关联度
export const REALITY_CORRELATIONS = [
  { value: "1", label: "几乎无关", desc: "完全是随机的", icon: "🌀" },
  { value: "2", label: "可能有关", desc: "有些元素似曾相识", icon: "🤔" },
  { value: "3", label: "明显相关", desc: "和最近发生的事有关", icon: "🔗" },
  { value: "4", label: "高度相关", desc: "就是在处理现实问题", icon: "🎯" },
] as const;

// 梦境类型图标映射
export const DREAM_TYPE_ICON_MAP: Record<string, string> = {
  NORMAL: "MessageCircle", LUCID: "Sparkles", NIGHTMARE: "Flame",
  RECURRING: "RotateCw", SYMBOLIC: "Palette", VIVID: "Sparkle",
};

// 梦境类型标签映射
export const DREAM_TYPE_LABEL_MAP: Record<string, string> = {
  NORMAL: "普通梦", LUCID: "清醒梦", NIGHTMARE: "噩梦",
  RECURRING: "重复梦", SYMBOLIC: "象征性强", VIVID: "特别清晰",
};

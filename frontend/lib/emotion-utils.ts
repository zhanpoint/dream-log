// 情绪键名（用于后端API）
export const EMOTION_KEYS = {
  JOY: "joy",
  SADNESS: "sadness",
  FEAR: "fear",
  ANGER: "anger",
  DISGUST: "disgust",
  SURPRISE: "surprise",
  TRUST: "trust",
  ANTICIPATION: "anticipation",
} as const;

// 情绪标签（中文，用于向后兼容）
export const EMOTION_LABELS: Record<string, string> = {
  joy: "愉悦",
  sadness: "悲伤",
  fear: "恐惧",
  anger: "愤怒",
  disgust: "厌恶",
  surprise: "惊喜",
  trust: "信任",
  anticipation: "期待",
};

// 获取翻译后的情绪标签
export function getEmotionLabel(emotionKey: string, t: (key: string) => string): string {
  // 如果是中文情绪词汇，直接尝试翻译
  const translated = t(`emotions.${emotionKey}`);
  
  // 如果翻译键和原始键相同（说明没有找到翻译），则返回原始键
  if (translated === `emotions.${emotionKey}`) {
    return EMOTION_LABELS[emotionKey] || emotionKey;
  }
  
  return translated;
}

export const EMOTION_COLORS: Record<string, string> = {
  joy: "#f59e0b",
  sadness: "#6366f1",
  fear: "#8b5cf6",
  anger: "#ef4444",
  disgust: "#10b981",
  surprise: "#f97316",
  trust: "#3b82f6",
  anticipation: "#ec4899",
};

export const CATEGORY_LABELS: Record<string, string> = {
  sleep: "睡眠",
  emotion: "情绪",
  habit: "记录习惯",
};

/** 将情绪分布对象转为 ECharts 饼图数据 */
export function emotionToPieData(dist: Record<string, number>, t?: (key: string) => string) {
  return Object.entries(dist).map(([k, v]) => ({
    name: t ? getEmotionLabel(k, t) : (EMOTION_LABELS[k] || k),
    value: typeof v === "number" && v <= 1 ? Math.round(v * 100) : v,
    itemStyle: { color: EMOTION_COLORS[k] },
  }));
}

"""
梦境系统常量定义
"""

# 梦境类型列表
DREAM_TYPES = [
    "NORMAL",
    "LUCID",
    "NIGHTMARE",
    "RECURRING",
    "SYMBOLIC",
    "VIVID",
]

# 清醒程度映射
LUCIDITY_LEVELS: dict[int, str] = {
    1: "完全无意识 - 不知道在做梦",
    2: "有朦胧意识 - 隐约感觉怪怪的",
    3: "偶尔察觉 - 偶尔意识到在做梦",
    4: "经常知道 - 大部分时间知道",
    5: "完全清醒控制 - 能完全控制梦境",
}

# 清晰度映射
VIVIDNESS_LEVELS: dict[int, str] = {
    1: "模糊 - 印象很模糊",
    2: "一般 - 记得大概",
    3: "清晰 - 记得很清楚",
    4: "非常清晰 - 细节丰富",
    5: "如同现实 - 和现实一样",
}

# 完整度评分
COMPLETENESS_LEVELS: dict[int, str] = {
    1: "碎片 - 只记得单个画面或感觉",
    2: "片段 - 记得几个不连贯的场景",
    3: "部分完整 - 有主线但缺失细节",
    4: "基本完整 - 大部分情节清晰",
    5: "完整叙事 - 有头有尾的完整故事",
}

# 现实关联度映射
REALITY_CORRELATION_MAP: dict[int, str] = {
    1: "几乎无关 - 完全是随机的",
    2: "可能有关 - 有些元素似曾相识",
    3: "明显相关 - 和最近发生的事有关",
    4: "高度相关 - 就是在处理现实问题",
}

# 感官类型
SENSORY_TYPES = [
    "visual",
    "auditory",
    "tactile",
    "olfactory",
    "gustatory",
    "spatial",
]

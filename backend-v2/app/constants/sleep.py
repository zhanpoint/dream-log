"""
睡眠系统常量定义
"""

# 睡眠质量映射
SLEEP_QUALITY_MAP: dict[int, dict[str, str]] = {
    1: {"emoji": "😵", "label": "非常差", "description": "频繁醒来,完全没休息好"},
    2: {"emoji": "😟", "label": "偏差", "description": "睡得不稳,醒来疲惫"},
    3: {"emoji": "😐", "label": "一般", "description": "勉强能接受"},
    4: {"emoji": "🙂", "label": "不错", "description": "睡得比较好"},
    5: {"emoji": "😴", "label": "非常好", "description": "深度睡眠,精神饱满"},
}

# 睡眠深度映射
SLEEP_DEPTH_MAP: dict[int, str] = {
    1: "浅睡 - 容易被打扰",
    2: "中等 - 一般程度的睡眠",
    3: "深睡 - 很难被唤醒",
}

# 醒来状态
AWAKENING_STATES = ["NATURAL", "ALARM", "STARTLED", "GRADUAL"]


def calculate_sleep_score(
    quality: int,
    fragmented: bool,
    depth: int | None,
) -> int:
    """
    综合睡眠评分 (0-100)

    逻辑:
    - 基础分: quality * 20 (20-100)
    - 碎片化惩罚: * 0.85
    - 深度奖励: (depth-2) * 8
    """
    base_score = quality * 20.0

    if fragmented:
        base_score *= 0.85

    if depth:
        base_score += (depth - 2) * 8

    return int(max(0, min(100, base_score)))

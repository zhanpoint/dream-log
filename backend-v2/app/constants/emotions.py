"""
情绪系统常量定义
基于 Plutchik 情绪轮盘理论
"""

# Plutchik 8基础情绪
BASIC_EMOTIONS = [
    "joy",
    "sadness",
    "fear",
    "anger",
    "disgust",
    "surprise",
    "trust",
    "anticipation",
]

# 受控词表 - 用户可选的主导情绪 (中文 -> 英文基础情绪映射)
PRIMARY_EMOTIONS_VOCAB: dict[str, str] = {
    # joy类
    "喜悦": "joy",
    "兴奋": "joy",
    "平静": "joy",
    "满足": "joy",
    # sadness类
    "悲伤": "sadness",
    "孤独": "sadness",
    "失落": "sadness",
    "怀旧": "sadness",
    # fear类
    "恐惧": "fear",
    "焦虑": "fear",
    "紧张": "fear",
    "不安": "fear",
    # anger类
    "愤怒": "anger",
    "沮丧": "anger",
    "烦躁": "anger",
    "无奈": "anger",
    # disgust类
    "厌恶": "disgust",
    "反感": "disgust",
    "困惑": "disgust",
    "迷茫": "disgust",
    # surprise类
    "惊讶": "surprise",
    "震惊": "surprise",
    "好奇": "surprise",
    "疑惑": "surprise",
    # trust类
    "信任": "trust",
    "温暖": "trust",
    "安全": "trust",
    "放松": "trust",
    # anticipation类
    "期待": "anticipation",
    "希望": "anticipation",
    "渴望": "anticipation",
    "激动": "anticipation",
}

# 情绪强度映射 (UI语义 -> 数值)
EMOTION_INTENSITY_MAP: dict[str, int] = {
    "很弱": 1,
    "轻微": 2,
    "明显": 3,
    "强烈": 4,
    "非常强": 5,
}

# 反向映射 (数值 -> UI语义)
EMOTION_INTENSITY_LABELS: dict[int, str] = {
    1: "很弱",
    2: "轻微",
    3: "明显",
    4: "强烈",
    5: "非常强",
}

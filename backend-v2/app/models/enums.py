"""
数据库枚举类型定义
"""

import enum


class AwakeningState(str, enum.Enum):
    """醒来状态"""

    NATURAL = "NATURAL"  # 自然醒来
    ALARM = "ALARM"  # 闹钟唤醒
    STARTLED = "STARTLED"  # 受惊醒来
    GRADUAL = "GRADUAL"  # 逐渐清醒


class PrivacyLevel(str, enum.Enum):
    """隐私等级"""

    PRIVATE = "PRIVATE"
    FRIENDS = "FRIENDS"
    PUBLIC = "PUBLIC"


class AIProcessingStatus(str, enum.Enum):
    """AI 处理状态"""

    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class DreamTypeEnum(str, enum.Enum):
    """梦境类型"""

    NORMAL = "NORMAL"  # 普通梦
    LUCID = "LUCID"  # 清醒梦
    NIGHTMARE = "NIGHTMARE"  # 噩梦
    RECURRING = "RECURRING"  # 重复梦
    SYMBOLIC = "SYMBOLIC"  # 象征性强
    VIVID = "VIVID"  # 特别清晰


class EmotionTypeEnum(str, enum.Enum):
    """Plutchik 8基础情绪"""

    JOY = "joy"
    SADNESS = "sadness"
    FEAR = "fear"
    ANGER = "anger"
    DISGUST = "disgust"
    SURPRISE = "surprise"
    TRUST = "trust"
    ANTICIPATION = "anticipation"


class EmotionSource(str, enum.Enum):
    """情绪来源"""

    USER = "USER"
    AI = "AI"


class AttachmentType(str, enum.Enum):
    """附件类型"""

    IMAGE = "IMAGE"
    AUDIO = "AUDIO"
    VIDEO = "VIDEO"
    SKETCH = "SKETCH"


class StorageBucket(str, enum.Enum):
    """存储桶类型"""

    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class SymbolCategory(str, enum.Enum):
    """符号分类"""

    PERSON = "PERSON"
    PLACE = "PLACE"
    OBJECT = "OBJECT"
    ACTION = "ACTION"
    EMOTION = "EMOTION"
    ABSTRACT = "ABSTRACT"


class RelationType(str, enum.Enum):
    """梦境关联类型"""

    SIMILAR = "SIMILAR"  # 相似梦境 (AI 自动发现)
    CONTINUATION = "CONTINUATION"  # 续集梦境 (用户手动标记)


class InsightType(str, enum.Enum):
    """洞察报告类型"""

    MONTHLY = "MONTHLY"                 # 月度报告（定期）
    WEEKLY = "WEEKLY"                   # 周报（定期）
    ANNUAL = "ANNUAL"                   # 年度回顾（定期）
    EMOTION_HEALTH = "EMOTION_HEALTH"   # 情绪健康分析（专题）
    SLEEP_QUALITY = "SLEEP_QUALITY"     # 睡眠质量分析（专题）
    THEME_PATTERN = "THEME_PATTERN"     # 梦境主题模式（专题）

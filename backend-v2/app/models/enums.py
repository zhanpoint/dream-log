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


class TriggerCategory(str, enum.Enum):
    """触发因素分类"""

    FOOD = "FOOD"
    ACTIVITY = "ACTIVITY"
    EMOTION = "EMOTION"
    ENVIRONMENT = "ENVIRONMENT"
    SUBSTANCE = "SUBSTANCE"


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

    SIMILAR = "SIMILAR"  # 相似梦境 (AI推荐)
    CONTINUATION = "CONTINUATION"  # 续集/系列梦
    CONTRAST = "CONTRAST"  # 对比梦境
    THEMATIC = "THEMATIC"  # 主题相关


class AnalysisTaskType(str, enum.Enum):
    """分析任务类型"""

    STRUCTURE = "STRUCTURE"
    EMOTION = "EMOTION"
    SYMBOL = "SYMBOL"
    INSIGHT = "INSIGHT"
    TITLE_GEN = "TITLE_GEN"


class InsightType(str, enum.Enum):
    """洞察报告类型"""

    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    PATTERN = "PATTERN"
    RECOMMENDATION = "RECOMMENDATION"


class InsightFrequency(str, enum.Enum):
    """洞察生成频率"""

    WEEKLY = "WEEKLY"
    BIWEEKLY = "BIWEEKLY"
    MONTHLY = "MONTHLY"


class NotificationMethod(str, enum.Enum):
    """通知方式"""

    EMAIL = "EMAIL"
    PUSH = "PUSH"
    BOTH = "BOTH"

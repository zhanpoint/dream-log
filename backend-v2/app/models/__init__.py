"""
数据模型模块
"""

from app.models.dream import Dream
from app.models.dream_analysis import DreamAnalysisTask
from app.models.dream_attachment import DreamAttachment
from app.models.dream_embedding import DreamEmbedding
from app.models.dream_emotion import DreamEmotion
from app.models.dream_insight import DreamInsight
from app.models.dream_relation import DreamRelation
from app.models.dream_symbol import DreamSymbol, Symbol
from app.models.dream_tag import DreamTag, Tag
from app.models.dream_trigger import DreamTrigger, Trigger
from app.models.dream_type import DreamType, DreamTypeMapping
from app.models.enums import (
    AIProcessingStatus,
    AnalysisTaskType,
    AttachmentType,
    AwakeningState,
    DreamTypeEnum,
    EmotionSource,
    EmotionTypeEnum,
    InsightFrequency,
    InsightType,
    NotificationMethod,
    PrivacyLevel,
    RelationType,
    StorageBucket,
    SymbolCategory,
    TriggerCategory,
)
from app.models.token_blacklist import TokenBlacklist
from app.models.user import RegistrationMethod, User
from app.models.user_insight import UserInsight, UserInsightSettings

__all__ = [
    # 用户模型
    "User",
    "RegistrationMethod",
    "TokenBlacklist",
    # 梦境核心
    "Dream",
    "DreamInsight",
    "DreamEmbedding",
    "DreamEmotion",
    # 关联表
    "DreamType",
    "DreamTypeMapping",
    "Trigger",
    "DreamTrigger",
    "DreamAttachment",
    "Symbol",
    "DreamSymbol",
    "Tag",
    "DreamTag",
    "DreamRelation",
    # 分析任务
    "DreamAnalysisTask",
    # 用户洞察
    "UserInsight",
    "UserInsightSettings",
    # 枚举
    "AIProcessingStatus",
    "AnalysisTaskType",
    "AttachmentType",
    "AwakeningState",
    "DreamTypeEnum",
    "EmotionSource",
    "EmotionTypeEnum",
    "InsightFrequency",
    "InsightType",
    "NotificationMethod",
    "PrivacyLevel",
    "RelationType",
    "StorageBucket",
    "SymbolCategory",
    "TriggerCategory",
]

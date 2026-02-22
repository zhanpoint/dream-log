"""
数据模型模块
"""

from app.models.dream import Dream
from app.models.dream_attachment import DreamAttachment
from app.models.dream_embedding import DreamEmbedding
from app.models.dream_insight import DreamInsight
from app.models.dream_relation import DreamRelation
from app.models.dream_symbol import DreamSymbol, Symbol
from app.models.dream_tag import DreamTag, Tag
from app.models.dream_trigger import DreamTrigger
from app.models.dream_type import DreamType, DreamTypeMapping
from app.models.enums import (
    AIProcessingStatus,
    AttachmentType,
    AwakeningState,
    DreamTypeEnum,
    EmotionSource,
    EmotionTypeEnum,
    InsightType,
    PrivacyLevel,
    RelationType,
    StorageBucket,
    SymbolCategory,
)
from app.models.notification import Notification, NotificationType
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
    # 关联表
    "DreamType",
    "DreamTypeMapping",
    "DreamTrigger",
    "DreamAttachment",
    "Symbol",
    "DreamSymbol",
    "Tag",
    "DreamTag",
    "DreamRelation",
    # 用户洞察
    "UserInsight",
    "UserInsightSettings",
    # 通知
    "Notification",
    "NotificationType",
    # 枚举
    "AIProcessingStatus",
    "AttachmentType",
    "AwakeningState",
    "DreamTypeEnum",
    "EmotionSource",
    "InsightType",
    "PrivacyLevel",
    "RelationType",
    "StorageBucket",
    "SymbolCategory",
]

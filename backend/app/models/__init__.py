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
from app.models.community import Bookmark, Comment, CommentLike, Report, Resonance, UserFollow
from app.models.community_group import Community, CommunityCreationApplication, CommunityMember
from app.models.dm import DirectMessage, DmConversation
from app.models.exploration import ExplorationArticle, ExplorationSymbol
from app.models.notification import Notification, NotificationType
from app.models.search_history import SearchHistory
from app.models.token_blacklist import TokenBlacklist
from app.models.user import RegistrationMethod, User
from app.models.user_insight import UserInsight, UserInsightSettings

__all__ = [
    # 用户模型
    "User",
    "RegistrationMethod",
    "SearchHistory",
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
    # 梦境探索
    "ExplorationSymbol",
    "ExplorationArticle",
    # 社区模块
    "Resonance",
    "Comment",
    "CommentLike",
    "UserFollow",
    "Bookmark",
    "Report",
    # 梦境社群
    "Community",
    "CommunityMember",
    "CommunityCreationApplication",
    # 私信
    "DmConversation",
    "DirectMessage",
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

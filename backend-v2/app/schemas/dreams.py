"""
梦境相关的 Pydantic Schemas
"""

from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.constants.dreams import COMMON_TRIGGERS, DREAM_TYPES
from app.constants.emotions import PRIMARY_EMOTIONS_VOCAB


# ============= 请求 Schemas =============


class CreateDreamRequest(BaseModel):
    """创建梦境请求"""

    # 基础信息
    title: str | None = Field(None, max_length=200)
    dream_date: date = Field(..., description="梦境发生日期")
    dream_time: time | None = None
    content: str = Field(..., min_length=1, description="梦境内容")
    is_nap: bool = False

    # 睡眠上下文
    sleep_duration_minutes: int | None = Field(None, ge=0, le=1440)
    awakening_state: str | None = None
    sleep_quality: int | None = Field(None, ge=1, le=5)
    sleep_fragmented: bool | None = None
    sleep_depth: int | None = Field(None, ge=1, le=3)

    # 情绪系统
    primary_emotion: str | None = None
    emotion_intensity: int | None = Field(None, ge=1, le=5)
    emotion_residual: bool | None = None

    # 梦境特征
    dream_types: list[str] | None = None
    lucidity_level: int | None = Field(None, ge=1, le=5)
    vividness_level: int | None = Field(None, ge=1, le=5)
    completeness_score: int | None = Field(None, ge=1, le=5)

    # 现实关联
    life_context: str | None = None
    reality_correlation: int | None = Field(None, ge=1, le=4)
    user_interpretation: str | None = None

    # 触发因素
    triggers: list[str] | None = None

    # 隐私
    privacy_level: str = "PRIVATE"

    @field_validator("primary_emotion")
    @classmethod
    def validate_primary_emotion(cls, v: str | None) -> str | None:
        if v and v not in PRIMARY_EMOTIONS_VOCAB:
            raise ValueError(f"无效的情绪: {v}")
        return v

    @field_validator("dream_types")
    @classmethod
    def validate_dream_types(cls, v: list[str] | None) -> list[str] | None:
        if v:
            for dt in v:
                if dt not in DREAM_TYPES:
                    raise ValueError(f"无效的梦境类型: {dt}")
        return v

    @field_validator("triggers")
    @classmethod
    def validate_triggers(cls, v: list[str] | None) -> list[str] | None:
        if v:
            for t in v:
                if t not in COMMON_TRIGGERS:
                    raise ValueError(f"无效的触发因素: {t}")
        return v

    @field_validator("awakening_state")
    @classmethod
    def validate_awakening_state(cls, v: str | None) -> str | None:
        if v and v not in ("NATURAL", "ALARM", "STARTLED", "GRADUAL"):
            raise ValueError(f"无效的醒来状态: {v}")
        return v

    @field_validator("privacy_level")
    @classmethod
    def validate_privacy_level(cls, v: str) -> str:
        if v not in ("PRIVATE", "FRIENDS", "PUBLIC"):
            raise ValueError(f"无效的隐私等级: {v}")
        return v


class UpdateDreamRequest(BaseModel):
    """更新梦境请求 (PATCH, 所有字段可选)"""

    title: str | None = Field(None, max_length=200)
    dream_date: date | None = None
    dream_time: time | None = None
    content: str | None = Field(None, min_length=1)
    is_nap: bool | None = None

    sleep_duration_minutes: int | None = Field(None, ge=0, le=1440)
    awakening_state: str | None = None
    sleep_quality: int | None = Field(None, ge=1, le=5)
    sleep_fragmented: bool | None = None
    sleep_depth: int | None = Field(None, ge=1, le=3)

    primary_emotion: str | None = None
    emotion_intensity: int | None = Field(None, ge=1, le=5)
    emotion_residual: bool | None = None

    dream_types: list[str] | None = None
    lucidity_level: int | None = Field(None, ge=1, le=5)
    vividness_level: int | None = Field(None, ge=1, le=5)
    completeness_score: int | None = Field(None, ge=1, le=5)

    life_context: str | None = None
    reality_correlation: int | None = Field(None, ge=1, le=4)
    user_interpretation: str | None = None

    triggers: list[str] | None = None
    privacy_level: str | None = None
    is_favorite: bool | None = None


# ============= 响应 Schemas =============


class TagResponse(BaseModel):
    """标签响应"""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    color: str | None = None


class EmotionResponse(BaseModel):
    """情绪响应"""

    model_config = ConfigDict(from_attributes=True)

    emotion_type: str
    score: float
    source: str


class DreamTypeResponse(BaseModel):
    """梦境类型响应"""

    type_name: str
    display_name: str
    icon_emoji: str | None = None


class DreamListItem(BaseModel):
    """梦境列表项 (轻量)"""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    title: str | None
    title_generated_by_ai: bool
    dream_date: date
    dream_time: time | None
    content_preview: str  # 前 100 字
    primary_emotion: str | None
    emotion_intensity: int | None
    lucidity_level: int | None
    vividness_level: int | None
    ai_processed: bool
    ai_processing_status: str
    is_favorite: bool
    is_draft: bool
    created_at: datetime

    # 关联数据
    dream_types: list[str] = []
    tags: list[TagResponse] = []
    attachments_count: int = 0


class DreamDetailResponse(BaseModel):
    """梦境详情响应 (完整)"""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID

    # 基础
    title: str | None
    title_generated_by_ai: bool
    is_draft: bool
    dream_date: date
    dream_time: time | None
    content: str
    completeness_score: int | None
    is_nap: bool

    # 睡眠
    sleep_duration_minutes: int | None
    awakening_state: str | None
    sleep_quality: int | None
    sleep_fragmented: bool | None
    sleep_depth: int | None

    # 情绪
    primary_emotion: str | None
    emotion_intensity: int | None
    emotion_residual: bool | None
    emotion_conflict_index: float | None
    emotions: list[EmotionResponse] = []

    # 特征
    lucidity_level: int | None
    vividness_level: int | None

    # 感官
    sensory_visual: float | None
    sensory_auditory: float | None
    sensory_tactile: float | None
    sensory_olfactory: float | None
    sensory_gustatory: float | None
    sensory_spatial: float | None

    # 现实关联
    reality_correlation: int | None

    # AI
    ai_processed: bool
    ai_processing_status: str
    ai_processed_at: datetime | None

    # 洞察 (来自 dream_insights)
    life_context: str | None = None
    user_interpretation: str | None = None
    content_structured: dict | None = None
    ai_analysis: dict | None = None

    # 元数据
    privacy_level: str
    is_favorite: bool
    view_count: int
    parent_dream_id: UUID | None

    # 关联
    dream_types: list[str] = []
    tags: list[TagResponse] = []
    attachments_count: int = 0

    # 时间戳
    created_at: datetime
    updated_at: datetime | None


class DreamListResponse(BaseModel):
    """梦境列表分页响应"""

    total: int
    page: int
    page_size: int
    items: list[DreamListItem]


# ============= 标签 Schemas =============


class CreateTagRequest(BaseModel):
    """创建标签"""

    name: str = Field(..., min_length=1, max_length=50)
    color: str | None = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")


class UpdateTagRequest(BaseModel):
    """更新标签"""

    name: str | None = Field(None, min_length=1, max_length=50)
    color: str | None = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")


# ============= 分析状态 Schemas =============


class AnalysisTaskResponse(BaseModel):
    """分析任务状态"""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_type: str
    status: str
    model_name: str | None = None
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    processing_time_ms: int | None = None


class AnalysisStatusResponse(BaseModel):
    """梦境 AI 分析整体状态"""

    dream_id: UUID
    ai_processed: bool
    ai_processing_status: str
    ai_processed_at: datetime | None = None
    tasks: list[AnalysisTaskResponse] = []

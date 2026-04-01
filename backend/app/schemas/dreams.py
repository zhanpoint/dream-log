"""
梦境相关的 Pydantic Schemas
"""

from datetime import date, datetime, time
from uuid import UUID

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.constants.dreams import DREAM_TYPES
from app.constants.emotions import PRIMARY_EMOTIONS_VOCAB


# ============= 请求 Schemas =============


class CreateDreamRequest(BaseModel):
    """创建梦境请求"""

    # 基础信息
    title: str | None = Field(None, max_length=100)
    dream_date: date = Field(..., description="梦境发生日期")
    dream_time: time | None = None
    content: str = Field(..., min_length=1, max_length=3000, description="梦境内容")
    is_nap: bool = False

    # 睡眠上下文
    sleep_start_time: datetime | None = Field(None, description="入睡时间")
    awakening_time: datetime | None = Field(None, description="醒来时间")
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
    life_context: str | None = Field(None, max_length=500)
    reality_correlation: int | None = Field(None, ge=1, le=4)
    user_interpretation: str | None = Field(None, max_length=300)

    # 隐私
    privacy_level: str = "PRIVATE"
    # 标题是否由 AI 生成（用于前端独立生成标题场景）
    title_generated_by_ai: bool = False

    # 社区字段
    is_anonymous: bool = False
    is_seeking_interpretation: bool = False
    community_id: UUID | None = None
    emotion_tags: list[str] = []

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

    title: str | None = Field(None, max_length=100)
    dream_date: date | None = None
    dream_time: time | None = None
    content: str | None = Field(None, min_length=1, max_length=3000)
    is_nap: bool | None = None

    # 可选睡眠时间字段，在 PATCH 时可以省略
    sleep_start_time: datetime | None = None
    awakening_time: datetime | None = None
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

    life_context: str | None = Field(None, max_length=500)
    reality_correlation: int | None = Field(None, ge=1, le=4)
    user_interpretation: str | None = Field(None, max_length=300)

    privacy_level: str | None = None
    is_favorite: bool | None = None
    title_generated_by_ai: bool | None = None


# ============= 响应 Schemas =============


class TagResponse(BaseModel):
    """标签响应"""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class TriggerResponse(BaseModel):
    """触发因素响应"""

    model_config = ConfigDict(from_attributes=True)

    name: str
    confidence: int | None = None
    reasoning: str | None = None


class DreamTypeResponse(BaseModel):
    """梦境类型响应"""

    type_name: str
    display_name: str


class AttachmentResponse(BaseModel):
    """附件响应"""

    id: UUID
    attachment_type: str
    file_url: str
    thumbnail_url: str | None = None
    mime_type: str | None = None
    duration: int | None = None


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

    # 元数据（列表展示用）
    privacy_level: str = "PRIVATE"
    view_count: int = 0

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
    sleep_start_time: datetime | None = None
    awakening_time: datetime | None = None
    sleep_duration_minutes: int | None
    awakening_state: str | None
    sleep_quality: int | None
    sleep_fragmented: bool | None
    sleep_depth: int | None

    # 情绪
    primary_emotion: str | None
    emotion_intensity: int | None
    emotion_residual: bool | None

    # 触发因素
    triggers: list[TriggerResponse] = []

    # 特征
    lucidity_level: int | None
    vividness_level: int | None

    # 现实关联
    reality_correlation: int | None

    # AI
    ai_processed: bool
    ai_processing_status: str
    ai_processed_at: datetime | None
    ai_image_url: str | None = None

    # 洞察 (来自 dream_insights)
    life_context: str | None = None
    user_interpretation: str | None = None
    content_structured: dict | None = None
    ai_analysis: dict | None = None
    reflection_answers: list[dict] | None = None

    # 元数据
    privacy_level: str
    is_favorite: bool
    view_count: int
    parent_dream_id: UUID | None

    # 关联
    dream_types: list[str] = []
    tags: list[TagResponse] = []
    attachments_count: int = 0
    attachments: list[AttachmentResponse] = []

    # 时间戳
    created_at: datetime
    updated_at: datetime | None


class DreamListResponse(BaseModel):
    """梦境列表分页响应"""

    total: int
    page: int
    page_size: int
    items: list[DreamListItem]


class DreamStatsResponse(BaseModel):
    """梦境统计（我的梦境页用）"""

    total: int = Field(..., description="全部梦境数量")
    consecutive_days: int = Field(..., description="连续记录天数")
    this_week_count: int = Field(..., description="本周记录数")
    this_month_count: int = Field(..., description="本月记录数")


# ============= 标签 Schemas =============


class CreateTagRequest(BaseModel):
    """创建标签"""

    name: str = Field(..., min_length=2, max_length=20)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        name = v.strip()
        if not name:
            raise ValueError("标签名称不能为空")
        if len(name) < 2 or len(name) > 20:
            raise ValueError("标签名称长度需为 2-20 个字符")
        return name


class UpdateTagRequest(BaseModel):
    """更新标签"""

    name: str | None = Field(None, min_length=2, max_length=20)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str | None) -> str | None:
        if v is None:
            return v
        name = v.strip()
        if not name:
            raise ValueError("标签名称不能为空")
        if len(name) < 2 or len(name) > 20:
            raise ValueError("标签名称长度需为 2-20 个字符")
        return name


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


# ============= AI 生成 Schemas =============


class GenerateTitleRequest(BaseModel):
    """生成标题请求（不依赖梦境 ID）"""

    content: str = Field(..., min_length=1, description="梦境完整内容")


class AssistDreamContentRequest(BaseModel):
    """梦境正文 AI：意象补完 / 文学润色 / 智能续写（完整正文，不截断）"""

    content: str = Field(..., max_length=3000, description="当前梦境正文全文")
    action: Literal["imagery_completion", "literary_polish", "smart_continue"] | None = None
    instruction: str = Field(..., min_length=2, max_length=500, description="用户指令（AI 面板输入）")


class OptimizeInstructionRequest(BaseModel):
    """润色「补充说明」输入框内的短指令"""

    text: str = Field(..., min_length=1, max_length=500)


class AddReflectionAnswerRequest(BaseModel):
    """添加反思问题回答"""

    question: str = Field(..., min_length=1, max_length=200)
    answer: str = Field(..., min_length=1, max_length=500)

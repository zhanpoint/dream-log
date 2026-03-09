"""
洞察报告相关 Pydantic Schemas
"""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InsightResponse(BaseModel):
    """洞察报告响应"""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    insight_type: str
    title: str
    time_period_start: date | None = None
    time_period_end: date | None = None
    data: dict
    narrative: str | None = None
    is_read: bool
    created_at: datetime
    expires_at: datetime | None = None


class InsightListResponse(BaseModel):
    """洞察列表响应"""

    total: int
    page: int
    page_size: int
    items: list[InsightResponse]


class InsightSettingsResponse(BaseModel):
    """洞察设置响应"""

    model_config = ConfigDict(from_attributes=True)

    monthly_report_enabled: bool
    weekly_report_enabled: bool
    annual_report_enabled: bool
    show_comparison: bool
    notify_on_reports: bool


class UpdateInsightSettingsRequest(BaseModel):
    """更新洞察设置请求"""

    monthly_report_enabled: bool | None = None
    weekly_report_enabled: bool | None = None
    annual_report_enabled: bool | None = None
    show_comparison: bool | None = None
    notify_on_reports: bool | None = None


class InsightUnreadSummaryResponse(BaseModel):
    """各类型洞察是否存在未读"""

    weekly: bool
    monthly: bool
    annual: bool
    emotion_health: bool
    sleep_quality: bool
    theme_pattern: bool


class GenerateMonthlyReportRequest(BaseModel):
    """手动生成月报请求"""

    year: int
    month: int = Field(..., ge=1, le=12)


class GenerateWeeklyReportRequest(BaseModel):
    """手动生成周报请求"""

    week_start: date  # 周一日期


class GenerateAnnualReportRequest(BaseModel):
    """手动生成年度回顾请求"""

    year: int


class GenerateThemeReportRequest(BaseModel):
    """手动生成专题分析请求"""

    report_type: str = Field(..., pattern="^(EMOTION_HEALTH|SLEEP_QUALITY|THEME_PATTERN)$")
    start_date: date
    end_date: date
    with_comparison: bool = False

    @property
    def days(self) -> int:
        return (self.end_date - self.start_date).days + 1

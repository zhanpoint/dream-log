"""额度与用量相关 Schema"""

from datetime import date
from pydantic import BaseModel


class QuotaSnapshotResponse(BaseModel):
    plan_type: str
    period_start: date
    limits: dict[str, int]
    used: dict[str, int]

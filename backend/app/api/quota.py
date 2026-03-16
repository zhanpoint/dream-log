"""额度与使用情况 API"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.quota import QuotaSnapshotResponse
from app.services.quota_service import get_quota_snapshot

router = APIRouter(prefix="/quota", tags=["额度"])


@router.get("/me", response_model=QuotaSnapshotResponse)
async def get_my_quota(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuotaSnapshotResponse:
    data = await get_quota_snapshot(str(current_user.id), db)
    return QuotaSnapshotResponse(**data)

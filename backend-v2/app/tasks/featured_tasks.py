"""精选梦境批量重算任务。"""

import asyncio
import logging
from datetime import datetime

from app.config.featured import FEATURED_CONFIG
from app.core.database import async_session_maker
from app.services.community_service import CommunityService

logger = logging.getLogger(__name__)


async def recompute_recent_auto_featured(
    *,
    days: int | None = None,
    batch_size: int | None = None,
) -> dict[str, int | str | float]:
    """重算最近 N 天 AUTO 梦境的精选快照。"""
    start_time = datetime.now()

    async with async_session_maker() as db:
        try:
            svc = CommunityService(db)
            result = await svc.recompute_recent_auto_featured(
                days=days,
                batch_size=batch_size,
            )
            await db.commit()

            elapsed = (datetime.now() - start_time).total_seconds()
            logger.info(
                "精选重算完成: processed=%s changed=%s featured=%s days=%s batch=%s elapsed=%.2fs",
                result["processed"],
                result["changed"],
                result["featured"],
                max(1, days or FEATURED_CONFIG.recalc_window_days),
                max(1, batch_size or FEATURED_CONFIG.recalc_batch_size),
                elapsed,
            )
            return {"status": "completed", **result, "elapsed_seconds": elapsed}
        except Exception as e:
            await db.rollback()
            logger.exception("精选重算失败: %s", e)
            return {"status": "failed", "error": str(e)}


async def featured_recalc_hourly_loop() -> None:
    """每小时轻量重算最近 N 天 AUTO 梦境。"""
    interval_seconds = 60 * 60
    while True:
        await recompute_recent_auto_featured()
        await asyncio.sleep(interval_seconds)


async def featured_recalc_daily_loop() -> None:
    """每日全窗口重算最近 N 天 AUTO 梦境（与小时任务并行，便于兜底）。"""
    interval_seconds = 24 * 60 * 60
    while True:
        await recompute_recent_auto_featured(
            days=FEATURED_RECALC_WINDOW_DAYS,
            batch_size=FEATURED_RECALC_BATCH_SIZE,
        )
        await asyncio.sleep(interval_seconds)

"""
洞察报告定时任务
"""

import asyncio
import logging
from datetime import date, timedelta

from sqlalchemy import select

from app.config.insight_config import InsightConfig
from app.models.user import User
from app.models.user_insight import UserInsightSettings

logger = logging.getLogger(__name__)


async def _run_for_users(
    users: list[tuple[object, str | None]],
    *,
    handler,
    delay_seconds: float,
) -> tuple[int, int]:
    """
    批量执行洞察生成任务。

    - 默认顺序执行，并在每次 AI 请求后 sleep 一小段，降低网关/模型限流风险。
    - 当 InsightConfig.AI_CONCURRENT_ENABLED=True 时启用有限并发，提高整体吞吐，避免 cron 任务超时。
    """
    success = 0
    failed = 0

    if not users:
        return success, failed

    async def _one(uid, preferred_locale):
        nonlocal success, failed
        try:
            ok = await handler(uid, preferred_locale)
            if ok:
                success += 1
        except Exception as e:
            failed += 1
            logger.error(f"洞察任务执行失败: {uid}, {e}")
        finally:
            if delay_seconds > 0:
                await asyncio.sleep(delay_seconds)

    if not InsightConfig.AI_CONCURRENT_ENABLED:
        for uid, preferred_locale in users:
            await _one(uid, preferred_locale)
        return success, failed

    sem = asyncio.Semaphore(max(1, int(InsightConfig.AI_MAX_CONCURRENT)))

    async def _guarded(uid, preferred_locale):
        async with sem:
            await _one(uid, preferred_locale)

    async with asyncio.TaskGroup() as tg:
        for uid, loc in users:
            tg.create_task(_guarded(uid, loc))
    return success, failed


async def generate_monthly_reports(_ctx: dict) -> dict:
    """每月1号生成上月月度报告"""
    from app.core.database import async_session_maker
    from app.services.ai_service import get_target_language_from_locale

    if not InsightConfig.MONTHLY_REPORT_ENABLED:
        return {"status": "disabled"}

    today = date.today()
    if today.month == 1:
        year, month = today.year - 1, 12
    else:
        year, month = today.year, today.month - 1

    logger.info(f"开始生成 {year}年{month}月 月度报告")

    async with async_session_maker() as db:
        stmt = (
            select(UserInsightSettings.user_id, User.preferred_locale)
            .select_from(UserInsightSettings)
            .join(User, User.id == UserInsightSettings.user_id)
            .where(UserInsightSettings.monthly_report_enabled.is_(True))
        )
        result = await db.execute(stmt)
        users = [(row[0], row[1]) for row in result.all()]

        if not users:
            stmt = select(User.id, User.preferred_locale)
            result = await db.execute(stmt)
            users = [(row[0], row[1]) for row in result.all()]

    async def _handler(uid, preferred_locale):
        target_language = get_target_language_from_locale(preferred_locale)
        return await _generate_monthly_for_user(uid, year, month, target_language=target_language)

    success, failed = await _run_for_users(
        users,
        handler=_handler,
        delay_seconds=float(InsightConfig.AI_REQUEST_DELAY),
    )

    logger.info(f"月报生成完成: 成功 {success}, 失败 {failed}")
    return {"success": success, "failed": failed}


async def generate_weekly_reports(_ctx: dict) -> dict:
    """每周一生成上周周报"""
    from app.core.database import async_session_maker
    from app.services.ai_service import get_target_language_from_locale

    if not InsightConfig.WEEKLY_REPORT_ENABLED:
        return {"status": "disabled"}

    today = date.today()
    # 上周一
    days_since_monday = today.weekday()
    last_monday = today - timedelta(days=days_since_monday + 7)

    logger.info(f"开始生成 {last_monday} 周报")

    async with async_session_maker() as db:
        # 拉取启用周报的用户及其语言偏好（用于定时任务：无请求头场景）
        stmt = (
            select(UserInsightSettings.user_id, User.preferred_locale)
            .select_from(UserInsightSettings)
            .join(User, User.id == UserInsightSettings.user_id)
            .where(UserInsightSettings.weekly_report_enabled.is_(True))
        )
        result = await db.execute(stmt)
        users = [(row[0], row[1]) for row in result.all()]

        if not users:
            stmt = select(User.id, User.preferred_locale)
            result = await db.execute(stmt)
            users = [(row[0], row[1]) for row in result.all()]

    async def _handler(uid, preferred_locale):
        target_language = get_target_language_from_locale(preferred_locale)
        return await _generate_weekly_for_user(uid, last_monday, target_language=target_language)

    success, failed = await _run_for_users(
        users,
        handler=_handler,
        delay_seconds=float(InsightConfig.AI_REQUEST_DELAY),
    )

    logger.info(f"周报生成完成: 成功 {success}, 失败 {failed}")
    return {"success": success, "failed": failed}


async def generate_annual_reports(_ctx: dict) -> dict:
    """每年1月1日生成上年年度回顾"""
    from app.core.database import async_session_maker
    from app.services.ai_service import get_target_language_from_locale

    if not InsightConfig.ANNUAL_REPORT_ENABLED:
        return {"status": "disabled"}

    last_year = date.today().year - 1
    logger.info(f"开始生成 {last_year} 年度回顾")

    async with async_session_maker() as db:
        stmt = (
            select(UserInsightSettings.user_id, User.preferred_locale)
            .select_from(UserInsightSettings)
            .join(User, User.id == UserInsightSettings.user_id)
            .where(UserInsightSettings.annual_report_enabled.is_(True))
        )
        result = await db.execute(stmt)
        users = [(row[0], row[1]) for row in result.all()]

        if not users:
            stmt = select(User.id, User.preferred_locale)
            result = await db.execute(stmt)
            users = [(row[0], row[1]) for row in result.all()]

    async def _handler(uid, preferred_locale):
        target_language = get_target_language_from_locale(preferred_locale)
        return await _generate_annual_for_user(uid, last_year, target_language=target_language)

    success, failed = await _run_for_users(
        users,
        handler=_handler,
        delay_seconds=float(InsightConfig.AI_REQUEST_DELAY),
    )

    logger.info(f"年度回顾生成完成: 成功 {success}, 失败 {failed}")
    return {"success": success, "failed": failed}



# ========== 内部辅助函数 ==========

async def _generate_monthly_for_user(user_id, year: int, month: int, *, target_language: str) -> bool:
    from app.core.database import async_session_maker
    from app.services.insight_service import InsightService

    async with async_session_maker() as db:
        service = InsightService(db)
        result = await service.generate_monthly_report(user_id, year, month, target_language=target_language)
        return result is not None


async def _generate_weekly_for_user(user_id, week_start: date, *, target_language: str) -> bool:
    from app.core.database import async_session_maker
    from app.services.insight_service import InsightService

    async with async_session_maker() as db:
        service = InsightService(db)
        result = await service.generate_weekly_report(user_id, week_start, target_language=target_language)
        return result is not None


async def _generate_annual_for_user(user_id, year: int, *, target_language: str) -> bool:
    from app.core.database import async_session_maker
    from app.services.insight_service import InsightService

    async with async_session_maker() as db:
        service = InsightService(db)
        result = await service.generate_annual_report(user_id, year, target_language=target_language)
        return result is not None



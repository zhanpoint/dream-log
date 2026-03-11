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
    success, failed = 0, 0

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

    for uid, preferred_locale in users:
        try:
            target_language = get_target_language_from_locale(preferred_locale)
            ok = await _generate_monthly_for_user(uid, year, month, target_language=target_language)
            if ok:
                success += 1
            await asyncio.sleep(InsightConfig.AI_REQUEST_DELAY)
        except Exception as e:
            failed += 1
            logger.error(f"月报生成失败: {uid}, {e}")

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
    success, failed = 0, 0

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

    for uid, preferred_locale in users:
        try:
            target_language = get_target_language_from_locale(preferred_locale)
            ok = await _generate_weekly_for_user(uid, last_monday, target_language=target_language)
            if ok:
                success += 1
            await asyncio.sleep(InsightConfig.AI_REQUEST_DELAY)
        except Exception as e:
            failed += 1
            logger.error(f"周报生成失败: {uid}, {e}")

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
    success, failed = 0, 0

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

    for uid, preferred_locale in users:
        try:
            target_language = get_target_language_from_locale(preferred_locale)
            ok = await _generate_annual_for_user(uid, last_year, target_language=target_language)
            if ok:
                success += 1
            await asyncio.sleep(InsightConfig.AI_REQUEST_DELAY)
        except Exception as e:
            failed += 1
            logger.error(f"年报生成失败: {uid}, {e}")

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



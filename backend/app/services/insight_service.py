"""
洞察报告生成服务
"""

import json
import logging
import uuid
from calendar import monthrange
from datetime import date, timedelta

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from sqlalchemy import delete, func, select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.ai_models import (
    MAX_TOKENS_INSIGHT,
    MODELS,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    TEMPERATURE_INSIGHT,
)
from app.config.insight_config import InsightConfig
from app.models.dream import Dream
from app.models.dream_insight import DreamInsight
from app.models.dream_tag import DreamTag, Tag
from app.models.dream_trigger import DreamTrigger
from app.models.dream_type import DreamType, DreamTypeMapping
from app.models.enums import InsightType
from app.models.notification import NotificationType

REPORT_NOTIFICATION_META_TYPE: dict[InsightType, str] = {
    InsightType.WEEKLY: "WEEKLY",
    InsightType.MONTHLY: "MONTHLY",
    InsightType.ANNUAL: "ANNUAL",
    InsightType.EMOTION_HEALTH: "EMOTION_HEALTH",
    InsightType.SLEEP_QUALITY: "SLEEP_QUALITY",
    InsightType.THEME_PATTERN: "THEME_PATTERN",
}
from app.models.user import shanghai_now
from app.models.user_insight import UserInsight, UserInsightSettings
from app.prompts.insight_generation import (
    ANNUAL_REPORT_PROMPT,
    EMOTION_HEALTH_PROMPT,
    MONTHLY_REPORT_PROMPT,
    SLEEP_QUALITY_PROMPT,
    THEME_PATTERN_PROMPT,
    WEEKLY_REPORT_PROMPT,
)
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

# AI 链
_insight_llm = ChatOpenAI(
    model=MODELS["insight_generation"],
    base_url=OPENROUTER_BASE_URL,
    api_key=OPENROUTER_API_KEY,
    temperature=TEMPERATURE_INSIGHT,
    max_tokens=MAX_TOKENS_INSIGHT,
).bind(response_format={"type": "json_object"})

def _make_chain(prompt: str):
    return (
        ChatPromptTemplate.from_messages([("human", prompt)])
        | _insight_llm
        | JsonOutputParser()
    )

_monthly_chain = _make_chain(MONTHLY_REPORT_PROMPT)
_weekly_chain = _make_chain(WEEKLY_REPORT_PROMPT)
_annual_chain = _make_chain(ANNUAL_REPORT_PROMPT)
_emotion_chain = _make_chain(EMOTION_HEALTH_PROMPT)
_sleep_chain = _make_chain(SLEEP_QUALITY_PROMPT)
_theme_chain = _make_chain(THEME_PATTERN_PROMPT)

# 当前洞察报告缺少前端语言上下文，先统一使用中文。
# 未来如需支持按用户语言生成，可在调用处将具体语言传入。
DEFAULT_TARGET_LANGUAGE = "中文"


class InsightService:
    """洞察报告服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========== 月度报告 ==========

    async def generate_monthly_report(
        self, user_id: uuid.UUID, year: int, month: int, *, target_language: str = DEFAULT_TARGET_LANGUAGE
    ) -> UserInsight | None:
        """为单个用户生成月度报告"""
        start = date(year, month, 1)
        _, last_day = monthrange(year, month)
        end = date(year, month, last_day)

        dreams = await self._fetch_dreams(user_id, start, end)

        if len(dreams) < InsightConfig.MONTHLY_MIN_DREAMS:
            logger.info(f"用户 {user_id} 梦境不足 {InsightConfig.MONTHLY_MIN_DREAMS} 个，跳过月报")
            return None

        stats = await self._compute_statistics(user_id, dreams, start, end)
        snapshot_by_id = await self._fetch_dream_snapshots([d.id for d in dreams])
        # 不截断内容，保留完整信息
        dream_contents = self._format_dream_contents(dreams, snapshot_by_id=snapshot_by_id, max_chars=0)

        # 本月记录天数（有梦境的日期数量）
        record_days = len({d.dream_date for d in dreams})

        # 本月内最长连续记录天数
        streak = self._compute_max_streak_in_range(dreams)

        try:
            ai_analysis = await _monthly_chain.ainvoke({
                "total_dreams": stats["total_dreams"],
                "avg_sleep_quality": stats["avg_sleep_quality"],
                "emotion_distribution": json.dumps(stats["emotion_distribution"], ensure_ascii=False),
                "top_triggers": json.dumps(stats["top_triggers"], ensure_ascii=False),
                "dream_contents": dream_contents,
                "target_language": target_language,
            })
        except Exception as e:
            logger.error(f"AI 月报生成失败: {user_id}, {e}")
            ai_analysis = {}

        report_data = {
            "period": {"year": year, "month": month},
            "statistics": stats,
            "record_days": record_days,
            "streak_days": streak,
            "ai_analysis": ai_analysis,
            "charts": self._build_chart_data(dreams, stats),
        }

        expire_at = shanghai_now() + timedelta(days=InsightConfig.INSIGHT_EXPIRE_MONTHS * 30)
        title = f"{year}年{month}月梦境月报"

        insight = UserInsight(
            user_id=user_id,
            insight_type=InsightType.MONTHLY,
            time_period_start=start,
            time_period_end=end,
            title=title,
            data=report_data,
            narrative=ai_analysis.get("monthly_summary"),
            expires_at=expire_at,
        )
        self.db.add(insight)
        await self.db.flush()

        settings = await self._get_settings(user_id)
        if settings and settings.notify_on_reports:
            ns = NotificationService(self.db)
            await ns.create(
                user_id=user_id,
                type_=NotificationType.MONTHLY_REPORT,
                title=f"{title}已生成",
                content="",
                link=f"/insights/monthly/{insight.id}",
                metadata={
                    "insight_id": str(insight.id),
                    "year": year,
                    "month": month,
                    "report_type": REPORT_NOTIFICATION_META_TYPE[InsightType.MONTHLY],
                },
            )

        await self.db.commit()
        
        # 删除同一周期的旧报告（在新报告保存成功后，排除刚创建的新报告）
        await self._delete_old_insights(user_id, InsightType.MONTHLY, start, end, exclude_id=insight.id)
        
        logger.info(f"月报生成成功: {user_id}, {title}")
        return insight

    # ========== 周报 ==========

    async def generate_weekly_report(
        self, user_id: uuid.UUID, week_start: date, *, target_language: str = DEFAULT_TARGET_LANGUAGE
    ) -> UserInsight | None:
        """生成周报（week_start 为周一）"""
        week_end = week_start + timedelta(days=6)
        prev_start = week_start - timedelta(days=7)
        prev_end = week_start - timedelta(days=1)

        dreams = await self._fetch_dreams(user_id, week_start, week_end)
        prev_dreams = await self._fetch_dreams(user_id, prev_start, prev_end)

        if len(dreams) < InsightConfig.WEEKLY_MIN_DREAMS:
            logger.info(f"用户 {user_id} 本周梦境不足 {InsightConfig.WEEKLY_MIN_DREAMS} 个，跳过周报")
            return None

        stats = await self._compute_statistics(user_id, dreams, week_start, week_end)
        prev_stats = await self._compute_statistics(user_id, prev_dreams, prev_start, prev_end) if prev_dreams else {}

        # 计算连续记录天数
        streak = await self._compute_streak(user_id, week_end)
        record_days = len({d.dream_date for d in dreams})
        prev_record_days = len({d.dream_date for d in prev_dreams}) if prev_dreams else 0

        snapshot_by_id = await self._fetch_dream_snapshots([d.id for d in dreams])
        # 不截断内容，保留完整信息
        dream_contents = self._format_dream_contents(
            dreams, snapshot_by_id=snapshot_by_id, max_chars=0
        )

        try:
            ai_analysis = await _weekly_chain.ainvoke({
                "total_dreams": stats["total_dreams"],
                "prev_total_dreams": len(prev_dreams),
                "avg_sleep_quality": stats["avg_sleep_quality"],
                "prev_avg_sleep_quality": prev_stats.get("avg_sleep_quality", 0),
                "emotion_distribution": json.dumps(stats["emotion_distribution"], ensure_ascii=False),
                "prev_emotion_distribution": json.dumps(prev_stats.get("emotion_distribution", {}), ensure_ascii=False),
                "record_days": record_days,
                "prev_record_days": prev_record_days,
                "streak_days": streak,
                "dream_contents": dream_contents,
                "target_language": target_language,
            })
        except Exception as e:
            logger.error(f"AI 周报生成失败: {user_id}, {e}")
            ai_analysis = {}

        report_data = {
            "period": {"week_start": week_start.isoformat(), "week_end": week_end.isoformat()},
            "statistics": stats,
            "prev_statistics": prev_stats,
            "record_days": record_days,
            "streak_days": streak,
            "ai_analysis": ai_analysis,
            "charts": self._build_chart_data(dreams, stats),
        }

        expire_at = shanghai_now() + timedelta(weeks=InsightConfig.WEEKLY_EXPIRE_WEEKS)
        title = f"{week_start.month}月{week_start.day}日-{week_end.month}月{week_end.day}日周报"

        insight = UserInsight(
            user_id=user_id,
            insight_type=InsightType.WEEKLY,
            time_period_start=week_start,
            time_period_end=week_end,
            title=title,
            data=report_data,
            narrative=ai_analysis.get("weekly_summary"),
            expires_at=expire_at,
        )
        self.db.add(insight)
        await self.db.flush()

        settings = await self._get_settings(user_id)
        if settings and settings.notify_on_reports:
            ns = NotificationService(self.db)
            await ns.create(
                user_id=user_id,
                type_=NotificationType.WEEKLY_REPORT,
                title=f"{title}已生成",
                content="",
                link=f"/insights/weekly/{insight.id}",
                metadata={
                    "insight_id": str(insight.id),
                    "report_type": REPORT_NOTIFICATION_META_TYPE[InsightType.WEEKLY],
                },
            )

        await self.db.commit()
        
        # 删除同一周期的旧报告（在新报告保存成功后，排除刚创建的新报告）
        await self._delete_old_insights(user_id, InsightType.WEEKLY, week_start, week_end, exclude_id=insight.id)
        
        logger.info(f"周报生成成功: {user_id}, {title}")
        return insight

    # ========== 年度回顾 ==========

    async def generate_annual_report(
        self, user_id: uuid.UUID, year: int, *, target_language: str = DEFAULT_TARGET_LANGUAGE
    ) -> UserInsight | None:
        """生成年度回顾"""
        start = date(year, 1, 1)
        end = date(year, 12, 31)
        dreams = await self._fetch_dreams(user_id, start, end)

        if len(dreams) < InsightConfig.ANNUAL_MIN_DREAMS:
            logger.info(f"用户 {user_id} 年度梦境不足，跳过年报")
            return None

        # 优先使用 dream_insight.content_structured.snapshot 作为梦境摘要
        snapshot_by_id = await self._fetch_dream_snapshots([d.id for d in dreams])

        # 按月统计
        monthly_dist = {}
        monthly_dreams_text = []
        for month in range(1, 13):
            month_dreams = [d for d in dreams if d.dream_date.month == month]
            monthly_dist[str(month)] = len(month_dreams)
            if month_dreams:
                sample_size = min(len(month_dreams), 15)
                sample = month_dreams[:sample_size]
                # 有 snapshot 用 snapshot，否则用 content；不截断
                texts = [
                    f"  [{d.dream_date}] {d.title or '无标题'}: {snapshot_by_id.get(d.id) or d.content}"
                    for d in sample
                ]
                monthly_dreams_text.append(f"{month}月（{len(month_dreams)}个）:\n" + "\n".join(texts))

        # 最佳睡眠月份
        monthly_quality = {}
        for d in dreams:
            if d.sleep_quality:
                m = str(d.dream_date.month)
                if m not in monthly_quality:
                    monthly_quality[m] = []
                monthly_quality[m].append(d.sleep_quality)
        best_month = max(monthly_quality, key=lambda k: sum(monthly_quality[k]) / len(monthly_quality[k])) if monthly_quality else "未知"

        # 情绪统计
        emotion_counts: dict[str, int] = {}
        for d in dreams:
            if d.primary_emotion:
                emotion_counts[d.primary_emotion] = emotion_counts.get(d.primary_emotion, 0) + 1
        top_emotion = max(emotion_counts, key=emotion_counts.get) if emotion_counts else "未知"

        # 最长连续记录（年度内）
        max_streak = self._compute_max_streak_in_range(dreams)
        record_days = len({d.dream_date for d in dreams})
        qualities = [d.sleep_quality for d in dreams if d.sleep_quality]
        avg_quality = round(sum(qualities) / len(qualities), 1) if qualities else 0

        try:
            ai_analysis = await _annual_chain.ainvoke({
                "year": year,
                "total_dreams": len(dreams),
                "record_days": record_days,
                "max_streak": max_streak,
                "monthly_distribution": json.dumps(monthly_dist, ensure_ascii=False),
                "emotion_distribution": json.dumps(emotion_counts, ensure_ascii=False),
                "top_emotion": top_emotion,
                "avg_sleep_quality": avg_quality,
                "best_sleep_month": f"{best_month}月",
                "monthly_dreams": "\n\n".join(monthly_dreams_text),
                "target_language": target_language,
            })
        except Exception as e:
            logger.error(f"AI 年报生成失败: {user_id}, {e}")
            ai_analysis = {}

        # 精选梦境（清晰度高 + 情绪强烈）
        featured_raw = sorted(
            [d for d in dreams if d.vividness_level],
            key=lambda d: (d.vividness_level or 0) + (d.emotion_intensity or 0),
            reverse=True,
        )[:8]

        # 为精选梦境生成选择理由
        def _reason_for(dream, idx: int, all_dreams: list) -> str:
            if idx == 0:
                return "年度印象最深"
            if dream.emotion_intensity and dream.emotion_intensity >= 4:
                return "情感记忆深刻"
            q = dream.sleep_quality or 0
            best_sleep = max((d.sleep_quality or 0) for d in all_dreams)
            if q >= best_sleep:
                return "美梦时刻"
            v = dream.vividness_level or 0
            if v >= 4:
                return "细节丰富"
            return "值得回味"

        report_data = {
            "period": {"year": year},
            "statistics": {
                "total_dreams": len(dreams),
                "record_days": record_days,
                "max_streak": max_streak,
                "avg_sleep_quality": avg_quality,
                "monthly_distribution": monthly_dist,
                "emotion_distribution": emotion_counts,
                "best_sleep_month": best_month,
            },
            "ai_analysis": ai_analysis,
            "featured_dreams": [
                {
                    "id": str(d.id),
                    "date": d.dream_date.isoformat(),
                    "title": d.title or "无标题",
                    "summary": d.content[:100],
                    "vividness": d.vividness_level,
                    "reason": _reason_for(d, idx, featured_raw),
                }
                for idx, d in enumerate(featured_raw)
            ],
            "charts": {
                "monthly_distribution": [{"month": k, "count": v} for k, v in monthly_dist.items()],
                "emotion_distribution": emotion_counts,
            },
        }

        expire_at = shanghai_now() + timedelta(days=InsightConfig.ANNUAL_EXPIRE_YEARS * 365)
        title = f"{year}年度梦境回顾"

        insight = UserInsight(
            user_id=user_id,
            insight_type=InsightType.ANNUAL,
            time_period_start=start,
            time_period_end=end,
            title=title,
            data=report_data,
            narrative=ai_analysis.get("year_story"),
            expires_at=expire_at,
        )
        self.db.add(insight)
        await self.db.flush()

        settings = await self._get_settings(user_id)
        if settings and settings.notify_on_reports:
            ns = NotificationService(self.db)
            await ns.create(
                user_id=user_id,
                type_=NotificationType.ANNUAL_REPORT,
                title=f"{title}已生成",
                content="",
                link=f"/insights/annual/{insight.id}",
                metadata={
                    "insight_id": str(insight.id),
                    "year": year,
                    "report_type": REPORT_NOTIFICATION_META_TYPE[InsightType.ANNUAL],
                },
            )

        await self.db.commit()
        
        # 删除同一周期的旧报告（在新报告保存成功后，排除刚创建的新报告）
        await self._delete_old_insights(user_id, InsightType.ANNUAL, start, end, exclude_id=insight.id)
        
        logger.info(f"年度回顾生成成功: {user_id}, {title}")
        return insight

    # ========== 情绪健康分析（专题） ==========

    async def generate_emotion_health_report(
        self,
        user_id: uuid.UUID,
        start: date,
        end: date,
        with_comparison: bool = False,
        *,
        target_language: str = DEFAULT_TARGET_LANGUAGE,
    ) -> UserInsight | None:
        """生成情绪健康分析专题报告"""
        dreams = await self._fetch_dreams(user_id, start, end)
        days = (end - start).days + 1

        stats = await self._compute_statistics(user_id, dreams, start, end)
        snapshot_by_id = await self._fetch_dream_snapshots([d.id for d in dreams])
        # 不截断内容，保留完整信息
        dream_contents = self._format_dream_contents(
            dreams, emotion=True, snapshot_by_id=snapshot_by_id, max_chars=0
        )

        # 情绪时间线
        emotion_timeline = [
            {"date": d.dream_date.isoformat(), "emotion": d.primary_emotion, "intensity": d.emotion_intensity}
            for d in dreams if d.primary_emotion
        ]

        # 对比数据
        comparison_note = ""
        if with_comparison:
            delta = end - start
            prev_start = start - timedelta(days=delta.days + 1)
            prev_end = start - timedelta(days=1)
            prev_dreams = await self._fetch_dreams(user_id, prev_start, prev_end)
            if prev_dreams:
                comparison_note = f"上一周期（{prev_start} 至 {prev_end}）：{len(prev_dreams)}个梦境"
            else:
                comparison_note = "无上一周期数据可供对比"
        else:
            comparison_note = "本次不做对比分析"

        try:
            ai_analysis = await _emotion_chain.ainvoke({
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "days": days,
                "comparison_note": comparison_note,
                "emotion_distribution": json.dumps(stats["emotion_distribution"], ensure_ascii=False),
                "emotion_timeline": json.dumps(emotion_timeline[:30], ensure_ascii=False),
                "total_dreams": stats["total_dreams"],
                "dream_contents": dream_contents,
                "target_language": target_language,
            })
        except Exception as e:
            logger.error(f"AI 情绪健康分析失败: {user_id}, {e}")
            ai_analysis = {}

        report_data = {
            "period": {"start": start.isoformat(), "end": end.isoformat(), "days": days},
            "statistics": stats,
            "ai_analysis": ai_analysis,
            "charts": {
                "emotion_timeline": emotion_timeline,
                "emotion_distribution": stats["emotion_distribution"],
            },
            "with_comparison": with_comparison,
        }

        expire_at = shanghai_now() + timedelta(days=InsightConfig.EMOTION_EXPIRE_DAYS)
        title = f"情绪健康分析 {start.strftime('%m/%d')}-{end.strftime('%m/%d')}"

        insight = UserInsight(
            user_id=user_id,
            insight_type=InsightType.EMOTION_HEALTH,
            time_period_start=start,
            time_period_end=end,
            title=title,
            data=report_data,
            narrative=ai_analysis.get("emotion_state"),
            expires_at=expire_at,
        )
        self.db.add(insight)
        await self.db.flush()

        settings = await self._get_settings(user_id)
        if settings and settings.notify_on_reports:
            ns = NotificationService(self.db)
            await ns.create(
                user_id=user_id,
                type_=NotificationType.EMOTION_HEALTH_REPORT,
                title=f"{title}已生成",
                content="",
                link=f"/insights/emotion?id={insight.id}",
                metadata={
                    "insight_id": str(insight.id),
                    "report_type": REPORT_NOTIFICATION_META_TYPE[InsightType.EMOTION_HEALTH],
                },
            )

        await self.db.commit()
        
        # 删除同一周期的旧报告（在新报告保存成功后，排除刚创建的新报告）
        await self._delete_old_insights(user_id, InsightType.EMOTION_HEALTH, start, end, exclude_id=insight.id)
        
        return insight

    # ========== 睡眠质量分析（专题） ==========

    async def generate_sleep_quality_report(
        self,
        user_id: uuid.UUID,
        start: date,
        end: date,
        with_comparison: bool = False,
        *,
        target_language: str = DEFAULT_TARGET_LANGUAGE,
    ) -> UserInsight | None:
        """生成睡眠质量分析专题报告"""
        dreams = await self._fetch_dreams(user_id, start, end)
        days = (end - start).days + 1

        stats = await self._compute_statistics(user_id, dreams, start, end)
        snapshot_by_id = await self._fetch_dream_snapshots([d.id for d in dreams])
        # 不截断内容，保留完整信息
        dream_contents = self._format_dream_contents(
            dreams, sleep=True, snapshot_by_id=snapshot_by_id, max_chars=0
        )

        # 睡眠质量趋势
        quality_trend = [
            {"date": d.dream_date.isoformat(), "quality": d.sleep_quality}
            for d in dreams if d.sleep_quality
        ]

        # 工作日 vs 周末
        weekday_q = [d.sleep_quality for d in dreams if d.sleep_quality and d.dream_date.weekday() < 5]
        weekend_q = [d.sleep_quality for d in dreams if d.sleep_quality and d.dream_date.weekday() >= 5]
        weekday_avg = round(sum(weekday_q) / len(weekday_q), 1) if weekday_q else 0
        weekend_avg = round(sum(weekend_q) / len(weekend_q), 1) if weekend_q else 0

        # 入睡时间（若有）
        sleep_times = [str(d.sleep_start_time) for d in dreams if hasattr(d, 'sleep_start_time') and d.sleep_start_time]

        # 对比
        comparison_note = ""
        if with_comparison:
            delta = end - start
            prev_start = start - timedelta(days=delta.days + 1)
            prev_end = start - timedelta(days=1)
            prev_dreams = await self._fetch_dreams(user_id, prev_start, prev_end)
            if prev_dreams:
                prev_q = [d.sleep_quality for d in prev_dreams if d.sleep_quality]
                prev_avg = round(sum(prev_q) / len(prev_q), 1) if prev_q else 0
                comparison_note = f"上一周期平均睡眠质量：{prev_avg}/5（{len(prev_dreams)}个梦境）"
            else:
                comparison_note = "无上一周期数据可供对比"
        else:
            comparison_note = "本次不做对比分析"

        try:
            ai_analysis = await _sleep_chain.ainvoke({
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "days": days,
                "comparison_note": comparison_note,
                "avg_quality": stats["avg_sleep_quality"],
                "quality_trend": json.dumps(quality_trend[:30], ensure_ascii=False),
                "sleep_start_times": ", ".join(sleep_times[:5]) if sleep_times else "无数据",
                "weekday_quality": weekday_avg,
                "weekend_quality": weekend_avg,
                "dream_contents": dream_contents,
                "target_language": target_language,
            })
        except Exception as e:
            logger.error(f"AI 睡眠质量分析失败: {user_id}, {e}")
            ai_analysis = {}

        report_data = {
            "period": {"start": start.isoformat(), "end": end.isoformat(), "days": days},
            "statistics": {
                **stats,
                "weekday_quality": weekday_avg,
                "weekend_quality": weekend_avg,
            },
            "ai_analysis": ai_analysis,
            "charts": {
                "sleep_quality_trend": quality_trend,
                "weekday_vs_weekend": {"weekday": weekday_avg, "weekend": weekend_avg},
            },
            "with_comparison": with_comparison,
        }

        expire_at = shanghai_now() + timedelta(days=InsightConfig.SLEEP_EXPIRE_DAYS)
        title = f"睡眠质量分析 {start.strftime('%m/%d')}-{end.strftime('%m/%d')}"

        insight = UserInsight(
            user_id=user_id,
            insight_type=InsightType.SLEEP_QUALITY,
            time_period_start=start,
            time_period_end=end,
            title=title,
            data=report_data,
            narrative=ai_analysis.get("sleep_summary"),
            expires_at=expire_at,
        )
        self.db.add(insight)
        await self.db.flush()

        settings = await self._get_settings(user_id)
        if settings and settings.notify_on_reports:
            ns = NotificationService(self.db)
            await ns.create(
                user_id=user_id,
                type_=NotificationType.SLEEP_QUALITY_REPORT,
                title=f"{title}已生成",
                content="",
                link=f"/insights/sleep?id={insight.id}",
                metadata={
                    "insight_id": str(insight.id),
                    "report_type": REPORT_NOTIFICATION_META_TYPE[InsightType.SLEEP_QUALITY],
                },
            )

        await self.db.commit()
        
        # 删除同一周期的旧报告（在新报告保存成功后，排除刚创建的新报告）
        await self._delete_old_insights(user_id, InsightType.SLEEP_QUALITY, start, end, exclude_id=insight.id)
        
        return insight

    # ========== 梦境主题模式（专题） ==========

    async def generate_theme_pattern_report(
        self,
        user_id: uuid.UUID,
        start: date,
        end: date,
        *,
        target_language: str = DEFAULT_TARGET_LANGUAGE,
    ) -> UserInsight | None:
        """生成梦境主题模式专题报告"""
        dreams = await self._fetch_dreams(user_id, start, end)
        days = (end - start).days + 1
        snapshot_by_id = await self._fetch_dream_snapshots([d.id for d in dreams])
        # 不截断内容，保留完整信息
        dream_contents = self._format_dream_contents(
            dreams, snapshot_by_id=snapshot_by_id, max_chars=0
        )

        try:
            ai_analysis = await _theme_chain.ainvoke({
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "days": days,
                "total_dreams": len(dreams),
                "dream_contents": dream_contents,
                "target_language": target_language,
            })
        except Exception as e:
            logger.error(f"AI 主题分析失败: {user_id}, {e}")
            ai_analysis = {}

        # 统计 tags 词频（辅助词云）
        tag_counts: dict[str, int] = {}
        for d in dreams:
            if d.tags:
                for dream_tag in d.tags:
                    # d.tags 是 DreamTag 对象列表，需要通过 .tag.name 访问标签名称
                    if hasattr(dream_tag, 'tag') and hasattr(dream_tag.tag, 'name'):
                        tag_name = dream_tag.tag.name
                        tag_counts[tag_name] = tag_counts.get(tag_name, 0) + 1

        # 为 representative_dreams 添加 dream_id，方便前端跳转
        if isinstance(ai_analysis, dict) and "representative_dreams" in ai_analysis:
            dreams_by_date = {d.dream_date.isoformat(): str(d.id) for d in dreams}
            for rep_dream in ai_analysis.get("representative_dreams", []):
                if isinstance(rep_dream, dict) and "date" in rep_dream:
                    dream_date = rep_dream["date"]
                    rep_dream["dream_id"] = dreams_by_date.get(dream_date)

        report_data = {
            "period": {"start": start.isoformat(), "end": end.isoformat(), "days": days},
            "statistics": {
                "total_dreams": len(dreams),
                "tag_frequency": sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:20],
            },
            "ai_analysis": ai_analysis,
        }

        expire_at = shanghai_now() + timedelta(days=InsightConfig.THEME_EXPIRE_DAYS)
        title = f"梦境主题分析 {start.strftime('%m/%d')}-{end.strftime('%m/%d')}"

        insight = UserInsight(
            user_id=user_id,
            insight_type=InsightType.THEME_PATTERN,
            time_period_start=start,
            time_period_end=end,
            title=title,
            data=report_data,
            narrative=ai_analysis.get("theme_summary"),
            expires_at=expire_at,
        )
        self.db.add(insight)
        await self.db.flush()

        settings = await self._get_settings(user_id)
        if settings and settings.notify_on_reports:
            ns = NotificationService(self.db)
            await ns.create(
                user_id=user_id,
                type_=NotificationType.THEME_PATTERN_REPORT,
                title=f"{title}已生成",
                content="",
                link=f"/insights/theme?id={insight.id}",
                metadata={
                    "insight_id": str(insight.id),
                    "report_type": REPORT_NOTIFICATION_META_TYPE[InsightType.THEME_PATTERN],
                },
            )

        await self.db.commit()
        
        # 删除同一周期的旧报告（在新报告保存成功后，排除刚创建的新报告）
        await self._delete_old_insights(user_id, InsightType.THEME_PATTERN, start, end, exclude_id=insight.id)
        
        return insight

    # ========== 设置管理 ==========

    async def get_settings(self, user_id: uuid.UUID) -> UserInsightSettings:
        """获取用户洞察设置（不存在则创建默认）"""
        settings = await self._get_settings(user_id)
        if not settings:
            settings = UserInsightSettings(user_id=user_id)
            self.db.add(settings)
            await self.db.commit()
            await self.db.refresh(settings)
        return settings

    async def update_settings(
        self, user_id: uuid.UUID, data: dict
    ) -> UserInsightSettings:
        """更新洞察设置"""
        settings = await self.get_settings(user_id)
        for key, value in data.items():
            if value is not None and hasattr(settings, key):
                setattr(settings, key, value)
        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    # ========== 报告查询 ==========

    async def get_list(
        self,
        user_id: uuid.UUID,
        *,
        insight_type: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[UserInsight], int]:
        """获取洞察列表"""
        base = select(UserInsight).where(UserInsight.user_id == user_id)
        if insight_type:
            base = base.where(UserInsight.insight_type == insight_type)

        total = (
            await self.db.execute(select(func.count()).select_from(base.subquery()))
        ).scalar() or 0

        stmt = (
            base.order_by(UserInsight.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    async def get_by_id(
        self, insight_id: uuid.UUID, user_id: uuid.UUID
    ) -> UserInsight | None:
        """获取单个报告"""
        stmt = select(UserInsight).where(
            UserInsight.id == insight_id, UserInsight.user_id == user_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_as_read(self, insight_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """标记已读"""
        insight = await self.get_by_id(insight_id, user_id)
        if not insight:
            return False
        insight.is_read = True
        await self.db.commit()
        return True

    async def delete_insight(self, insight_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """删除报告"""
        insight = await self.get_by_id(insight_id, user_id)
        if not insight:
            return False
        await self.db.delete(insight)
        await self.db.commit()
        return True

    async def cleanup_expired(self, user_id: uuid.UUID) -> int:
        """清理过期报告，返回删除条数"""
        now = shanghai_now()
        result = await self.db.execute(
            delete(UserInsight).where(
                UserInsight.user_id == user_id,
                UserInsight.expires_at.isnot(None),
                UserInsight.expires_at < now,
            )
        )
        await self.db.commit()
        return result.rowcount or 0

    async def cleanup_all(self, user_id: uuid.UUID) -> None:
        """清理该用户的所有洞察报告"""
        await self.db.execute(
            delete(UserInsight).where(UserInsight.user_id == user_id)
        )
        await self.db.commit()

    async def get_unread_summary(self, user_id: uuid.UUID) -> dict[str, bool]:
        """返回按类型统计的未读报告是否存在"""
        stmt = (
            select(UserInsight.insight_type, func.count())
            .where(
                UserInsight.user_id == user_id,
                UserInsight.is_read.is_(False),
            )
            .group_by(UserInsight.insight_type)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        summary: dict[str, bool] = {
            "weekly": False,
            "monthly": False,
            "annual": False,
            "emotion_health": False,
            "sleep_quality": False,
            "theme_pattern": False,
        }

        for insight_type, count in rows:
            if not count:
                continue
            if insight_type == InsightType.WEEKLY:
                summary["weekly"] = True
            elif insight_type == InsightType.MONTHLY:
                summary["monthly"] = True
            elif insight_type == InsightType.ANNUAL:
                summary["annual"] = True
            elif insight_type == InsightType.EMOTION_HEALTH:
                summary["emotion_health"] = True
            elif insight_type == InsightType.SLEEP_QUALITY:
                summary["sleep_quality"] = True
            elif insight_type == InsightType.THEME_PATTERN:
                summary["theme_pattern"] = True

        return summary

    # ========== 内部方法 ==========

    async def _delete_old_insights(
        self,
        user_id: uuid.UUID,
        insight_type: InsightType,
        period_start: date,
        period_end: date,
        exclude_id: uuid.UUID | None = None,
    ) -> None:
        """删除同一周期的旧报告（排除指定的报告ID，通常是刚创建的新报告）"""
        conditions = [
            UserInsight.user_id == user_id,
            UserInsight.insight_type == insight_type,
            UserInsight.time_period_start == period_start,
            UserInsight.time_period_end == period_end,
        ]
        
        # 排除刚创建的新报告
        if exclude_id:
            conditions.append(UserInsight.id != exclude_id)
        
        stmt = delete(UserInsight).where(and_(*conditions))
        result = await self.db.execute(stmt)
        await self.db.commit()
        
        if result.rowcount > 0:
            logger.info(
                f"已删除 {result.rowcount} 条旧报告: user={user_id}, type={insight_type.value}, "
                f"period={period_start} to {period_end}"
            )

    async def _fetch_dreams(self, user_id: uuid.UUID, start: date, end: date) -> list[Dream]:
        """查询指定范围的梦境"""
        stmt = (
            select(Dream)
            .options(
                selectinload(Dream.tags).selectinload(DreamTag.tag)
            )
            .where(
                Dream.user_id == user_id,
                Dream.dream_date >= start,
                Dream.dream_date <= end,
                Dream.deleted_at.is_(None),
            )
            .order_by(Dream.dream_date)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _fetch_dream_snapshots(
        self, dream_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, str]:
        """查询 dream_insights 中 content_structured.snapshot 非空的梦境，返回 dream_id -> snapshot 文本"""
        if not dream_ids:
            return {}
        stmt = select(DreamInsight).where(
            DreamInsight.dream_id.in_(dream_ids),
            DreamInsight.content_structured.isnot(None),
        )
        result = await self.db.execute(stmt)
        out: dict[uuid.UUID, str] = {}
        for row in result.scalars().all():
            cs = row.content_structured
            if isinstance(cs, dict):
                snapshot = cs.get("snapshot")
                if isinstance(snapshot, str) and snapshot.strip():
                    out[row.dream_id] = snapshot.strip()
        return out

    def _format_dream_contents(
        self,
        dreams: list[Dream],
        max_chars: int = 300,
        emotion: bool = False,
        sleep: bool = False,
        snapshot_by_id: dict[uuid.UUID, str] | None = None,
    ) -> str:
        """格式化梦境内容字符串。若有 snapshot_by_id 则优先用 content_structured.snapshot，否则用 content。
        max_chars=0 表示不截断。"""
        lines = []
        for d in dreams:
            body = d.content
            if snapshot_by_id and d.id in snapshot_by_id:
                body = snapshot_by_id[d.id]
            # max_chars=0 表示不截断
            if max_chars > 0 and len(body) > max_chars:
                body = body[:max_chars]
            extra = ""
            if emotion and d.primary_emotion:
                extra = f" | 情绪: {d.primary_emotion}(强度{d.emotion_intensity or '?'})"
            elif sleep and d.sleep_quality:
                extra = f" | 睡眠质量: {d.sleep_quality}/5"
            else:
                parts = []
                if d.sleep_quality:
                    parts.append(f"睡眠{d.sleep_quality}/5")
                if d.primary_emotion:
                    parts.append(f"{d.primary_emotion}")
                if parts:
                    extra = f" [{', '.join(parts)}]"
            lines.append(f"[{d.dream_date}] {d.title or '无标题'}{extra}: {body}")
        return "\n\n".join(lines)

    async def _get_settings(self, user_id: uuid.UUID) -> UserInsightSettings | None:
        stmt = select(UserInsightSettings).where(UserInsightSettings.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _compute_statistics(
        self,
        _user_id: uuid.UUID,
        dreams: list[Dream],
        _start: date,
        _end: date,
    ) -> dict:
        """计算统计数据"""
        total = len(dreams)
        qualities = [d.sleep_quality for d in dreams if d.sleep_quality]
        avg_quality = round(sum(qualities) / len(qualities), 1) if qualities else 0

        emotion_counts: dict[str, int] = {}
        for d in dreams:
            if d.primary_emotion:
                emotion_counts[d.primary_emotion] = emotion_counts.get(d.primary_emotion, 0) + 1
        emotion_dist = {k: round(v / total, 2) for k, v in emotion_counts.items()} if total else {}

        dream_ids = [d.id for d in dreams]
        top_triggers: list[dict] = []
        if dream_ids:
            stmt = (
                select(DreamTrigger.trigger_name, func.count())
                .where(DreamTrigger.dream_id.in_(dream_ids))
                .group_by(DreamTrigger.trigger_name)
                .order_by(func.count().desc())
                .limit(5)
            )
            result = await self.db.execute(stmt)
            top_triggers = [{"name": name, "count": cnt} for name, cnt in result.all()]

        type_distribution: dict[str, int] = {}
        if dream_ids:
            stmt = (
                select(DreamType.type_name, func.count())
                .select_from(DreamTypeMapping)
                .join(DreamType, DreamTypeMapping.type_id == DreamType.id)
                .where(DreamTypeMapping.dream_id.in_(dream_ids))
                .group_by(DreamType.type_name)
            )
            result = await self.db.execute(stmt)
            for type_name_enum, cnt in result.all():
                type_distribution[type_name_enum.value] = cnt

        return {
            "total_dreams": total,
            "avg_sleep_quality": avg_quality,
            "emotion_distribution": emotion_dist,
            "top_triggers": top_triggers,
            "type_distribution": type_distribution,
        }

    def _build_chart_data(self, dreams: list[Dream], stats: dict) -> dict:
        """构建前端图表数据"""
        emotion_timeline = [
            {
                "date": d.dream_date.isoformat(),
                "emotion": d.primary_emotion,
                "intensity": d.emotion_intensity,
            }
            for d in dreams
            if d.primary_emotion
        ]

        sleep_trend = [
            {
                "date": d.dream_date.isoformat(),
                "quality": d.sleep_quality,
                "vividness": d.vividness_level,
            }
            for d in dreams
            if d.sleep_quality
        ]

        return {
            "emotion_timeline": emotion_timeline,
            "sleep_quality_trend": sleep_trend,
            "trigger_frequency": stats["top_triggers"],
            "emotion_distribution": stats["emotion_distribution"],
            "type_distribution": stats.get("type_distribution") or {},
        }

    async def _compute_streak(self, user_id: uuid.UUID, end_date: date) -> int:
        """计算到指定日期为止的连续记录天数"""
        streak = 0
        current = end_date
        while True:
            stmt = select(func.count()).where(
                Dream.user_id == user_id,
                Dream.dream_date == current,
                Dream.deleted_at.is_(None),
            )
            count = (await self.db.execute(stmt)).scalar() or 0
            if count == 0:
                break
            streak += 1
            current -= timedelta(days=1)
            if streak > 365:
                break
        return streak

    def _compute_max_streak_in_range(self, dreams: list[Dream]) -> int:
        """计算梦境列表中的最长连续记录天数"""
        if not dreams:
            return 0
        dates = sorted({d.dream_date for d in dreams})
        max_streak = current_streak = 1
        for i in range(1, len(dates)):
            if (dates[i] - dates[i - 1]).days == 1:
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 1
        return max_streak

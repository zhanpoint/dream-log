"""
梦境服务层
"""

import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.dream import Dream
from app.models.dream_analysis import DreamAnalysisTask
from app.models.dream_insight import DreamInsight
from app.models.dream_tag import DreamTag, Tag
from app.models.dream_trigger import DreamTrigger
from app.models.dream_type import DreamType, DreamTypeMapping
from app.models.enums import AIProcessingStatus, AwakeningState, PrivacyLevel
from app.schemas.dreams import CreateDreamRequest, CreateTagRequest, UpdateDreamRequest, UpdateTagRequest


class DreamService:
    """梦境服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========== 创建 ==========

    async def create_dream(
        self,
        request: CreateDreamRequest,
        user_id: uuid.UUID,
    ) -> Dream:
        """
        创建梦境

        策略: 主表轻量数据 -> 关联表批量插入 -> AI 异步处理
        """
        dream = Dream(
            user_id=user_id,
            title=request.title,
            content=request.content,
            dream_date=request.dream_date,
            dream_time=request.dream_time,
            is_nap=request.is_nap,
            is_draft=request.title is None,
            # 睡眠
            sleep_duration_minutes=request.sleep_duration_minutes,
            awakening_state=AwakeningState(request.awakening_state) if request.awakening_state else None,
            sleep_quality=request.sleep_quality,
            sleep_fragmented=request.sleep_fragmented,
            sleep_depth=request.sleep_depth,
            # 情绪
            primary_emotion=request.primary_emotion,
            emotion_intensity=request.emotion_intensity,
            emotion_residual=request.emotion_residual,
            # 特征
            lucidity_level=request.lucidity_level,
            vividness_level=request.vividness_level,
            completeness_score=request.completeness_score,
            # 现实关联
            reality_correlation=request.reality_correlation,
            # 隐私
            privacy_level=PrivacyLevel(request.privacy_level),
        )
        self.db.add(dream)
        await self.db.flush()

        # 创建 insight 记录 (生命上下文 + 用户解读)
        if request.life_context or request.user_interpretation:
            insight = DreamInsight(
                dream_id=dream.id,
                life_context=request.life_context,
                user_interpretation=request.user_interpretation,
            )
            self.db.add(insight)

        # 关联梦境类型
        if request.dream_types:
            await self._link_dream_types(dream.id, request.dream_types)

        # 关联触发因素
        if request.triggers:
            await self._link_triggers(dream.id, request.triggers)

        await self.db.commit()
        await self.db.refresh(dream)

        return dream

    # ========== 查询 ==========

    async def get_dream(
        self,
        dream_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Dream:
        """获取单个梦境 (含关联数据)"""
        stmt = (
            select(Dream)
            .options(
                selectinload(Dream.emotions),
                selectinload(Dream.type_mappings).selectinload(DreamTypeMapping.dream_type),
                selectinload(Dream.tags),
                selectinload(Dream.attachments),
                selectinload(Dream.insight),
            )
            .where(
                Dream.id == dream_id,
                Dream.user_id == user_id,
                Dream.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        dream = result.scalar_one_or_none()

        if not dream:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="梦境不存在",
            )

        # 增加查看次数
        dream.view_count += 1
        await self.db.commit()

        return dream

    async def list_dreams(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "dream_date",
        sort_order: str = "desc",
        dream_type: str | None = None,
        emotion: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        search: str | None = None,
        is_favorite: bool | None = None,
    ) -> tuple[list[Dream], int]:
        """获取梦境列表 (分页 + 过滤)"""
        # 基础查询
        base = select(Dream).where(
            Dream.user_id == user_id,
            Dream.deleted_at.is_(None),
        )

        # 过滤条件
        if dream_type:
            type_names = [t.strip() for t in dream_type.split(",")]
            base = base.join(DreamTypeMapping).join(DreamType).where(
                DreamType.type_name.in_(type_names)
            )
        if emotion:
            emotions = [e.strip() for e in emotion.split(",")]
            base = base.where(Dream.primary_emotion.in_(emotions))
        if date_from:
            base = base.where(Dream.dream_date >= date_from)
        if date_to:
            base = base.where(Dream.dream_date <= date_to)
        if search:
            base = base.where(Dream.content.ilike(f"%{search}%"))
        if is_favorite is not None:
            base = base.where(Dream.is_favorite == is_favorite)

        # 统计总数
        count_stmt = select(func.count()).select_from(base.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # 排序
        sort_col = getattr(Dream, sort_by, Dream.dream_date)
        if sort_order == "desc":
            base = base.order_by(sort_col.desc())
        else:
            base = base.order_by(sort_col.asc())

        # 分页
        offset = (page - 1) * page_size
        stmt = (
            base.options(
                selectinload(Dream.type_mappings).selectinload(DreamTypeMapping.dream_type),
                selectinload(Dream.tags),
                selectinload(Dream.attachments),
            )
            .offset(offset)
            .limit(page_size)
        )

        result = await self.db.execute(stmt)
        dreams = list(result.scalars().unique().all())

        return dreams, total

    # ========== 更新 ==========

    async def update_dream(
        self,
        dream_id: uuid.UUID,
        user_id: uuid.UUID,
        request: UpdateDreamRequest,
    ) -> Dream:
        """更新梦境 (PATCH 语义)"""
        dream = await self._get_dream_or_404(dream_id, user_id)

        # 只更新传入的非 None 字段
        update_data = request.model_dump(exclude_unset=True)

        # 分离关联表字段
        dream_types = update_data.pop("dream_types", None)
        triggers = update_data.pop("triggers", None)
        life_context = update_data.pop("life_context", None)
        user_interpretation = update_data.pop("user_interpretation", None)

        # 处理枚举转换
        if "awakening_state" in update_data and update_data["awakening_state"]:
            update_data["awakening_state"] = AwakeningState(update_data["awakening_state"])
        if "privacy_level" in update_data and update_data["privacy_level"]:
            update_data["privacy_level"] = PrivacyLevel(update_data["privacy_level"])

        # 更新主表字段
        for key, value in update_data.items():
            if hasattr(dream, key):
                setattr(dream, key, value)

        # 更新梦境类型
        if dream_types is not None:
            await self._sync_dream_types(dream.id, dream_types)

        # 更新触发因素
        if triggers is not None:
            await self._sync_triggers(dream.id, triggers)

        # 更新 insight
        if life_context is not None or user_interpretation is not None:
            await self._upsert_insight(dream.id, life_context, user_interpretation)

        await self.db.commit()
        await self.db.refresh(dream)

        return dream

    # ========== 删除 ==========

    async def delete_dream(
        self,
        dream_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """软删除梦境"""
        dream = await self._get_dream_or_404(dream_id, user_id)

        from app.models.user import shanghai_now

        dream.deleted_at = shanghai_now()
        await self.db.commit()

    # ========== 收藏 ==========

    async def toggle_favorite(
        self,
        dream_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """切换收藏状态, 返回新状态"""
        dream = await self._get_dream_or_404(dream_id, user_id)
        dream.is_favorite = not dream.is_favorite
        await self.db.commit()
        return dream.is_favorite

    # ========== 内部方法 ==========

    async def _get_dream_or_404(
        self,
        dream_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Dream:
        """获取梦境, 不存在则 404"""
        stmt = select(Dream).where(
            Dream.id == dream_id,
            Dream.user_id == user_id,
            Dream.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        dream = result.scalar_one_or_none()
        if not dream:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="梦境不存在",
            )
        return dream

    async def _link_dream_types(
        self, dream_id: uuid.UUID, type_names: list[str]
    ) -> None:
        """关联梦境类型"""
        stmt = select(DreamType).where(DreamType.type_name.in_(type_names))
        result = await self.db.execute(stmt)
        dream_types = result.scalars().all()

        for dt in dream_types:
            self.db.add(DreamTypeMapping(dream_id=dream_id, type_id=dt.id))

    async def _sync_dream_types(
        self, dream_id: uuid.UUID, type_names: list[str]
    ) -> None:
        """同步梦境类型 (删除旧的, 添加新的)"""
        # 删除旧关联
        stmt = select(DreamTypeMapping).where(DreamTypeMapping.dream_id == dream_id)
        result = await self.db.execute(stmt)
        for mapping in result.scalars().all():
            await self.db.delete(mapping)

        # 添加新关联
        if type_names:
            await self._link_dream_types(dream_id, type_names)

    async def _link_triggers(
        self, dream_id: uuid.UUID, trigger_keys: list[str]
    ) -> None:
        """关联触发因素"""
        from app.models.dream_trigger import Trigger

        stmt = select(Trigger).where(Trigger.trigger_key.in_(trigger_keys))
        result = await self.db.execute(stmt)
        triggers = result.scalars().all()

        for t in triggers:
            self.db.add(DreamTrigger(dream_id=dream_id, trigger_id=t.id))

    async def _sync_triggers(
        self, dream_id: uuid.UUID, trigger_keys: list[str]
    ) -> None:
        """同步触发因素"""
        stmt = select(DreamTrigger).where(DreamTrigger.dream_id == dream_id)
        result = await self.db.execute(stmt)
        for mapping in result.scalars().all():
            await self.db.delete(mapping)

        if trigger_keys:
            await self._link_triggers(dream_id, trigger_keys)

    async def _upsert_insight(
        self,
        dream_id: uuid.UUID,
        life_context: str | None,
        user_interpretation: str | None,
    ) -> None:
        """创建或更新 insight"""
        stmt = select(DreamInsight).where(DreamInsight.dream_id == dream_id)
        result = await self.db.execute(stmt)
        insight = result.scalar_one_or_none()

        if insight:
            if life_context is not None:
                insight.life_context = life_context
            if user_interpretation is not None:
                insight.user_interpretation = user_interpretation
        else:
            self.db.add(
                DreamInsight(
                    dream_id=dream_id,
                    life_context=life_context,
                    user_interpretation=user_interpretation,
                )
            )

    # ========== 标签管理 ==========

    async def get_user_tags(self, user_id: uuid.UUID) -> list[Tag]:
        """获取用户所有标签"""
        stmt = select(Tag).where(Tag.user_id == user_id).order_by(Tag.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_tag(self, user_id: uuid.UUID, request: CreateTagRequest) -> Tag:
        """创建标签"""
        tag = Tag(user_id=user_id, name=request.name, color=request.color)
        self.db.add(tag)
        await self.db.commit()
        await self.db.refresh(tag)
        return tag

    async def update_tag(self, tag_id: uuid.UUID, user_id: uuid.UUID, request: UpdateTagRequest) -> Tag:
        """更新标签"""
        tag = await self._get_tag_or_404(tag_id, user_id)
        data = request.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(tag, key, value)
        await self.db.commit()
        await self.db.refresh(tag)
        return tag

    async def delete_tag(self, tag_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """删除标签 (级联删除关联)"""
        tag = await self._get_tag_or_404(tag_id, user_id)
        await self.db.delete(tag)
        await self.db.commit()

    async def add_tag_to_dream(self, dream_id: uuid.UUID, tag_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """给梦境添加标签"""
        await self._get_dream_or_404(dream_id, user_id)
        await self._get_tag_or_404(tag_id, user_id)
        # 检查是否已存在
        stmt = select(DreamTag).where(DreamTag.dream_id == dream_id, DreamTag.tag_id == tag_id)
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            return  # 幂等: 已存在则跳过
        self.db.add(DreamTag(dream_id=dream_id, tag_id=tag_id))
        await self.db.commit()

    async def remove_tag_from_dream(self, dream_id: uuid.UUID, tag_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """移除梦境标签"""
        await self._get_dream_or_404(dream_id, user_id)
        stmt = select(DreamTag).where(DreamTag.dream_id == dream_id, DreamTag.tag_id == tag_id)
        result = await self.db.execute(stmt)
        dt = result.scalar_one_or_none()
        if not dt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="标签关联不存在")
        await self.db.delete(dt)
        await self.db.commit()

    async def _get_tag_or_404(self, tag_id: uuid.UUID, user_id: uuid.UUID) -> Tag:
        """获取标签, 不存在则 404"""
        stmt = select(Tag).where(Tag.id == tag_id, Tag.user_id == user_id)
        result = await self.db.execute(stmt)
        tag = result.scalar_one_or_none()
        if not tag:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="标签不存在")
        return tag

    # ========== 分析状态 ==========

    async def get_analysis_status(self, dream_id: uuid.UUID, user_id: uuid.UUID) -> dict:
        """获取梦境 AI 分析状态"""
        dream = await self._get_dream_or_404(dream_id, user_id)
        stmt = (
            select(DreamAnalysisTask)
            .where(DreamAnalysisTask.dream_id == dream_id)
            .order_by(DreamAnalysisTask.created_at.desc())
        )
        result = await self.db.execute(stmt)
        tasks = list(result.scalars().all())

        return {
            "dream_id": dream.id,
            "ai_processed": dream.ai_processed,
            "ai_processing_status": dream.ai_processing_status.value if dream.ai_processing_status else "PENDING",
            "ai_processed_at": dream.ai_processed_at,
            "tasks": tasks,
        }

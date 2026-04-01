"""



梦境服务层



"""







import logging



import uuid



from datetime import date, timedelta







from fastapi import HTTPException, status



from sqlalchemy import exists, func, or_, select, text



from sqlalchemy.ext.asyncio import AsyncSession



from sqlalchemy.orm.attributes import flag_modified



from sqlalchemy.orm import selectinload







from app.models.dream import Dream



from app.models.user import shanghai_now



from app.models.dream_embedding import DreamEmbedding



from app.models.dream_insight import DreamInsight



from app.models.dream_tag import DreamTag, Tag



from app.models.dream_trigger import DreamTrigger



from app.models.dream_type import DreamType, DreamTypeMapping



from app.models.enums import AIProcessingStatus, AwakeningState, PrivacyLevel
from app.services.community_service import CommunityService



from app.schemas.dreams import (



    CreateDreamRequest,



    CreateTagRequest,



    UpdateDreamRequest,



    UpdateTagRequest,



)







logger = logging.getLogger(__name__)











def _calculate_length_change_percentage(old_content: str, new_content: str) -> float:



    """



    计算内容长度变化百分比



    



    规则：仅基于长度变化判断是否需要重新生成 embedding



    - 长度变化 >= 20%：需要更新 embedding



    - 长度变化 < 20%：跳过更新



    



    Args:



        old_content: 旧内容



        new_content: 新内容



    



    Returns:



        长度变化百分比 (0.0-1.0)



    """



    old_content = old_content or ""



    new_content = new_content or ""







    if not old_content and not new_content:



        return 0.0



    if not old_content or not new_content:



        return 1.0  # 从空到有内容或反向，视为 100% 变化







    # 计算长度变化百分比（仅基于长度，不检测语义）



    old_len = len(old_content)



    new_len = len(new_content)



    



    if old_len == 0:



        return 1.0 if new_len > 0 else 0.0



    



    length_diff = abs(new_len - old_len)



    change_percentage = length_diff / old_len



    



    return float(max(0.0, min(change_percentage, 1.0)))











def _format_dream_content_for_embedding(dream: Dream, insight: DreamInsight | None = None) -> str:



    """



    格式化梦境内容用于生成 embedding（仅基于用户输入的原始数据，不包含 AI 分析结果）



    



    当前实现：仅使用梦境内容输入框中的文本（dream.content）



    这是最纯粹的方式，embedding 只反映用户描述的核心梦境内容



    



    不包含：



    - AI 分析结果（snapshot, emotional_summary, emotion_interpretation 等）



    - AI 生成的触发因素



    - AI 生成的洞察和建议



    - 其他结构化字段（标题、日期、睡眠信息、情绪等）



    """



    # 仅使用梦境内容输入框中的文本



    content = dream.content.strip() if dream.content else ""



    



    # 如果内容为空，返回空字符串（不会生成 embedding）



    return content











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



            title_generated_by_ai=request.title_generated_by_ai,



            content=request.content,



            dream_date=request.dream_date,



            dream_time=request.dream_time,



            is_nap=request.is_nap,



            is_draft=False,



            # 睡眠



            sleep_start_time=request.sleep_start_time,



            awakening_time=request.awakening_time,



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

            # 社区
            is_anonymous=request.is_anonymous,
            is_seeking_interpretation=request.is_seeking_interpretation,
            community_id=request.community_id,



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







        await self.db.commit()



        



        # 重新加载 dream 以获取关联数据（tags, type_mappings）



        await self.db.refresh(dream, ["tags", "type_mappings"])



        



        # 生成并保存 embedding（基于用户输入的原始内容）



        await self._generate_and_save_embedding(



            dream,



            insight if request.life_context or request.user_interpretation else None,



        )



        await self.db.commit()



        await self.db.refresh(dream)



        # 创建后立即计算相似梦境并落库（不依赖 AI 分析）



        await self._compute_and_save_similar_dreams(dream.id, user_id)

        # 创建后自动刷新精选快照（仅公开梦境）
        if dream.privacy_level == PrivacyLevel.PUBLIC and not getattr(dream, "deleted_at", None):
            await CommunityService(self.db).refresh_featured_snapshot(dream.id)
            await self.db.commit()



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



                selectinload(Dream.trigger_mappings),



                selectinload(Dream.type_mappings).selectinload(DreamTypeMapping.dream_type),



                selectinload(Dream.tags).selectinload(DreamTag.tag),



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
        privacy_level: str | None = None,
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



            search_pattern = f"%{search.strip()}%"



            # 标签名匹配（存在子查询，不产生额外 join）



            tag_match = exists(



                select(1)



                .select_from(DreamTag)



                .join(Tag, DreamTag.tag_id == Tag.id)



                .where(DreamTag.dream_id == Dream.id)



                .where(Tag.name.ilike(search_pattern))



            )



            # 多字段 OR：标题、内容、生活背景、用户解读、标签



            base = base.outerjoin(DreamInsight, Dream.id == DreamInsight.dream_id)



            base = base.where(



                or_(



                    Dream.title.ilike(search_pattern),



                    Dream.content.ilike(search_pattern),



                    DreamInsight.life_context.ilike(search_pattern),



                    DreamInsight.user_interpretation.ilike(search_pattern),



                    tag_match,



                )



            )



        if is_favorite is not None:
            base = base.where(Dream.is_favorite == is_favorite)

        if privacy_level:
            levels: list[PrivacyLevel] = []
            for raw in privacy_level.split(","):
                key = raw.strip()
                if not key:
                    continue
                try:
                    levels.append(PrivacyLevel[key])
                except KeyError:
                    continue
            if levels:
                base = base.where(Dream.privacy_level.in_(levels))

        # 统计总数



        count_stmt = select(func.count()).select_from(base.subquery())



        total = (await self.db.execute(count_stmt)).scalar() or 0







        # 排序：按主字段排序，按日期时细分到时间（同一天内按 created_at）



        sort_col = getattr(Dream, sort_by, Dream.dream_date)



        if sort_order == "desc":



            base = base.order_by(sort_col.desc())



            if sort_by == "dream_date":



                base = base.order_by(Dream.created_at.desc())



        else:



            base = base.order_by(sort_col.asc())



            if sort_by == "dream_date":



                base = base.order_by(Dream.created_at.asc())







        # 分页



        offset = (page - 1) * page_size



        stmt = (



            base.options(



                selectinload(Dream.type_mappings).selectinload(DreamTypeMapping.dream_type),



                selectinload(Dream.tags).selectinload(DreamTag.tag),



                selectinload(Dream.attachments),



            )



            .offset(offset)



            .limit(page_size)



        )







        result = await self.db.execute(stmt)



        dreams = list(result.scalars().unique().all())







        return dreams, total







    async def get_dream_stats(self, user_id: uuid.UUID) -> dict:



        """



        获取梦境统计：全部数量、连续记录天数、本周/本月记录数。



        连续记录天数：从最近一次有记录的日期起，向前数有多少个连续自然日都有记录。



        """



        today = shanghai_now().date()



        base = select(Dream).where(



            Dream.user_id == user_id,



            Dream.deleted_at.is_(None),



        )







        # 全部数量



        total_stmt = select(func.count()).select_from(base.subquery())



        total = (await self.db.execute(total_stmt)).scalar() or 0







        # 所有有记录的日期（去重）



        dates_stmt = (



            select(Dream.dream_date)



            .where(Dream.user_id == user_id, Dream.deleted_at.is_(None))



            .distinct()



        )



        result = await self.db.execute(dates_stmt)



        recorded_dates = {row[0] for row in result.all()}







        if not recorded_dates:



            return {



                "total": 0,



                "consecutive_days": 0,



                "this_week_count": 0,



                "this_month_count": 0,



            }







        # 连续记录天数：从最近记录日向前数连续天数



        most_recent = max(recorded_dates)



        consecutive = 0



        d = most_recent



        while d in recorded_dates:



            consecutive += 1



            d -= timedelta(days=1)







        # 本周：周一 00:00 至今（按自然周，周一为一周开始）



        start_of_week = today - timedelta(days=today.weekday())



        this_week_stmt = select(func.count()).select_from(



            base.where(



                Dream.dream_date >= start_of_week,



                Dream.dream_date <= today,



            ).subquery()



        )



        this_week_count = (await self.db.execute(this_week_stmt)).scalar() or 0







        # 本月



        start_of_month = today.replace(day=1)



        this_month_stmt = select(func.count()).select_from(



            base.where(



                Dream.dream_date >= start_of_month,



                Dream.dream_date <= today,



            ).subquery()



        )



        this_month_count = (await self.db.execute(this_month_stmt)).scalar() or 0







        return {



            "total": total,



            "consecutive_days": consecutive,



            "this_week_count": this_week_count,



            "this_month_count": this_month_count,



        }







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



        life_context = update_data.pop("life_context", None)



        user_interpretation = update_data.pop("user_interpretation", None)







        # 在应用更新前保存旧 content（用于 embedding 长度变化判断）



        old_content_for_embedding = (dream.content or "") if "content" in update_data else None







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







        # 更新 insight



        insight = None



        if life_context is not None or user_interpretation is not None:



            insight = await self._upsert_insight(dream.id, life_context, user_interpretation)







        # 智能 embedding 更新策略：仅基于长度变化



        if "content" in update_data and old_content_for_embedding is not None:



            new_content = update_data["content"] or ""



            # 计算长度变化百分比（old_content 为更新前内容，已在上面保存）



            length_change = _calculate_length_change_percentage(old_content_for_embedding, new_content)



            



            if length_change >= 0.2:  # 长度变化 >= 20%，标记需要更新



                await self._mark_embedding_for_update(dream.id)



                logger.info(



                    f"梦境 {dream.id} 内容长度变化 {length_change:.1%}，已标记 embedding 需要更新"



                )



            else:



                logger.info(



                    f"梦境 {dream.id} 内容长度变化 {length_change:.1%}（<20%），跳过 embedding 更新"



                )







        await self.db.commit()



        await self.db.refresh(dream)



        return dream







    # ========== 删除 ==========







    async def delete_dream(



        self,



        dream_id: uuid.UUID,



        user_id: uuid.UUID,



    ) -> None:



        """



        删除梦境：先删除 OSS 上的附件文件，再硬删除梦境及其所有关联记录。



        关联表（dream_attachments, dream_embeddings, dream_insights 等）由 DB 的 ON DELETE CASCADE 自动清理。



        """



        stmt = (



            select(Dream)



            .where(



                Dream.id == dream_id,



                Dream.user_id == user_id,



                Dream.deleted_at.is_(None),



            )



            .options(selectinload(Dream.attachments))



        )



        result = await self.db.execute(stmt)



        dream = result.scalar_one_or_none()



        if not dream:



            raise HTTPException(



                status_code=status.HTTP_404_NOT_FOUND,



                detail="梦境不存在",



            )







        from app.services.oss_service import get_oss_service







        oss_service = get_oss_service()



        for att in dream.attachments:



            try:



                await oss_service.delete_object_by_url(att.file_url, bucket_type="private")



            except Exception as e:



                logger.warning("删除梦境附件 OSS 文件失败 dream_id=%s url=%s: %s", dream_id, getattr(att, "file_url", ""), e)



            if getattr(att, "thumbnail_url", None):



                try:



                    await oss_service.delete_object_by_url(att.thumbnail_url, bucket_type="private")



                except Exception as e:



                    logger.warning("删除梦境附件缩略图 OSS 失败 dream_id=%s: %s", dream_id, e)







        await self.db.delete(dream)



        await self.db.commit()


    async def delete_all_dreams(
        self,
        user_id: uuid.UUID,
    ) -> None:
        """
        一键删除当前用户所有梦境及其相关资源。

        不返回数量。
        """
        from app.services.oss_service import get_oss_service

        stmt = (
            select(Dream)
            .where(
                Dream.user_id == user_id,
                Dream.deleted_at.is_(None),
            )
            .options(selectinload(Dream.attachments))
        )

        result = await self.db.execute(stmt)
        dreams = result.scalars().all()
        if not dreams:
            return

        oss_service = get_oss_service()
        # 先删除 OSS 上的附件文件 + 缩略图
        for dream in dreams:
            for att in dream.attachments or []:
                try:
                    ok = await oss_service.delete_object_by_url(att.file_url, bucket_type="private")
                    if not ok:
                        logger.warning(
                            "删除梦境附件 OSS 文件失败(返回 False) dream_id=%s url=%s",
                            dream.id,
                            getattr(att, "file_url", ""),
                        )
                except Exception as e:
                    # 理论上 delete_object_by_url 内部不会抛异常，但这里兜底记录
                    logger.warning(
                        "删除梦境附件 OSS 文件失败 dream_id=%s url=%s: %s",
                        dream.id,
                        getattr(att, "file_url", ""),
                        e,
                    )

                if getattr(att, "thumbnail_url", None):
                    try:
                        ok = await oss_service.delete_object_by_url(
                            att.thumbnail_url, bucket_type="private"
                        )
                        if not ok:
                            logger.warning(
                                "删除梦境附件缩略图 OSS 失败(返回 False) dream_id=%s url=%s",
                                dream.id,
                                att.thumbnail_url,
                            )
                    except Exception as e:
                        logger.warning(
                            "删除梦境附件缩略图 OSS 失败 dream_id=%s: %s",
                            dream.id,
                            e,
                        )

        # 然后批量硬删除梦境记录（依赖数据库级联清理关联表）
        await self.db.execute(
            Dream.__table__.delete().where(
                Dream.user_id == user_id,
                Dream.deleted_at.is_(None),
            )
        )
        await self.db.commit()
        return







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







    async def increment_view_count(



        self,



        dream_id: uuid.UUID,



        user_id: uuid.UUID,



    ) -> int:



        """增加浏览次数并返回最新计数"""



        dream = await self._get_dream_or_404(dream_id, user_id)



        dream.view_count += 1



        await self.db.commit()



        await self.db.refresh(dream)



        return dream.view_count







    async def add_reflection_answer(



        self,



        dream_id: uuid.UUID,



        user_id: uuid.UUID,



        question: str,



        answer: str,



    ) -> Dream:



        """为梦境添加一条反思回答，并返回包含完整关联数据的 Dream"""



        # 先确保梦境存在（但此处不依赖关系加载）



        dream = await self._get_dream_or_404(dream_id, user_id)







        # 通过独立查询获取 / 创建 insight，避免因未预加载关系而重复插入（触发 dream_id 唯一约束）



        stmt = select(DreamInsight).where(DreamInsight.dream_id == dream.id)



        result = await self.db.execute(stmt)



        insight = result.scalar_one_or_none()



        if not insight:



            insight = DreamInsight(dream_id=dream.id)



            self.db.add(insight)



            await self.db.flush()







        # 允许用户多次编辑同一问题的回答：按 question 去重，后写入的覆盖之前的回答



        answers = list(insight.reflection_answers or [])



        updated = False



        for item in answers:



            if isinstance(item, dict) and item.get("question") == question:



                item["answer"] = answer



                updated = True



                break



        if not updated:



            answers.append({"question": question, "answer": answer})



        insight.reflection_answers = answers



        # 明确标记 JSONB 字段已修改，确保 SQLAlchemy 发出 UPDATE



        flag_modified(insight, "reflection_answers")







        await self.db.commit()



        # 使用统一的 get_dream 方法重新加载，带上 insight 等关联，避免后续访问触发懒加载（MissingGreenlet）



        return await self.get_dream(dream_id, user_id)







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







    async def _upsert_insight(



        self,



        dream_id: uuid.UUID,



        life_context: str | None,



        user_interpretation: str | None,



    ) -> DreamInsight | None:



        """创建或更新 insight，返回 insight 对象"""



        stmt = select(DreamInsight).where(DreamInsight.dream_id == dream_id)



        result = await self.db.execute(stmt)



        insight = result.scalar_one_or_none()







        if insight:



            if life_context is not None:



                insight.life_context = life_context



            if user_interpretation is not None:



                insight.user_interpretation = user_interpretation



        else:



            insight = DreamInsight(



                dream_id=dream_id,



                life_context=life_context,



                user_interpretation=user_interpretation,



            )



            self.db.add(insight)



        



        return insight







    async def _generate_and_save_embedding(self, dream: Dream, insight: DreamInsight | None = None, force: bool = False) -> None:



        """生成并保存梦境的 embedding（服务方法，调用独立函数）"""



        await _generate_embedding_for_dream(self.db, dream, insight, force)







    async def _mark_embedding_for_update(self, dream_id: uuid.UUID) -> None:



        """标记 embedding 需要更新（不阻塞，后台任务会异步处理）"""



        try:



            embedding_stmt = select(DreamEmbedding).where(DreamEmbedding.dream_id == dream_id)



            embedding_result = await self.db.execute(embedding_stmt)



            existing_embedding = embedding_result.scalar_one_or_none()



            



            if existing_embedding:



                existing_embedding.needs_update = True



                logger.info(f"已标记梦境 {dream_id} 的 embedding 需要更新")



            else:



                # 如果不存在 embedding，立即创建（创建时总是立即生成）



                # 这种情况不应该发生，因为创建时已经生成了



                logger.warning(f"梦境 {dream_id} 没有 embedding，但尝试标记更新")



        except Exception as e:



            logger.warning(f"标记 embedding 更新失败: {e}")







    async def _compute_and_save_similar_dreams(self, dream_id: uuid.UUID, user_id: uuid.UUID) -> None:



        """计算相似梦境并落库（基于 embedding，不依赖 AI 分析）。失败不阻断主流程。"""



        try:



            from app.services.similarity_service import (



                create_similar_dream_relations,



                find_similar_dreams,



            )



            similar_dreams = await find_similar_dreams(



                self.db, dream_id=dream_id, user_id=user_id, limit=5, threshold=None



            )



            if similar_dreams:



                await create_similar_dream_relations(self.db, dream_id, similar_dreams)



                logger.info(f"梦境 {dream_id} 相似梦境已计算并落库，共 {len(similar_dreams)} 条")



        except Exception as e:



            logger.warning(f"相似梦境计算失败（不影响创建）: {e}")







    # ========== 标签管理 ==========







    async def get_user_tags(self, user_id: uuid.UUID) -> list[Tag]:



        """获取用户所有标签"""



        stmt = select(Tag).where(Tag.user_id == user_id).order_by(Tag.created_at.desc())



        result = await self.db.execute(stmt)



        return list(result.scalars().all())







    async def create_tag(self, user_id: uuid.UUID, request: CreateTagRequest) -> Tag:



        """创建标签"""



        tag = Tag(user_id=user_id, name=request.name)



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



        """获取梦境 AI 分析状态（两阶段分析不再按单任务记录，仅返回梦境级状态）"""



        dream = await self._get_dream_or_404(dream_id, user_id)



        return {



            "dream_id": dream.id,



            "ai_processed": dream.ai_processed,



            "ai_processing_status": dream.ai_processing_status.value if dream.ai_processing_status else "PENDING",



            "ai_processed_at": dream.ai_processed_at,



            "tasks": [],



        }







    # ========== 附件管理 ==========







    async def create_attachment(



        self,



        dream_id: uuid.UUID,



        user_id: uuid.UUID,



        file_url: str,



        attachment_type: str,



        file_size: int | None = None,



        mime_type: str | None = None,



        duration: int | None = None,



    ) -> "DreamAttachment":



        """创建附件记录"""



        from app.models.dream_attachment import DreamAttachment



        from app.models.enums import AttachmentType, StorageBucket







        await self._get_dream_or_404(dream_id, user_id)







        att = DreamAttachment(



            dream_id=dream_id,



            attachment_type=AttachmentType(attachment_type),



            file_url=file_url,



            file_size=file_size,



            mime_type=mime_type,



            duration=duration,



            storage_bucket=StorageBucket.PRIVATE,



        )



        self.db.add(att)



        await self.db.commit()



        await self.db.refresh(att)



        return att







    async def delete_attachment(



        self,



        dream_id: uuid.UUID,



        attachment_id: uuid.UUID,



        user_id: uuid.UUID,



    ) -> None:



        """删除附件 (含 OSS 文件)"""



        from app.models.dream_attachment import DreamAttachment



        from app.services.oss_service import get_oss_service







        await self._get_dream_or_404(dream_id, user_id)







        stmt = select(DreamAttachment).where(



            DreamAttachment.id == attachment_id,



            DreamAttachment.dream_id == dream_id,



        )



        result = await self.db.execute(stmt)



        att = result.scalar_one_or_none()



        if not att:



            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="附件不存在")







        # 梦境附件在 private bucket，需指定 bucket_type



        await get_oss_service().delete_object_by_url(att.file_url, bucket_type="private")







        await self.db.delete(att)



        await self.db.commit()











async def _generate_embedding_for_dream(



    db: AsyncSession,



    dream: Dream,



    insight: DreamInsight | None = None,



    force: bool = False,



) -> None:



    """



    生成并保存梦境的 embedding（独立函数，可在任务中使用）



    



    Args:



        db: 数据库会话



        dream: 梦境对象



        insight: 洞察对象（可选）



        force: 是否强制更新（即使已存在）



    """



    try:



        from app.config.ai_models import MODELS



        from app.services.ai_service import ai_service



        from sqlalchemy import select, text



        



        # 检查是否已存在 embedding



        embedding_stmt = select(DreamEmbedding).where(DreamEmbedding.dream_id == dream.id)



        embedding_result = await db.execute(embedding_stmt)



        existing_embedding = embedding_result.scalar_one_or_none()



        



        # 如果已存在且不强制更新，跳过



        if existing_embedding and not force and not existing_embedding.needs_update:



            logger.debug(f"梦境 {dream.id} 已有 embedding 且无需更新")



            return



        



        # 格式化用于 embedding 的文本（只包含用户输入的原始数据）



        content_text = _format_dream_content_for_embedding(dream, insight)



        



        if not content_text.strip():



            logger.warning(f"梦境 {dream.id} 没有可用的内容用于生成 embedding")



            return



        



        # 生成 embedding



        embedding_vector = await ai_service.generate_embedding(content_text)



        



        if existing_embedding:



            # 更新现有 embedding



            vector_str = "[" + ",".join(str(float(v)) for v in embedding_vector) + "]"



            await db.execute(



                text(



                    "UPDATE dream_embeddings SET content_embedding = CAST(:vector AS vector), embedding_model = :model, generated_at = NOW(), needs_update = FALSE WHERE id = :id"



                ),



                {"vector": vector_str, "model": MODELS["embedding"], "id": existing_embedding.id},



            )



            logger.info(f"已更新梦境 {dream.id} 的 embedding")



        else:



            # 创建新的 embedding



            new_embedding = DreamEmbedding(



                dream_id=dream.id,



                embedding_model=MODELS["embedding"],



                needs_update=False,



            )



            db.add(new_embedding)



            await db.flush()



            



            # 使用原生 SQL 插入 vector



            vector_str = "[" + ",".join(str(float(v)) for v in embedding_vector) + "]"



            await db.execute(



                text(



                    "UPDATE dream_embeddings SET content_embedding = CAST(:vector AS vector) WHERE id = :id"



                ),



                {"vector": vector_str, "id": new_embedding.id},



            )



            logger.info(f"已生成并保存梦境 {dream.id} 的 embedding")



        



        await db.flush()



    except Exception as e:



        logger.warning(f"生成 embedding 失败（不影响主流程）: {e}")




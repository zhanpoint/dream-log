"""
梦境探索业务逻辑
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exploration import ExplorationArticle, ExplorationSymbol


class ExplorationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_symbols(
        self,
        *,
        category: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ExplorationSymbol], int]:
        query = select(ExplorationSymbol)

        if category:
            query = query.where(ExplorationSymbol.category == category)

        if search:
            query = query.where(
                ExplorationSymbol.name.ilike(f"%{search}%")
                | ExplorationSymbol.search_text.ilike(f"%{search}%")
            )

        count_q = select(func.count()).select_from(query.subquery())
        total: int = (await self.db.execute(count_q)).scalar_one()

        query = (
            query.order_by(ExplorationSymbol.category, ExplorationSymbol.name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = (await self.db.execute(query)).scalars().all()
        return list(rows), total

    async def get_symbol_by_slug(self, slug: str) -> ExplorationSymbol | None:
        q = select(ExplorationSymbol).where(ExplorationSymbol.slug == slug)
        return (await self.db.execute(q)).scalar_one_or_none()

    async def get_categories(self) -> list[str]:
        q = (
            select(ExplorationSymbol.category)
            .distinct()
            .order_by(ExplorationSymbol.category)
        )
        rows = (await self.db.execute(q)).scalars().all()
        return list(rows)

    async def get_articles(self, module: str) -> list[ExplorationArticle]:
        q = (
            select(ExplorationArticle)
            .where(ExplorationArticle.module == module)
            .order_by(ExplorationArticle.order_index)
        )
        return list((await self.db.execute(q)).scalars().all())

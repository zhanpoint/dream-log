"""
梦境探索 API 路由
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.exploration import (
    ArticleListResponse,
    ArticleResponse,
    SymbolListResponse,
    SymbolListItem,
    SymbolResponse,
)
from app.services.exploration_service import ExplorationService

router = APIRouter(prefix="/exploration", tags=["梦境探索"])

VALID_MODULES = {"science", "nightmare", "improvement", "lucid", "psychology", "phenomena"}


@router.get("/symbols/categories", response_model=list[str])
async def get_categories(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[str]:
    """获取所有符号分类"""
    service = ExplorationService(db)
    return await service.get_categories()


@router.get("/symbols", response_model=SymbolListResponse)
async def list_symbols(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    category: str | None = Query(None, description="分类过滤"),
    search: str | None = Query(None, description="搜索关键词"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> SymbolListResponse:
    """获取符号列表（支持分类过滤和搜索）"""
    service = ExplorationService(db)
    items, total = await service.get_symbols(
        category=category, search=search, page=page, page_size=page_size
    )
    return SymbolListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[SymbolListItem.model_validate(item) for item in items],
    )


@router.get("/symbols/{slug}", response_model=SymbolResponse)
async def get_symbol(
    slug: str,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SymbolResponse:
    """获取符号详情"""
    service = ExplorationService(db)
    symbol = await service.get_symbol_by_slug(slug)
    if not symbol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="符号不存在")
    return SymbolResponse.model_validate(symbol)


@router.get("/articles/{module}", response_model=ArticleListResponse)
async def get_articles(
    module: str,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ArticleListResponse:
    """获取文章列表（science/nightmare/improvement）"""
    if module not in VALID_MODULES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"module 必须是 {VALID_MODULES} 之一",
        )
    service = ExplorationService(db)
    articles = await service.get_articles(module)
    return ArticleListResponse(
        module=module,
        items=[ArticleResponse.model_validate(a) for a in articles],
    )

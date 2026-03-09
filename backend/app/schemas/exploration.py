"""
梦境探索 Pydantic 响应模型
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class SymbolCoreMeaning(BaseModel):
    headline: str
    description: str


class SymbolScenario(BaseModel):
    scenario: str
    meaning: str


class SymbolContent(BaseModel):
    core_meaning: SymbolCoreMeaning
    personal_connection: str
    common_scenarios: list[SymbolScenario]
    self_reflection_questions: list[str]
    emotion_associations: list[str]
    why_you_dream_this: str
    related_symbols: list[str]


class SymbolResponse(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    category: str
    content: SymbolContent
    created_at: datetime

    model_config = {"from_attributes": True}


class SymbolListItem(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    category: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SymbolListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[SymbolListItem]


class ArticleResponse(BaseModel):
    id: uuid.UUID
    module: str
    section: str
    order_index: int
    content: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class ArticleListResponse(BaseModel):
    module: str
    items: list[ArticleResponse]

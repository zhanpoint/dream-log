"""
将 batch_generate.py 生成的 symbols_output.json 导入 PostgreSQL

使用方法（在 backend 根目录）：
    python scripts/symbols/import_symbols.py

说明：
    - 重复运行安全（已存在的 slug 会更新内容，不会重复插入）
    - 自动从 content 中提取 search_text 用于搜索
"""

import asyncio
import json
import re
import sys
from pathlib import Path

# backend 根目录加入 Python 路径（scripts/symbols/xxx.py -> 上两级）
_BACKEND_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.exploration import ExplorationSymbol

SCRIPT_DIR = Path(__file__).parent
# JSON 资源统一放在 backend/src/explorer（scripts 目录不再保留 JSON）
OUTPUT_FILE = _BACKEND_ROOT / "src" / "explorer" / "symbols" / "symbols_output.json"


def extract_search_text(content: dict) -> str:
    """从结构化内容中提取可搜索的文本"""
    parts: list[str] = []
    cm = content.get("core_meaning", {})
    parts.append(cm.get("headline", ""))
    parts.append(cm.get("description", ""))
    parts.append(content.get("personal_connection", ""))
    for s in content.get("common_scenarios", []):
        parts.append(s.get("scenario", ""))
        parts.append(s.get("meaning", ""))
    parts.extend(content.get("emotion_associations", []))
    parts.extend(content.get("related_symbols", []))
    return " ".join(p for p in parts if p)


def make_slug(name: str, existing_slug: str | None = None) -> str:
    """优先使用 AI 生成的 slug，否则用中文名做 fallback"""
    if existing_slug and re.match(r"^[a-z0-9_-]+$", existing_slug):
        return existing_slug
    import hashlib
    return "sym_" + hashlib.md5(name.encode()).hexdigest()[:8]


async def import_symbols() -> None:
    if not OUTPUT_FILE.exists():
        print(f"错误：找不到 {OUTPUT_FILE}，请先运行 scripts/symbols/batch_generate.py")
        return

    with open(OUTPUT_FILE, encoding="utf-8") as f:
        records: list[dict] = json.load(f)

    print(f"加载 {len(records)} 条记录，开始导入...")

    engine = create_async_engine(str(settings.database_url), echo=False)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    inserted = 0
    updated = 0
    errors = 0

    async with session_maker() as session:
        for record in records:
            try:
                name: str = record.get("name", "").strip()
                category: str = record.get("category", "未分类").strip()
                content: dict = record.get("content", {})
                raw_slug: str = record.get("slug", "")
                slug = make_slug(name, raw_slug)

                if not name or not content:
                    print(f"  跳过无效记录: {record}")
                    continue

                search_text = extract_search_text(content)

                existing = (
                    await session.execute(
                        select(ExplorationSymbol).where(ExplorationSymbol.slug == slug)
                    )
                ).scalar_one_or_none()

                if existing:
                    existing.name = name
                    existing.category = category
                    existing.content = content
                    existing.search_text = search_text
                    updated += 1
                else:
                    session.add(
                        ExplorationSymbol(
                            slug=slug,
                            name=name,
                            category=category,
                            content=content,
                            search_text=search_text,
                        )
                    )
                    inserted += 1

            except Exception as e:
                print(f"  ✗ 导入失败 [{record.get('name')}]: {e}")
                errors += 1

        await session.commit()

    await engine.dispose()
    print(f"\n完成！新增 {inserted} 条，更新 {updated} 条，失败 {errors} 条")


if __name__ == "__main__":
    asyncio.run(import_symbols())

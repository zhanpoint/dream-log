"""
将 articles_input.json 中的文章批量导入 PostgreSQL exploration_articles 表

使用方法（在 backend 根目录）：
    python scripts/articles/import_articles.py

说明：
    - 重复运行安全（已存在的 module+section 组合会更新内容，不会重复插入）
    - articles_input.json 为18篇文章的 JSON 数组，由 GPT/Claude 生成后手动合并
    - 每条记录必须包含：module, section, order_index, content

JSON 格式示例：
    [
      {
        "module": "science",
        "section": "我们为什么做梦？",
        "order_index": 1,
        "content": {
          "title": "我们为什么做梦？",
          "body": "正文第一段。\\n\\n正文第二段。",
          "expandable": true,
          "source_note": "基于睡眠科学研究整合"
        }
      }
    ]
"""

import asyncio
import json
import sys
from pathlib import Path

# backend 根目录加入 Python 路径（scripts/articles/xxx.py -> 上两级）
_BACKEND_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.exploration import ExplorationArticle

SCRIPT_DIR = Path(__file__).parent
# 默认读取 src/explorer/articles/all_articles_optimized.json，仍然支持通过命令行参数覆盖
DEFAULT_INPUT_FILE = _BACKEND_ROOT / "src" / "explorer" / "articles" / "all_articles_optimized.json"
INPUT_FILE = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT_FILE

VALID_MODULES = {"science", "nightmare", "improvement", "lucid", "psychology", "phenomena"}


def validate_record(record: dict, idx: int) -> str | None:
    """校验单条记录，返回错误信息或 None"""
    module = record.get("module", "")
    section = record.get("section", "")
    order_index = record.get("order_index")
    content = record.get("content", {})

    if module not in VALID_MODULES:
        return f"记录[{idx}] module 无效: '{module}'，必须为 science/nightmare/improvement"
    if not section or not isinstance(section, str):
        return f"记录[{idx}] section 不能为空"
    if not isinstance(order_index, int) or order_index < 1:
        return f"记录[{idx}] order_index 必须为正整数"
    if not content or not isinstance(content, dict):
        return f"记录[{idx}] content 不能为空"
    if not content.get("body"):
        return f"记录[{idx}] content.body 不能为空"
    return None


async def import_articles() -> None:
    if not INPUT_FILE.exists():
        print(f"错误：找不到 {INPUT_FILE}")
        print("请先完成 Perplexity + GPT 整合步骤，将18篇文章合并保存到该文件")
        return

    with open(INPUT_FILE, encoding="utf-8") as f:
        records: list[dict] = json.load(f)

    if not isinstance(records, list):
        print("错误：articles_input.json 必须是 JSON 数组")
        return

    print(f"加载 {len(records)} 条记录，开始校验...")

    # 预先校验所有记录
    errors = []
    for idx, record in enumerate(records, 1):
        err = validate_record(record, idx)
        if err:
            errors.append(err)

    if errors:
        print("\n校验失败，发现以下错误：")
        for err in errors:
            print(f"  ✗ {err}")
        print("\n请修正 articles_input.json 后重新运行")
        return

    print(f"校验通过，开始导入...")

    engine = create_async_engine(str(settings.database_url), echo=False)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    inserted = 0
    updated = 0
    failed = 0

    async with session_maker() as session:
        for record in records:
            try:
                module: str = record["module"]
                section: str = record["section"].strip()
                order_index: int = record["order_index"]
                content: dict = record["content"]

                # 确保 expandable 字段存在，默认 true
                content.setdefault("expandable", True)

                existing = (
                    await session.execute(
                        select(ExplorationArticle).where(
                            ExplorationArticle.module == module,
                            ExplorationArticle.section == section,
                        )
                    )
                ).scalar_one_or_none()

                if existing:
                    existing.order_index = order_index
                    existing.content = content
                    updated += 1
                    print(f"  [U] 更新 [{module}] {section}")
                else:
                    session.add(
                        ExplorationArticle(
                            module=module,
                            section=section,
                            order_index=order_index,
                            content=content,
                        )
                    )
                    inserted += 1
                    print(f"  [+] 新增 [{module}] {section}")

            except Exception as e:
                print(f"  [!] 导入失败 [{record.get('module')}] {record.get('section')}: {e}")
                failed += 1

        await session.commit()

    await engine.dispose()

    print(f"\n完成！新增 {inserted} 条，更新 {updated} 条，失败 {failed} 条")

    if inserted + updated > 0:
        print("\n各模块文章数量：")
        by_module: dict[str, int] = {}
        for record in records:
            m = record.get("module", "unknown")
            by_module[m] = by_module.get(m, 0) + 1
        for module, count in sorted(by_module.items()):
            label = {"science": "梦境科学基础", "nightmare": "噩梦应对指南", "improvement": "梦境改善指南"}.get(module, module)
            print(f"  {label} ({module}): {count} 篇")


if __name__ == "__main__":
    asyncio.run(import_articles())

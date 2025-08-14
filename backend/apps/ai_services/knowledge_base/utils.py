"""
知识库工具函数集合
"""
from typing import List, Optional
import logging

from ..prompts.knowledge_base_search_prompts import DreamSearchCategory

logger = logging.getLogger(__name__)


def convert_category_names_to_enums(categories: Optional[List[str]]) -> Optional[List[DreamSearchCategory]]:
    """
    将字符串类别名称转换为 DreamSearchCategory 枚举列表（大小写不敏感）。

    未识别的类别将被忽略并记录警告。传入 None 或空列表将返回 None。
    """
    if not categories:
        return None

    category_map = {
        "symbols": DreamSearchCategory.SYMBOLS,
        "psychology": DreamSearchCategory.PSYCHOLOGY,
        "science": DreamSearchCategory.SCIENCE,
        "interpretation": DreamSearchCategory.INTERPRETATION,
    }

    enums: List[DreamSearchCategory] = []
    for cat in categories:
        key = (cat or "").strip().lower()
        if key in category_map:
            enums.append(category_map[key])
        else:
            logger.warning(f"Unknown category name ignored: {cat}")

    return enums if enums else None



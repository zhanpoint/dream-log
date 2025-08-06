import logging
from typing import Optional

from ..chains.generate_dream_title import title_generation_chain

logger = logging.getLogger(__name__)

# 定义可复用的错误消息
ERROR_SERVICE_UNAVAILABLE = "抱歉，AI服务当前不可用，请稍后再试。"

def _clean_title(title: str) -> str:
    """清理LLM生成的标题，移除多余的引号和空格。"""
    title = title.strip()
    if title.startswith('"') and title.endswith('"'):
        title = title[1:-1]
    if title.startswith("'") and title.endswith("'"):
        title = title[1:-1]
    return title.strip()

def generate_dream_title(dream_content: str) -> Optional[str]:
    """
    根据梦境内容生成标题。

    Args:
        dream_content: 梦境内容文本。

    Returns:
        生成的标题，如果失败则返回None。
    """
    if not title_generation_chain:
        logger.error("Title generation chain is not available.")
        return None

    try:
        # 使用链生成标题
        generated_title = title_generation_chain.invoke({
            "dream_content": dream_content
        })

        if not generated_title:
            logger.warning("AI returned an empty or null title.")
            return None

        cleaned_title = _clean_title(generated_title)

        # 验证标题长度
        if 5 <= len(cleaned_title) <= 30:
            logger.info(f"Successfully generated title: {cleaned_title}")
            return cleaned_title
        else:
            logger.warning(
                f"Generated title has invalid length ({len(cleaned_title)}): '{cleaned_title}'. "
                f"Returning as is, but this might indicate a model issue."
            )
            return cleaned_title[:30] # 强制截断

    except Exception as e:
        logger.error(f"Error invoking title generation chain: {e}", exc_info=True)
        return None


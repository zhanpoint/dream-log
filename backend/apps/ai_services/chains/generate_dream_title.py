"""
梦境标题生成链
基于梦境内容生成合适的标题
"""
import logging
from typing import Optional

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import Runnable

from ..config import get_llm

logger = logging.getLogger(__name__)

# 优化的中文提示模板
TITLE_GENERATION_PROMPT_TEMPLATE = """
作为一名资深的解梦专家和富有创意的作家，请为以下梦境内容生成一个引人入胜且简洁的标题。

**核心指令:**
1.  **精准捕捉核心**: 标题需精准捕捉梦境的核心主题、最突出的象征或最强烈的情感。
2.  **创意与意象**: 使用生动、富有想象力的语言，可以带有一点诗意或神秘感，但要避免晦涩难懂。
3.  **简洁有力**: 标题长度严格控制在 5 到 15 个汉字之间。
4.  **格式要求**: 最终只返回生成的标题文本，不要包含任何额外的说明、引号或标签（例如 "标题："）。

**梦境内容:**
{dream_content}

**生成的标题:**
""".strip()


def create_title_generation_chain() -> Optional[Runnable]:
    """
    创建并返回一个用于生成梦境标题的LangChain链。

    遵循LangChain v0.2+的最佳实践，将链的创建过程封装在工厂函数中。
    这提高了可测试性、可维护性，并支持更灵活的链组合。

    Returns:
        一个可执行的Runnable实例，如果初始化失败则返回None。
    """
    try:
        llm = get_llm()
        if not llm:
            logger.error("LLM not available, cannot create title generation chain.")
            return None

        prompt = PromptTemplate.from_template(TITLE_GENERATION_PROMPT_TEMPLATE)
        
        # 定义链：输入 -> 提示 -> LLM -> 输出解析器
        chain = (
            prompt
            | llm
            | StrOutputParser()
        )
        
        logger.info("Title generation chain created successfully.")
        return chain

    except Exception as e:
        logger.error(f"Error creating title generation chain: {e}", exc_info=True)
        return None

# 全局的链实例，延迟加载
title_generation_chain = create_title_generation_chain()

"""
梦境标题生成链
基于梦境内容生成合适的标题
"""
import logging
from typing import Optional

from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import Runnable

from ..config import get_title_generation_llm
from ..prompts.title_generation_prompts import TitleGenerationPrompts

logger = logging.getLogger(__name__)


def create_title_generation_chain() -> Optional[Runnable]:
    """
    创建并返回一个用于生成梦境标题的LangChain链。

    Returns:
        一个可执行的Runnable实例，如果初始化失败则返回None。
    """
    try:
        llm = get_title_generation_llm()  # 使用标题生成专用LLM
        if not llm:
            logger.error("LLM not available, cannot create title generation chain.")
            return None

        # 从prompts模块获取提示词模板
        prompt = TitleGenerationPrompts.create_title_generation_prompt()
        
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

# 全局的链实例，延迟加载（避免模块在导入时就创建链）
title_generation_chain = None


def get_title_generation_chain() -> Optional[Runnable]:
    """获取标题生成链实例（单例模式）"""
    global title_generation_chain
    if title_generation_chain is None:
        title_generation_chain = create_title_generation_chain()
    return title_generation_chain
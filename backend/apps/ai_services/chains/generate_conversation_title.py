"""
对话标题生成链
基于对话内容生成合适的标题
"""
import logging
from typing import Optional

from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import Runnable

from ..config import get_conversation_title_llm
from ..prompts.conversation_title_prompts import ConversationTitlePrompts

logger = logging.getLogger(__name__)


def create_conversation_title_generation_chain() -> Optional[Runnable]:
    """
    创建并返回一个用于生成对话标题的LangChain链。

    Returns:
        一个可执行的Runnable实例，如果初始化失败则返回None。
    """
    try:
        llm = get_conversation_title_llm()  # 使用对话标题生成专用LLM
        if not llm:
            logger.error("Conversation title LLM not available, cannot create conversation title generation chain.")
            return None

        # 从prompts模块获取提示词模板
        prompt = ConversationTitlePrompts.create_conversation_title_prompt()
        
        # 定义链：输入 -> 提示 -> LLM -> 输出解析器
        chain = (
            prompt
            | llm
            | StrOutputParser()
        )
        
        logger.info("Conversation title generation chain created successfully.")
        return chain

    except Exception as e:
        logger.error(f"Error creating conversation title generation chain: {e}", exc_info=True)
        return None

# 全局的链实例，延迟加载（避免模块在导入时就创建链）
conversation_title_generation_chain = None


def get_conversation_title_generation_chain() -> Optional[Runnable]:
    """获取对话标题生成链实例（单例模式）"""
    global conversation_title_generation_chain
    if conversation_title_generation_chain is None:
        conversation_title_generation_chain = create_conversation_title_generation_chain()
    return conversation_title_generation_chain

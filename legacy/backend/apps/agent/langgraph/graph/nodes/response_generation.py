"""
通用处理节点
==========

处理非专业知识类意图，使用LLM综合用户输入、工具结果、记忆上下文等信息，生成最终的用户响应。
根据不同的意图类型采用相应的响应策略，确保回复的专业性和个性化。
"""

import logging
from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, AIMessage
from apps.agent.langgraph.config import get_response_generation_llm
from apps.agent.langgraph.graph.state import DreamAssistantState
from apps.agent.langgraph.prompts.response_generation import RESPONSE_GENERATION_PROMPT
from apps.agent.langgraph.memory import lang_memory_manager
from .utils import format_tool_results, get_latest_message

logger = logging.getLogger(__name__)


async def _save_general_memory(state: DreamAssistantState, user_input: str, ai_response: str):
    """
    保存通用处理的情景记忆
    
    优化策略：存储智能摘要而非原文，提高存储效率和检索精度
    
    Args:
        state: Agent状态
        user_input: 用户输入
        ai_response: AI响应
    """
    try:
        user_session = state.get("user_session")
        user_id = user_session.get("user_id")
        
        # 生成智能摘要而非存储原文
        query_summary = _extract_query_essence(user_input)
        response_summary = _extract_response_key_points(ai_response)
        
        # 存储结构化摘要
        conversation_summary = f"询问要点: {query_summary}\n回复要点: {response_summary}"
        
        await lang_memory_manager.save_episodic_memory(
            user_id=user_id,
            conversation_summary=conversation_summary,
            metadata={
                "session_id": user_session.get("session_id"),
                "thread_id": user_session.get("thread_id"),
                "interaction_type": "general_conversation",
                "query_category": _classify_query_type(user_input),
                "response_type": _classify_response_type(ai_response)
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to save general memory: {e}", exc_info=True)


def _extract_query_essence(query_text: str, max_length: int = 80) -> str:
    """
    从用户询问中提取核心要点
    
    Args:
        query_text: 原始询问文本
        max_length: 摘要最大长度
        
    Returns:
        str: 询问核心要点
    """
    # 移除常见的客套话
    cleaned_query = query_text.replace("请问", "").replace("你好", "").replace("谢谢", "").strip()
    
    if len(cleaned_query) <= max_length:
        return cleaned_query
    
    # 查找问号位置，优先保留完整问题
    question_end = cleaned_query.find('？')
    if question_end != -1 and question_end <= max_length:
        return cleaned_query[:question_end + 1]
    
    # 截取并寻找合适的截断点
    truncated = cleaned_query[:max_length]
    last_punctuation = max(
        truncated.rfind('。'), 
        truncated.rfind('，'), 
        truncated.rfind('；')
    )
    
    if last_punctuation > max_length * 0.6:
        return truncated[:last_punctuation + 1]
    else:
        return truncated + "..."


def _extract_response_key_points(response_text: str, max_length: int = 120) -> str:
    """
    从AI回复中提取关键要点
    
    Args:
        response_text: 原始回复文本
        max_length: 摘要最大长度
        
    Returns:
        str: 回复关键要点
    """
    # 查找关键信息句子（包含重要信息的标志词）
    key_indicators = ["重要的是", "建议", "需要注意", "可以", "应该", "因为", "所以", "总结"]
    key_sentences = []
    
    sentences = response_text.split('。')
    for sentence in sentences:
        sentence = sentence.strip()
        if sentence and any(indicator in sentence for indicator in key_indicators):
            key_sentences.append(sentence)
            if len('。'.join(key_sentences)) >= max_length:
                break
    
    if key_sentences:
        result = '。'.join(key_sentences)
        return result if len(result) <= max_length else result[:max_length] + "..."
    else:
        # 如果没有找到关键句，返回前半部分
        return _extract_query_essence(response_text, max_length)


def _classify_query_type(query_text: str) -> str:
    """
    分类询问类型，用于后续检索优化
    
    Args:
        query_text: 询问文本
        
    Returns:
        str: 询问类型
    """
    if any(word in query_text for word in ["梦", "做梦", "梦到", "梦见"]):
        return "dream_related"
    elif any(word in query_text for word in ["睡眠", "失眠", "睡觉", "睡不着"]):
        return "sleep_related"
    elif any(word in query_text for word in ["心理", "情绪", "压力", "焦虑", "抑郁"]):
        return "psychological"
    elif any(word in query_text for word in ["健康", "身体", "医学"]):
        return "health_related"
    elif "？" in query_text or "什么" in query_text or "如何" in query_text:
        return "knowledge_query"
    else:
        return "general_chat"


def _classify_response_type(response_text: str) -> str:
    """
    分类回复类型，用于后续检索优化
    
    Args:
        response_text: 回复文本
        
    Returns:
        str: 回复类型
    """
    if any(word in response_text for word in ["建议", "推荐", "应该", "可以尝试"]):
        return "advice_giving"
    elif any(word in response_text for word in ["解释", "因为", "原因", "机制"]):
        return "explanation"
    elif any(word in response_text for word in ["安慰", "理解", "支持", "正常"]):
        return "emotional_support"
    elif any(word in response_text for word in ["专业", "医生", "咨询", "治疗"]):
        return "professional_guidance"
    else:
        return "general_response"


async def general_processing_node(state: DreamAssistantState) -> Dict[str, Any]:
    """
    通用处理节点 - 处理各种用户询问并生成回复
    
    Args:
        state: 当前Agent状态
        
    Returns:
        Dict[str, Any]: 更新后的状态信息
    """
    try:
        # 获取用户输入
        user_input = get_latest_message(state["messages"], "user")
        if not user_input:
            return {
                "current_step": "error",
                "error_context": {
                    "error_type": "no_user_input",
                    "message": "未找到用户输入"
                }
            }
        
        # 检索记忆上下文，用于生成个性化回复
        user_session = state.get("user_session")
        user_id = user_session.get("user_id")
        memory_context = await lang_memory_manager.get_memory_context(user_id, user_input)
        
        # 格式化工具调用结果
        tool_results = state.get("tool_results", [])
        tool_results_summary = format_tool_results(tool_results)
        
        # 获取LLM并构建提示词
        llm = get_response_generation_llm()
        prompt = RESPONSE_GENERATION_PROMPT.format(
            latest_user_input=user_input,
            tool_results_summary=tool_results_summary,
            memory_context=memory_context
        )
        
        # 调用LLM生成响应
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        generated_response = response.content
        
        # 创建AI消息
        ai_message = AIMessage(content=generated_response)
        
        # 保存对话记忆
        await _save_general_memory(state, user_input, generated_response)
        
        return {
            "messages": [ai_message],
            "current_step": "general_processing_completed"
        }
        
    except Exception as e:
        logger.error(f"Error in general processing node: {e}", exc_info=True)
        return {
            "current_step": "error",
            "error_context": {
                "error_type": "general_processing_error",
                "message": f"通用处理失败: {str(e)}"
            }
        }

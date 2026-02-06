"""
专业知识节点
===========

专门处理梦境解释意图(DREAM_INTERPRETATION)，整合工具调用结果，
提供专业的梦境心理学分析和建议。
"""

import logging
from typing import Dict, Any
from langchain_core.messages import HumanMessage, AIMessage
from apps.agent.langgraph.graph.state import DreamAssistantState
from apps.agent.langgraph.config import get_expert_knowledge_llm
from apps.agent.langgraph.prompts import DREAM_ANALYSIS_PROMPT
from apps.agent.langgraph.memory import lang_memory_manager
from .utils import format_tool_results, get_latest_message

logger = logging.getLogger(__name__)


async def _save_expert_memory(state: DreamAssistantState, user_dream: str, dream_analysis: str):
    """
    保存专业知识分析的情景记忆
    
    优化策略：存储智能摘要而非原文，提高存储效率和检索精度
    
    Args:
        state: Agent状态
        user_dream: 用户梦境描述
        dream_analysis: AI梦境分析结果
    """
    try:
        user_session = state.get("user_session")
        user_id = user_session.get("user_id")
        
        # 生成智能摘要而非存储原文
        dream_summary = _extract_dream_keywords(user_dream)
        analysis_insights = _extract_analysis_insights(dream_analysis)
        
        # 存储结构化摘要
        conversation_summary = f"梦境要素: {dream_summary}\n核心见解: {analysis_insights}"
        
        await lang_memory_manager.save_episodic_memory(
            user_id=user_id,
            conversation_summary=conversation_summary,
            metadata={
                "session_id": user_session.get("session_id"),
                "thread_id": user_session.get("thread_id"),
                "interaction_type": "dream_interpretation",
                "dream_keywords": dream_summary.split("，")[:5],  # 提取前5个关键词
                "analysis_category": _classify_analysis_type(dream_analysis)
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to save expert memory: {e}", exc_info=True)


def _extract_dream_keywords(dream_text: str, max_length: int = 100) -> str:
    """
    从梦境描述中提取关键要素
    
    Args:
        dream_text: 原始梦境描述
        max_length: 摘要最大长度
        
    Returns:
        str: 梦境关键要素摘要
    """
    # 简化版关键词提取，生产环境可使用NLP库进一步优化
    if len(dream_text) <= max_length:
        return dream_text
    
    # 截取前半部分并寻找合适的截断点
    truncated = dream_text[:max_length]
    last_punctuation = max(
        truncated.rfind('。'), 
        truncated.rfind('，'), 
        truncated.rfind('；')
    )
    
    if last_punctuation > max_length * 0.7:  # 如果标点位置合理
        return truncated[:last_punctuation + 1]
    else:
        return truncated + "..."


def _extract_analysis_insights(analysis_text: str, max_length: int = 150) -> str:
    """
    从分析结果中提取核心见解
    
    Args:
        analysis_text: 原始分析文本
        max_length: 摘要最大长度
        
    Returns:
        str: 核心见解摘要
    """
    # 查找关键分析段落（包含"象征"、"反映"、"建议"等关键词）
    key_phrases = ["象征着", "反映了", "建议", "表明", "暗示"]
    insights = []
    
    sentences = analysis_text.split('。')
    for sentence in sentences:
        if any(phrase in sentence for phrase in key_phrases):
            insights.append(sentence.strip())
            if len('。'.join(insights)) >= max_length:
                break
    
    if insights:
        result = '。'.join(insights)
        return result if len(result) <= max_length else result[:max_length] + "..."
    else:
        # 如果没有找到关键句，返回前半部分
        return _extract_dream_keywords(analysis_text, max_length)


def _classify_analysis_type(analysis_text: str) -> str:
    """
    分类分析类型，用于后续检索优化
    
    Args:
        analysis_text: 分析文本
        
    Returns:
        str: 分析类型
    """
    if "弗洛伊德" in analysis_text or "潜意识" in analysis_text:
        return "psychoanalytic"
    elif "荣格" in analysis_text or "原型" in analysis_text:
        return "analytical_psychology"
    elif "认知" in analysis_text or "神经" in analysis_text:
        return "cognitive_neuroscience"
    elif "象征" in analysis_text:
        return "symbolic_interpretation"
    else:
        return "general_analysis"


async def expert_knowledge_node(state: DreamAssistantState) -> Dict[str, Any]:
    """
    专业知识节点 - 使用LLM进行专业梦境解释分析
    
    Args:
        state: 当前Agent状态
        
    Returns:
        Dict[str, Any]: 更新后的状态信息
    """
    try:
        # 获取用户梦境描述
        user_dream = get_latest_message(state["messages"], "user")
        if not user_dream:
            return {
                "current_step": "error",
                "error_context": {
                    "error_type": "no_user_input",
                    "message": "未找到用户梦境描述"
                }
            }
        
        # 检索记忆上下文，用于生成个性化梦境解释
        user_session = state.get("user_session")
        user_id = user_session.get("user_id")
        memory_context = await lang_memory_manager.get_memory_context(user_id, user_dream)
        
        # 格式化工具调用结果
        tool_results = state.get("tool_results", [])
        tool_results_text = format_tool_results(tool_results)
        
        # 获取专业知识LLM并进行梦境分析
        llm = get_expert_knowledge_llm()
        prompt = DREAM_ANALYSIS_PROMPT.format(
            user_dream=user_dream,
            tool_results=tool_results_text,
            memory_context=memory_context
        )
        
        # 调用LLM进行专业梦境分析
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        dream_analysis = response.content
        
        # 创建AI分析消息
        analysis_message = AIMessage(content=dream_analysis)
        
        # 保存对话记忆（专业知识节点是生成最终回答的节点）
        await _save_expert_memory(state, user_dream, dream_analysis)
        
        return {
            "messages": [analysis_message],
            "current_step": "expert_knowledge_completed"
        }
        
    except Exception as e:
        logger.error(f"Error in expert knowledge node: {e}", exc_info=True)
        return {
            "current_step": "error",
            "error_context": {
                "error_type": "expert_knowledge_error",
                "message": f"专业知识分析失败: {str(e)}"
            }
        }

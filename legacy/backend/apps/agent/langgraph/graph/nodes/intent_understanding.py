"""
意图理解节点
==========

使用LLM识别和分析用户的意图类型，为后续节点提供明确的意图指导。
支持多种意图类型的识别，确保Agent能够准确理解用户需求。
"""

import logging
from typing import Dict, Any, List, Optional, Literal
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage
from apps.agent.langgraph.config import get_intent_analysis_llm
from apps.agent.langgraph.graph.state import DreamAssistantState
from apps.agent.langgraph.prompts.intent_understanding import INTENT_ANALYSIS_PROMPT
from apps.agent.langgraph.tools import get_tool_registry
from .utils import get_latest_message

logger = logging.getLogger(__name__)


class ToolCallModel(BaseModel):
    """工具调用的数据结构"""
    name: str
    args: Dict[str, Any] = Field(default_factory=dict)


class IntentAnalysisResultModel(BaseModel):
    """意图分析结果的结构化输出模型"""
    all_intents: List[str] = Field(default_factory=list)
    execution_plan: Literal["sequential", "parallel"] = "sequential"
    needs_tools: bool = False
    tool_calls: List[ToolCallModel] = Field(default_factory=list)

class IntentType:
    """意图类型常量"""
    GENERAL_CHAT = "general_chat"                   # 一般聊天
    DREAM_INTERPRETATION = "dream_interpretation"   # 梦境解读
    KNOWLEDGE_QUERY = "knowledge_query"             # 知识问答
    EMOTIONAL_SUPPORT = "emotional_support"         # 情感支持
    SLEEP_ADVICE = "sleep_advice"                   # 睡眠建议
    HEALTH_CONSULTATION = "health_consultation"     # 健康咨询
    PHILOSOPHICAL_DISCUSSION = "philosophical_discussion"  # 哲学讨论




async def intent_understanding_node(state: DreamAssistantState) -> Dict[str, Any]:
    """
    意图理解节点 - 分析用户输入的意图类型并检索相关记忆
    
    Args:
        state: 当前Agent状态
        
    Returns:
        Dict[str, Any]: 更新后的状态信息
    """
    try:
        # 获取最新的用户消息
        user_input = get_latest_message(state["messages"], "user")
        if not user_input:
            return {
                "current_step": "error",
                "error_context": {
                    "error_type": "no_user_message", 
                    "message": "未找到用户消息"
                }
            }
        
        # 获取LLM和工具信息
        llm = get_intent_analysis_llm()
        tool_registry = get_tool_registry()
        available_tools = tool_registry.format_tools_for_llm()
        
        # 构建提示词并调用LLM
        prompt = INTENT_ANALYSIS_PROMPT.format(
            user_input=user_input,
            available_tools=available_tools
        )
        
        structured_llm = llm.with_structured_output(IntentAnalysisResultModel)
        structured = await structured_llm.ainvoke([HumanMessage(content=prompt)])
        
        # 转换为字典格式
        if hasattr(structured, "model_dump"):
            intent_result = structured.model_dump()
        else:
            intent_result = structured.dict()
        
        logger.info(f"Intent analysis completed: {intent_result.get('all_intents', [])}")
        
        return {
            "current_step": "intent_understood", 
            "intent_result": intent_result
        }
        
    except Exception as e:
        logger.error(f"Error in intent understanding: {e}", exc_info=True)
        return {
            "current_step": "error",
            "error_context": {
                "error_type": "intent_analysis_error",
                "message": f"意图分析失败: {str(e)}"
            }
        }
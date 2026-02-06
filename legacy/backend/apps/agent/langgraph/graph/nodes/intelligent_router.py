"""
智能路由器节点
====================

根据意图分析结果决定工作流的下一步流向。
"""

import logging
from typing import Dict, Any
from apps.agent.langgraph.graph.state import DreamAssistantState
from apps.agent.langgraph.graph.nodes.intent_understanding import IntentType

logger = logging.getLogger(__name__)

async def intelligent_router_node(state: DreamAssistantState) -> Dict[str, Any]:
    """
    智能路由器节点 - 基于LLM工具发现的路由决策
    
    1. 基于意图理解中的工具调用决策进行路由
    2. 如果需要工具 → 工具调度节点
    3. 如果需要专业知识 → 专业知识节点  
    4. 否则 → 响应生成节点
    
    Args:
        state: 当前Agent状态
        
    Returns:
        Dict[str, Any]: 更新后的状态信息
    """
    try:
        intent_result = state.get("intent_result", {})
        needs_tools = intent_result.get("needs_tools", False)
        
        # 智能路由逻辑：工具调度、专业知识或通用处理
        if needs_tools:
            next_node = "tool_dispatch"
        else:
            # 判断是否需要专业知识
            all_intents = set(intent_result.get("all_intents", []))
            if IntentType.DREAM_INTERPRETATION in all_intents:
                next_node = "expert_knowledge"
            else:
                next_node = "general_processing"
        
        return {
            "current_step": "routing_completed",
            "next_node": next_node
        }
        
    except Exception as e:
        logger.error(f"Error in intelligent router: {e}", exc_info=True)
        return {
            "current_step": "error",
            "error_context": {
                "error_type": "routing_error",
                "message": f"智能路由失败: {str(e)}"
            }
        }

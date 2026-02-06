"""
响应决策节点 (ReAct模式)
==============================

实现ReAct模式的决策逻辑：
- 快速判断Agent是否已经回答了用户的问题，决定直接输出答案还是循环回意图理解节点
"""

import logging
from typing import Dict, Any, Literal
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from apps.agent.langgraph.graph.state import DreamAssistantState
from apps.agent.langgraph.config import get_completion_check_llm
from apps.agent.langgraph.prompts.response_decision import RESPONSE_DECISION_PROMPT
from apps.agent.langgraph.graph.nodes.utils import get_latest_message

logger = logging.getLogger(__name__)


class ResponseDecisionModel(BaseModel):
    """响应决策结果的结构化输出模型"""
    decision: Literal["end", "continue"]


async def response_decision_node(state: DreamAssistantState) -> Dict[str, Any]:
    """
    响应决策节点 - ReAct模式的简化决策逻辑
    
    快速判断Agent是否已经回答了用户的问题，决定是直接结束还是继续循环。
    
    Args:
        state: 当前Agent状态
        
    Returns:
        Dict[str, Any]: 更新后的状态信息
    """
    try:
        user_input = get_latest_message(state["messages"], "user")
        current_response = get_latest_message(state["messages"], "ai")
        
        if not user_input or not current_response:
            return {
                "current_step": "error",
                "error_context": {
                    "error_type": "missing_messages",
                    "message": "未找到用户输入或AI回答"
                }
            }
        
        # 获取循环计数
        cycle_count = state.get("react_decision", {}).get("cycle_count", 0)
        
        # 防止无限循环 - 最多循环2次
        if cycle_count >= 2:
            logger.info(f"达到最大循环次数({cycle_count})，强制结束")
            return {
                "current_step": "completed",
                "react_decision": {"decision": "end", "cycle_count": cycle_count + 1}
            }
        
        # 构建决策提示词
        prompt = RESPONSE_DECISION_PROMPT.format(
            user_input=user_input,
            current_response=current_response
        )

        llm = get_completion_check_llm()
        
        # 使用结构化输出
        structured_llm = llm.with_structured_output(ResponseDecisionModel)
        decision_result = await structured_llm.ainvoke([HumanMessage(content=prompt)])
        
        # 获取决策结果
        decision = decision_result.decision
        
        # 根据决策设置下一步
        current_step = "completed" if decision == "end" else "continue_cycle"
        
        return {
            "current_step": current_step,
            "react_decision": {"decision": decision, "cycle_count": cycle_count + 1}
        }
        
    except Exception as e:
        logger.error(f"Error in response decision: {e}", exc_info=True)
        return {
            "current_step": "error",
            "error_context": {
                "error_type": "response_decision_error",
                "message": f"响应决策失败: {str(e)}"
            }
        }
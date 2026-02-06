"""
工具调度节点
===========

执行意图理解节点返回的 tool_calls，支持并行和顺序执行模式。
保留精简的占位符执行器与并发/串行执行函数。
"""

import logging
import asyncio
from typing import Dict, Any, List
from apps.agent.langgraph.graph.state import DreamAssistantState

logger = logging.getLogger(__name__)

async def execute_tool(tool_name: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    执行标准 LangChain 工具
    
    Args:
        tool_name: 工具名称
        context: 工具执行上下文
        
    Returns:
        Dict[str, Any]: 工具执行结果
    """
    from apps.agent.langgraph.tools import get_tool_registry
    
    # 获取工具参数 - 标准 LangChain 格式
    tool_calls = context.get("tool_calls", [])
    tool_params = {}
    for tool_call in tool_calls:
        if tool_call.get("name") == tool_name:
            tool_params = tool_call.get("args", {})
            break
    
    # 获取工具注册表
    registry = get_tool_registry()
    tool_instance = registry.get_tool_by_name(tool_name)
    
    if tool_instance is None:
        return {
            "tool_name": tool_name,
            "status": "error",
            "error": f"工具 {tool_name} 未注册",
            "timestamp": asyncio.get_event_loop().time()
        }
    
    result = await tool_instance.ainvoke(tool_params)
    
    return {
        "tool_name": tool_name,
        "status": "success",
        "result": str(result),
        "timestamp": asyncio.get_event_loop().time()
    }


async def execute_tools_sequential(tools: List[str], context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """顺序执行工具列表"""
    results = []
    for tool_name in tools:
        result = await execute_tool(tool_name, context)
        results.append(result)
    return results


async def execute_tools_parallel(tools: List[str], context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """并行执行工具列表"""
    if not tools:
        return []
    
    tasks = [execute_tool(tool_name, context) for tool_name in tools]
    results = await asyncio.gather(*tasks)
    return results


async def tool_dispatch_node(state: DreamAssistantState) -> Dict[str, Any]:
    """工具调度节点"""
    try:
        intent_result = state.get("intent_result", {})
        tool_calls = intent_result.get("tool_calls", [])
        execution_plan = intent_result.get("execution_plan", "sequential")
        
        if not tool_calls:
            return {
                "current_step": "tool_dispatch_completed",
                "tool_results": []
            }
        
        # 提取工具名称列表，确保数据格式一致
        tools_list = []
        for tool_call in tool_calls:
            if isinstance(tool_call, dict) and tool_call.get("name"):
                tools_list.append(tool_call["name"])
        
        tool_context = {"tool_calls": tool_calls}
        
        if execution_plan == "parallel":
            tool_results = await execute_tools_parallel(tools_list, tool_context)
        else:
            tool_results = await execute_tools_sequential(tools_list, tool_context)
        
        return {
            "current_step": "tool_dispatch_completed",
            "tool_results": tool_results
        }
        
    except Exception as e:
        logger.error(f"Error in tool dispatch: {e}", exc_info=True)
        return {
            "current_step": "error",
            "error_context": {
                "error_type": "tool_dispatch_error",
                "message": f"工具调度失败: {str(e)}"
            }
        }

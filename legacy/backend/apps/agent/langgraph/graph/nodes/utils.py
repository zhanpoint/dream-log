"""
节点工具函数
===========

提供节点间公共的工具函数，避免代码重复。
"""

from typing import List, Dict, Any, Optional
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage


def format_tool_results(tool_results: List[Dict[str, Any]]) -> str:
    """
    格式化工具调用结果为文本
    
    Args:
        tool_results: 工具调用结果列表
        
    Returns:
        str: 格式化后的文本
    """
    if not tool_results:
        return "无工具调用结果"
    
    results = []
    for result in tool_results:
        tool_name = result.get("tool_name", "未知工具")
        tool_output = str(result.get("result", "无结果"))
        results.append(f"{tool_name}: {tool_output}")
    
    return "\n".join(results)


def get_latest_message(messages: List[BaseMessage], message_type: str) -> Optional[str]:
    """
    高效获取最后一条指定类型的消息内容
    从后往前遍历，直接找到最后一条指定类型的消息
    
    Args:
        messages: 消息列表
        message_type: 消息类型，"user" 或 "ai"
        
    Returns:
        Optional[str]: 最后一条指定类型消息内容，如果没有返回None
    """
    if not messages:
        return None
        
    # 根据消息类型选择对应的类
    target_class = HumanMessage if message_type == "user" else AIMessage
        
    # 从后往前遍历，找到第一个指定类型的消息
    for message in reversed(messages):
        if isinstance(message, target_class):
            return message.content
    
    return None

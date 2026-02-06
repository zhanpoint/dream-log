"""
LangGraph 梦境助手 Agent 状态定义
=================================

本模块定义了梦境助手对话式Agent的核心状态结构。
使用 TypedDict + Annotated 类型注解实现状态管理约简。

这是一个全能对话助手，专精于梦境、心理学、神经科学、生物医学、睡眠科学、哲学等领域，
类似ChatGPT但专注于特定领域的知识和服务。

状态设计原则：
1. 使用内置状态归约器Reducer避免状态污染
2. 支持通用对话和专业知识问答
3. 集成短期和长期记忆管理
4. 提供完整的上下文追踪
5. 保持状态结构的通用性和可扩展性

会话标识符说明：
==============

session_id vs thread_id 的区别和作用场景：

1. session_id (会话ID)：
   - 定义：标识用户的一次浏览器会话
   - 生命周期：从用户打开网页到关闭网页/标签页
   - 作用范围：应用层面的会话管理
   - 主要用途：
     * 会话超时管理
     * 并发会话控制
     * 会话级别的统计分析
     * 临时状态存储（如购物车）

2. thread_id (线程ID)：
   - 定义：LangGraph专用的对话线程标识符
   - 生命周期：可以跨越多个session，持久化存储
   - 作用范围：LangGraph记忆系统和检查点存储
   - 主要用途：
     * 检查点(Checkpoint)存储和恢复
     * 长期对话记忆管理
     * 时间旅行功能（回到对话历史状态）
     * 跨会话的对话连续性
   - 示例：68d14ec0

使用场景对比：
============

场景1：用户关闭浏览器重新打开
- session_id：会改变（新的浏览器会话）
- thread_id：保持不变（继续之前的对话）
- 结果：Agent能记住之前的对话内容和上下文

场景2：同一用户在不同设备上登录
- session_id：不同（不同设备的会话）
- thread_id：可以相同（同一对话线程）
- 结果：在任何设备上都能继续同一个对话

场景3：用户开始全新的对话主题
- session_id：可能相同（同一浏览器会话）
- thread_id：应该不同（新的对话线程）
- 结果：Agent不会混淆不同主题的对话内容

最佳实践：
==========

1. 统一线程ID格式：
   - 所有对话线程都使用统一的短UUID格式
   - 格式：68d14ec0（8位）
   - 简洁易读，确保全局唯一性

2. 对话管理：
   - 每个新对话自动生成独立的thread_id
   - 前端存储对话列表和对应的thread_id
   - 用户切换对话时使用相应的thread_id

3. 前端实现建议：
   - 对话列表存储：{id, title, thread_id, created_at}
   - 新建对话：调用 generate_thread_id()
   - 切换对话：使用对应的thread_id配置LangGraph
"""

from typing import TypedDict, Annotated, Any, Optional, List, Dict
from datetime import datetime
import uuid
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


def merge_tool_results(existing: List[Dict[str, Any]], new: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    自定义工具结果合并去重状态归约器
    
    Args:
        existing: 现有的工具调用结果
        new: 新的工具调用结果
        
    Returns:
        List[Dict[str, Any]]: 合并去重后的工具结果列表
    """
    combined = (existing or []) + (new or [])
    
    # 去重处理，基于工具名称和时间戳
    unique_results = []
    seen_keys = set()
    
    for result in reversed(combined):  # 从最新的开始处理
        key = f"{result.get('tool_name')}_{result.get('timestamp')}"
        if key not in seen_keys:
            unique_results.insert(0, result)
            seen_keys.add(key)
    
    # 保留最近的50条工具调用结果
    return unique_results[-50:]


def generate_thread_id() -> str:
    """
    生成新的对话线程ID
    
    为每个新对话生成独立的thread_id，使用统一的短UUID格式。
    
    Returns:
        str: 短UUID格式的线程ID
        
    Examples:
        generate_thread_id()
        # -> "68d14ec0"
    """
    # 生成短UUID格式：8位
    full_uuid = uuid.uuid4().hex
    return f"{full_uuid[:8]}"


def generate_session_id() -> str:
    """
    生成会话ID
    
    为每个新的浏览器会话生成独立的session_id。
    用于会话管理、超时控制和统计分析。
    
    Returns:
        str: 12位短UUID格式的会话ID
        
    Examples:
        generate_session_id()
        # -> "68d14ec0a7b2"
    """
    # 生成短UUID格式：12位（避免冲突）
    full_uuid = uuid.uuid4().hex
    return f"{full_uuid[:12]}"


class DreamAssistantState(TypedDict):
    """
    梦境助手Agent状态定义

    Attributes:
        messages: 对话消息历史，使用LangGraph内置状态归约器自动管理
        user_session: 用户会话信息，包含用户ID、会话ID等
        tool_results: 工具调用结果列表，记录所有工具调用的输出
        current_step: 当前处理步骤，用于控制对话流程
        intent_result: 意图分析结果，包含用户意图和执行计划
        error_context: 错误上下文，用于错误处理和恢复
        next_node: 下一个要执行的节点名称
        next_action: 下一步执行的行动类型
    """
    
    # 核心对话状态 - 使用内置状态归约器管理消息历史
    # 当多个节点更新messages时，add_messages reducer会自动将新消息追加到列表末尾而非覆盖
    messages: Annotated[List[BaseMessage], add_messages]
    
    # 用户会话信息 - 存储用户相关的会话数据
    user_session: Dict[str, Any]
    
    # 工具调用结果 - 记录所有工具调用的历史和结果
    # 基于 tool_name + timestamp 进行去重，保留最近50条工具调用结果，防止重复执行和状态污染
    tool_results: Annotated[List[Dict[str, Any]], merge_tool_results]
    
    # 当前处理步骤 - 控制对话流程和状态转换
    current_step: str
    
    # 意图分析结果 - 存储用户意图识别和执行计划
    intent_result: Optional[Dict[str, Any]]
    
    # 错误上下文 - 错误处理和恢复信息
    error_context: Optional[Dict[str, Any]]
    
    # === 智能路由系统状态字段 ===
    
    # 下一个节点 - 智能路由器决定的下一个执行节点
    next_node: Optional[str]
    
    # 下一步行动 - 工作流的下一步行动类型
    next_action: Optional[str]
        
    # ReAct决策结果
    react_decision: Optional[Dict[str, Any]]


# 状态初始化工厂函数
def create_initial_state(
    user_id: str, 
    session_id: str, 
    thread_id: Optional[str] = None
) -> DreamAssistantState:
    """
    创建初始的梦境助手状态
    
    Args:
        user_id: 用户唯一标识
        session_id: 会话唯一标识  
        thread_id: 线程唯一标识，用于记忆管理
        
    Returns:
        DreamAssistantState: 初始化的状态对象
    """
    return DreamAssistantState(
        # 对话消息列表初始化为空
        # 所有的用户输入和助手回复都会存储在这里
        messages=[],
        
        # 用户会话信息字典 - 存储会话相关的关键标识和统计
        user_session={
            # 用户唯一标识符 - 用于识别不同用户，关联用户的长期记忆和偏好
            "user_id": user_id,
            
            # 会话唯一标识符 - 标识用户的一次具体会话（如打开网页到关闭网页）
            "session_id": session_id,
            
            # 线程唯一标识符 - LangGraph专用，用于检查点存储和记忆管理
            # 可以跨越多个session，用于持久化对话状态和实现时间旅行功能
            "thread_id": thread_id if thread_id else generate_thread_id(),
            
            # 会话开始时间 - ISO格式时间戳，用于会话时长统计和超时处理
            "start_time": datetime.now().isoformat(),
            
            # 交互次数计数器 - 记录用户在当前会话中的交互次数，用于统计和限流
            "interaction_count": 0
        },
        
        # 工具调用结果列表初始化为空
        # 记录所有工具调用的历史和结果，支持工具调用去重和历史追踪
        tool_results=[],
        
        # 当前处理步骤 - 控制对话流程状态机
        # 初始状态为"greeting"，表示准备进行问候
        current_step="greeting",
        
        # 意图分析结果 - 存储用户意图识别和执行计划
        intent_result=None,
        
        # 错误上下文初始化为None  
        # 在发生错误时会记录错误信息，用于错误恢复和调试
        error_context=None,
        
        # === 智能路由系统状态初始化 ===
        
        # 下一个节点初始化为None
        # 将由智能路由器动态决定
        next_node=None,
        
        # 下一步行动初始化为None
        # 将在完成度检查后设置
        next_action=None,
        
        # === ReAct模式状态初始化 ===
        
        # ReAct决策结果初始化为None
        # 将在响应决策节点中设置
        react_decision=None
    )


# 状态验证函数
def validate_state(state: DreamAssistantState) -> bool:
    """
    验证状态对象的完整性和有效性
    
    Args:
        state: 待验证的状态对象
        
    Returns:
        bool: 验证结果，True表示状态有效
    """
    # 检查核心必需字段
    required_fields = [
        "messages", "user_session", "tool_results", "current_step"
    ]
    
    for field in required_fields:
        if field not in state:
            return False
    
    # 检查所有状态字段是否存在（可以为None）
    all_state_fields = [
        "messages", "user_session", "tool_results", "current_step", 
        "intent_result", "error_context",
        "next_node", "next_action", "react_decision"
    ]
    
    for field in all_state_fields:
        if field not in state:
            return False
    
    # 检查用户会话信息的完整性
    user_session = state.get("user_session", {})
    if not isinstance(user_session, dict):
        return False
        
    required_session_fields = ["user_id", "session_id", "thread_id"]
    for field in required_session_fields:
        if field not in user_session:
            return False
    
    # 检查当前步骤的有效性
    valid_steps = [
        "greeting", "listening", "thinking", "responding", 
        "tool_calling", "waiting", "error", "completed",
        # 智能路由系统步骤
        "intent_understood", "routing_completed", 
        "tool_dispatch_completed", "expert_knowledge_completed",
        # ReAct模式步骤
        "general_processing_completed", "continue_cycle"
    ]
    current_step = state.get("current_step")
    if current_step not in valid_steps:
        return False
    
    # 检查messages字段类型
    messages = state.get("messages", [])
    if not isinstance(messages, list):
        return False
    
    # 检查tool_results字段类型
    tool_results = state.get("tool_results", [])
    if not isinstance(tool_results, list):
        return False
        
    return True


# 导出主要组件
__all__ = [
    "DreamAssistantState",
    "create_initial_state", 
    "validate_state",
    "merge_tool_results",
    "generate_thread_id",
    "generate_session_id"
]

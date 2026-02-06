"""
梦境助手智能路由图构建器
========================

使用LangGraph StateGraph API构建完整的梦境助手Agent工作流。
实现智能路由器 + 功能节点模式，支持动态路由和条件分支执行。

图结构：
用户输入 -> 意图理解 -> 智能路由 -> [工具调度 | 专业知识 | 通用处理] -> 响应决策 -> 结束
"""

import logging
from langgraph import StateGraph, END
from langgraph.graph import CompiledGraph
from apps.agent.langgraph.graph.state import DreamAssistantState
from apps.agent.langgraph.graph.nodes import (
    intent_understanding_node,
    intelligent_router_node, 
    tool_dispatch_node,
    expert_knowledge_node,
    general_processing_node,
    response_decision_node
)
from apps.agent.langgraph.memory import memory_manager

logger = logging.getLogger(__name__)


def route_after_intent_understanding(state: DreamAssistantState) -> str:
    """意图理解后的路由决策"""
    current_step = state.get("current_step", "")
    
    if current_step == "intent_understood":
        return "intelligent_router"
    elif current_step == "error":
        return "general_processing"  # 错误时直接通用处理
    else:
        logger.warning(f"Unexpected step after intent understanding: {current_step}")
        return "general_processing"  # 默认通用处理更安全


def route_after_intelligent_router(state: DreamAssistantState) -> str:
    """智能路由后的路径决策"""
    current_step = state.get("current_step", "")
    
    # 检查错误状态
    if current_step == "error":
        return "general_processing"
    
    next_node = state.get("next_node")
    
    if next_node in ["tool_dispatch", "expert_knowledge", "general_processing"]:
        return next_node
    else:
        logger.warning(f"Invalid next_node from router: {next_node}")
        return "general_processing"


def route_after_tool_dispatch(state: DreamAssistantState) -> str:
    """工具调度后的路由决策"""
    current_step = state.get("current_step", "")
    
    if current_step == "tool_dispatch_completed":
        # 工具调用完成后，判断是否需要专业知识处理
        intent_result = state.get("intent_result", {})
        all_intents = set(intent_result.get("all_intents", []))
        
        if "dream_interpretation" in all_intents:
            return "expert_knowledge"
        else:
            return "general_processing"
    elif current_step == "error":
        return "general_processing"  # 错误时直接通用处理
    else:
        logger.warning(f"Unexpected step after tool dispatch: {current_step}")
        return "general_processing"


def route_after_expert_knowledge(state: DreamAssistantState) -> str:
    """专业知识分析后的路由决策 - 直接到响应决策"""
    current_step = state.get("current_step", "")
    
    if current_step == "expert_knowledge_completed":
        return "response_decision"
    elif current_step == "error":
        return "response_decision"
    else:
        logger.warning(f"Unexpected step after expert knowledge: {current_step}")
        return "response_decision"


def route_after_general_processing(state: DreamAssistantState) -> str:
    """通用处理后的路由决策 - ReAct模式"""
    current_step = state.get("current_step", "")
    
    if current_step == "general_processing_completed":
        return "response_decision"
    elif current_step == "error":
        return "response_decision"  # 即使有错误也要进行决策
    else:
        logger.warning(f"Unexpected step after general processing: {current_step}")
        return "response_decision"


def route_after_response_decision(state: DreamAssistantState) -> str:
    """响应决策后的路由决策 - ReAct模式核心循环"""
    current_step = state.get("current_step", "")
    
    # 检查错误状态 - 直接结束
    if current_step == "error":
        logger.info("Ending flow due to error in response decision")
        return END
    
    react_decision = state.get("react_decision", {})
    decision = react_decision.get("decision", "end")
    
    if decision == "continue":
        # 继续循环，回到意图理解进行优化
        return "intent_understanding"
    elif decision == "end":
        # 结束流程
        return END
    else:
        logger.warning(f"Unexpected decision: {decision}")
        return END


def build_dream_assistant_graph() -> CompiledGraph:
    """
    构建梦境助手智能路由工作流图 (ReAct模式)
    
    使用StateGraph API实现ReAct (Reasoning and Acting) 模式：
    
    ReAct路由逻辑：
    1. 意图理解节点 - 分析用户意图和需求
    2. 智能路由节点 - 阶段1判断：是否需要工具？
       - 需要工具 → 工具调度节点
       - 不需要工具 → 阶段2判断：是否需要专业知识？
    3. 工具调度节点 - 调用相关工具
       - 工具调用完成 → 阶段2判断：是否需要专业知识？
    4. 专业知识节点 - 专业分析处理（DREAM_INTERPRETATION意图）
    5. 通用处理节点 - 处理其他意图类型的通用回复生成
    6. 响应决策节点 - ReAct核心决策：
       - 回答质量满意 → 结束流程
       - 需要优化改进 → 回到意图理解节点继续循环
    
    ReAct特性：
    - 支持多轮推理-行动循环
    - 自主质量评估和决策
    - 防止无限循环（最多3轮）
    - 持续优化回答质量
    
    Returns:
        CompiledGraph: 编译后的ReAct工作流图
    """
    try:
        # 创建状态图
        workflow = StateGraph(DreamAssistantState)
        
        # 添加核心处理节点
        workflow.add_node("intent_understanding", intent_understanding_node)
        workflow.add_node("intelligent_router", intelligent_router_node)
        workflow.add_node("tool_dispatch", tool_dispatch_node)  
        workflow.add_node("expert_knowledge", expert_knowledge_node)
        workflow.add_node("general_processing", general_processing_node)
        workflow.add_node("response_decision", response_decision_node)
        
        # 设置工作流入口点
        workflow.set_entry_point("intent_understanding")
        
        # === 配置条件边实现智能路由 ===
        
        # 1. 意图理解 -> 智能路由器 (或错误处理)
        workflow.add_conditional_edges(
            "intent_understanding",
            route_after_intent_understanding,
            {
                "intelligent_router": "intelligent_router",
                "general_processing": "general_processing"
            }
        )
        
        # 2. 智能路由器 -> 动态选择下一个节点
        workflow.add_conditional_edges(
            "intelligent_router", 
            route_after_intelligent_router,
            {
                "tool_dispatch": "tool_dispatch",
                "expert_knowledge": "expert_knowledge", 
                "general_processing": "general_processing"
            }
        )
        
        # 3. 工具调度 -> 阶段2判断专业知识需求 (或错误处理)
        workflow.add_conditional_edges(
            "tool_dispatch",
            route_after_tool_dispatch,
            {
                "expert_knowledge": "expert_knowledge",  # 需要专业知识处理
                "general_processing": "general_processing"  # 通用处理
            }
        )
        
        # 4. 专业知识 -> 响应决策 (直接路由)
        workflow.add_conditional_edges(
            "expert_knowledge",
            route_after_expert_knowledge,
            {
                "response_decision": "response_decision"
            }
        )
        
        # 5. 通用处理 -> 响应决策 (ReAct模式)
        workflow.add_conditional_edges(
            "general_processing",
            route_after_general_processing,
            {
                "response_decision": "response_decision"
            }
        )
        
        # 6. 响应决策 -> 继续循环或结束 (ReAct模式核心)
        workflow.add_conditional_edges(
            "response_decision",
            route_after_response_decision,
            {
                "intent_understanding": "intent_understanding",  # 继续循环优化
                END: END  # 结束流程
            }
        )
        
        # 获取记忆系统组件
        checkpointer = memory_manager.get_checkpointer()
        store = memory_manager.get_store()
        
        # 编译工作流图，集成记忆系统
        compiled_graph = workflow.compile(
            checkpointer=checkpointer,
            store=store
        )
        
        logger.info("Dream Assistant Graph compiled with memory system")
        return compiled_graph
        
    except Exception as e:
        logger.error(f"Failed to build Dream Assistant Graph: {e}", exc_info=True)
        raise RuntimeError(f"图构建失败: {str(e)}")


def validate_graph_structure(graph: CompiledGraph) -> bool:
    """
    验证图结构的完整性
    
    Args:
        graph: 已编译的工作流图
        
    Returns:
        bool: 验证结果
    """
    try:
        # 检查图是否包含所有必需的节点
        required_nodes = {
            "intent_understanding", "intelligent_router", "tool_dispatch", 
            "expert_knowledge", "general_processing", "response_decision"
        }
        
        # 这里可以添加更多的图结构验证逻辑
        # 暂时返回True，等待LangGraph提供更多验证API
        
        return True
        
    except Exception as e:
        logger.error(f"Graph validation failed: {e}")
        return False


# 创建全局图实例
try:
    DREAM_ASSISTANT_GRAPH = build_dream_assistant_graph()
except Exception as e:
    logger.error(f"Failed to create global graph instance: {e}")
    DREAM_ASSISTANT_GRAPH = None


def get_dream_assistant_graph() -> CompiledGraph:
    """
    获取梦境助手图实例
    
    Returns:
        CompiledGraph: 已编译的工作流图
        
    Raises:
        RuntimeError: 如果图未正确初始化
    """
    if DREAM_ASSISTANT_GRAPH is None:
        raise RuntimeError("梦境助手图未正确初始化")
    
    return DREAM_ASSISTANT_GRAPH


# 导出主要组件
__all__ = [
    "build_dream_assistant_graph",
    "get_dream_assistant_graph", 
    "validate_graph_structure",
    "DREAM_ASSISTANT_GRAPH"
]

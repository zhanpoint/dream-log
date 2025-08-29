"""
梦境助手 Orchestrator - 核心调度节点
负责分析用户意图并调度到相应的处理流程
"""
import logging
from typing import Dict, Any
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.messages import HumanMessage

from ..graph.dream_assistant_state import DreamAssistantState, UserIntent
from ..config import get_intent_analysis_llm
from ..prompts.dream_assistant_prompts import prompt_manager

logger = logging.getLogger(__name__)


class DreamAssistantOrchestrator:
    """梦境助手调度器"""
    
    def __init__(self):
        self.llm = get_intent_analysis_llm()
        self.parser = PydanticOutputParser(pydantic_object=UserIntent)
    
    def analyze_intent(self, state: DreamAssistantState) -> UserIntent:
        """分析用户意图"""
        try:
            # 构建对话历史字符串
            chat_history = ""
            for msg in state["messages"][-10:]:  # 只取最近10条消息
                role = "用户" if isinstance(msg, HumanMessage) else "助手"
                chat_history += f"{role}: {msg.content}\n"
            
            # 使用统一的提示词管理器
            prompt_text = prompt_manager.format_prompt(
                "intent_analysis",
                user_input=state["user_input"],
                chat_context=chat_history
            )
            
            prompt_value = [HumanMessage(content=prompt_text)]
            
            result = self.llm.invoke(prompt_value)
            intent = self.parser.parse(result.content)
            
            logger.info(f"用户意图分析结果: {intent.intent_type} (置信度: {intent.confidence})")
            return intent
            
        except Exception as e:
            logger.error(f"意图分析失败: {e}")
            # 返回默认意图
            return UserIntent(
                intent_type="casual_chat",
                confidence=0.5,
                keywords=[],
                context="意图分析失败，使用默认处理"
            )
    
    def __call__(self, state: DreamAssistantState) -> Dict[str, Any]:
        """Orchestrator 节点的主要逻辑"""
        logger.info(f"Orchestrator 开始处理，用户输入: {state['user_input'][:100]}...")
        
        # 检查是否是新的处理开始，确保重新分析意图
        is_fresh_start = state.get("workspace", {}).get("fresh_start", False)
        existing_intent = state.get("user_intent")
        
        # 如果是新开始或没有现有意图，重新分析
        if is_fresh_start or not existing_intent:
            logger.info("重新分析用户意图...")
            intent = self.analyze_intent(state)
            state["user_intent"] = intent
            
            # 清除fresh_start标记，避免重复处理
            if "workspace" in state:
                state["workspace"]["fresh_start"] = False
        else:
            # 使用现有意图（用于多轮对话中的后续处理）
            intent = existing_intent
            logger.info(f"使用现有意图: {intent.intent_type}")
        
        # 根据意图决定下一个节点
        next_node = self._decide_next_node(intent, state)
        state["next_node"] = next_node
        
        # 记忆检索已由LangGraph Store自动处理，无需单独的检索节点
        
        logger.info(f"Orchestrator 决定下一个节点: {state['next_node']}")
        
        return state
    
    def _decide_next_node(self, intent: UserIntent, state: DreamAssistantState) -> str:
        """根据意图决定下一个节点"""
        # 检查迭代次数，防止无限循环
        if state["iteration_count"] >= state["max_iterations"]:
            logger.warning("达到最大迭代次数，结束对话")
            return "end"
        
        # 根据意图类型路由
        if intent.intent_type == "interpret_dream":
            # 检查是否已经有解读结果且用户在追问
            if state.get("dream_interpretation") and intent.confidence < 0.8:
                return "interpreter"  # 继续深入解读
            return "interpreter"
            
        elif intent.intent_type == "ask_knowledge":
            return "scholar"
            
        elif intent.intent_type == "generate_image":
            # 检查是否有梦境描述可以生成图像
            if state.get("dream_interpretation") or intent.keywords:
                return "visualizer"
            else:
                # 需要先获取梦境描述
                return "response_generator"  # 直接回复请先描述梦境
                
        else:  # casual_chat 或其他
            return "response_generator"  # 通用回复生成器

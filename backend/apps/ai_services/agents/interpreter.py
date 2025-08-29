"""
心理解读师 Interpreter - 负责多维度解读梦境
"""
import logging
from typing import Dict, Any, List, Optional

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.messages import HumanMessage

from ..graph.dream_assistant_state import DreamAssistantState, DreamInterpretation
from ..config import get_dream_interpretation_llm
from ..prompts.dream_assistant_prompts import prompt_manager

logger = logging.getLogger(__name__)


class DreamInterpreter:
    """梦境心理解读师"""
    
    def __init__(self):
        self.llm = get_dream_interpretation_llm()
        self.parser = PydanticOutputParser(pydantic_object=DreamInterpretation)
        
    async def __call__(self, state: DreamAssistantState, config=None) -> Dict[str, Any]:
        """解读梦境的主逻辑 - 支持真正的流式输出"""
        logger.info("心理解读师开始流式解读梦境")
        
        try:
            # 提取梦境内容
            dream_content = self._extract_dream_content(state)
            if not dream_content:
                state["error"] = "未找到梦境描述内容"
                state["next_node"] = "response_generator"
                return state
            
            # 构建上下文
            context = self._build_context(state)
            user_preferences = self._format_user_preferences(state.get("user_preferences", {}))
            
            # 流式执行梦境解读
            interpretation = await self._interpret_dream_streaming(
                dream_content=dream_content,
                context=context,
                user_preferences=user_preferences,
                config=config
            )
            
            # 如果用户禁用追问问题，清空该字段
            if not state.get("user_preferences", {}).get("enable_follow_up_questions", True):
                interpretation.follow_up_questions = []
            
            state["dream_interpretation"] = interpretation
            
            # 决定下一个节点
            if state.get("user_preferences", {}).get("enable_auto_image_generation", True):
                state["workspace"]["prepare_image_generation"] = True
                state["next_node"] = "visualizer"
            else:
                state["next_node"] = "response_generator"
            
            logger.info("梦境解读完成")
            return state
            
        except Exception as e:
            logger.error(f"梦境解读失败: {e}")
            state["error"] = f"解读过程中出现错误: {str(e)}"
            state["next_node"] = "response_generator"
            return state
    
    def _extract_dream_content(self, state: DreamAssistantState) -> Optional[str]:
        """从状态中提取梦境内容"""
        # 首先检查当前输入
        current_input = state.get("user_input", "")
        
        # 检查是否是追问（已有解读结果）
        if state.get("dream_interpretation"):
            # 这是一个追问，需要结合之前的梦境内容
            previous_content = state["workspace"].get("last_dream_content", "")
            return f"{previous_content}\n\n补充描述：{current_input}" if current_input else previous_content
        
        # 新的梦境描述
        if len(current_input) > 5:  # 假设有效的梦境描述至少5字符
            state["workspace"]["last_dream_content"] = current_input
            return current_input
        
        # 从对话历史中查找梦境描述
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage) and len(msg.content) > 5:
                state["workspace"]["last_dream_content"] = msg.content
                return msg.content
        
        return None
    
    def _build_context(self, state: DreamAssistantState) -> str:
        """构建相关上下文，整合记忆信息"""
        context_parts = []
        
        # 1. 添加用户配置上下文
        if state.get("workspace", {}).get("user_config_context"):
            context_parts.append(state["workspace"]["user_config_context"])
        
        # 2. 添加用户记忆摘要
        if state.get("workspace", {}).get("user_memory_context", {}).get("memory_summary"):
            context_parts.append(state["workspace"]["user_memory_context"]["memory_summary"])
        
        # 3. 添加检索到的记忆，优先显示梦境模式
        if state.get("retrieved_memories"):
            pattern_memories = []
            other_memories = []
            
            for memory in state["retrieved_memories"][:10]:  # 检查更多记忆
                if memory.metadata.get('memory_type') == 'dream_pattern':
                    pattern_memories.append(memory)
                else:
                    other_memories.append(memory)
            
            # 优先添加梦境模式记忆
            if pattern_memories:
                pattern_texts = []
                for memory in pattern_memories[:3]:  # 最多3条模式记忆
                    pattern_texts.append(f"- 发现的模式：{memory.content} (置信度: {memory.relevance_score:.2f})")
                context_parts.append("您的梦境模式：\n" + "\n".join(pattern_texts))
            
            # 添加其他相关记忆
            if other_memories:
                memory_texts = []
                for memory in other_memories[:3]:  # 最多3条其他记忆
                    memory_texts.append(f"- {memory.content} (相关度: {memory.relevance_score:.2f})")
                context_parts.append("相关记忆：\n" + "\n".join(memory_texts))
        
        # 4. 添加当前会话的关键信息
        if state.get("current_session_context"):
            session_info = []
            for ctx in state["current_session_context"][-3:]:
                session_info.append(f"- {ctx.get('summary', '')}")
            if session_info:
                context_parts.append("本次对话要点：\n" + "\n".join(session_info))
        
        # 5. 添加LangGraph Store中的记忆（如果有的话）
        saved_memories = state.get("workspace", {}).get("user_memory_context", {}).get("saved_memories", [])
        if saved_memories:
            memory_texts = []
            for memory in saved_memories[:3]:  # 最多3条保存的记忆
                mem_type = memory.get("type", "other")
                type_name = {
                    "personal_info": "个人信息",
                    "preference": "偏好设置",
                    "dream_pattern": "梦境模式",
                    "other": "其他记忆"
                }.get(mem_type, "其他记忆")
                content = memory.get('content', '')[:100] if isinstance(memory.get('content'), str) else str(memory.get('content', ''))[:100]
                memory_texts.append(f"- {type_name}: {content}")
            if memory_texts:
                context_parts.append("用户LangGraph记忆：\n" + "\n".join(memory_texts))
        
        return "\n\n".join(context_parts) if context_parts else "暂无相关上下文"
    
    def _format_user_preferences(self, preferences: Dict[str, Any]) -> str:
        """格式化用户偏好"""
        pref_parts = []
        
        if preferences.get("interpretation_style"):
            style_map = {
                "professional": "专业学术风格",
                "friendly": "亲切友好风格",
                "poetic": "诗意浪漫风格",
                "balanced": "平衡综合风格"
            }
            pref_parts.append(f"解读风格：{style_map.get(preferences['interpretation_style'], '平衡综合')}")
        
        if preferences.get("preferred_dimensions"):
            pref_parts.append(f"偏好维度：{', '.join(preferences['preferred_dimensions'])}")
        
        if preferences.get("response_length"):
            length_map = {
                "concise": "简洁",
                "moderate": "适中",
                "detailed": "详细"
            }
            pref_parts.append(f"回复长度：{length_map.get(preferences['response_length'], '适中')}")
        
        return "\n".join(pref_parts) if pref_parts else "使用默认偏好"
    
    async def _interpret_dream_streaming(self, dream_content: str, context: str, 
                                        user_preferences: str, config=None) -> DreamInterpretation:
        """执行流式梦境解读 - 使用 LangGraph 官方最佳实践"""
        from langgraph.config import get_stream_writer
        from langchain_core.messages import HumanMessage
        
        # 获取流写入器（LangGraph 官方推荐方式）
        try:
            writer = get_stream_writer()
        except Exception:
            # 如果不在 LangGraph 执行上下文中，writer 为 None
            writer = None
        
        # 使用统一的提示词管理器
        prompt_text = prompt_manager.format_prompt(
            "dream_interpretation",
            dream_content=dream_content,
            context=context,
            user_preferences=user_preferences
        )
        
        accumulated_content = ""
        
        try:
            # Python < 3.11 兼容性：显式传递 config
            if config:
                stream = self.llm.astream([HumanMessage(content=prompt_text)], config=config)
            else:
                stream = self.llm.astream([HumanMessage(content=prompt_text)])
            
            # 流式处理 LLM 响应
            async for chunk in stream:
                chunk_content = chunk.content if hasattr(chunk, 'content') else str(chunk)
                if chunk_content:
                    accumulated_content += chunk_content
                    
                    # 使用 LangGraph 流写入器发送实时内容
                    if writer:
                        writer({
                            "type": "interpretation_chunk", 
                            "content": chunk_content,
                            "accumulated": accumulated_content
                        })
            
            # 解析最终的完整响应
            try:
                interpretation = self.parser.parse(accumulated_content)
            except Exception as e:
                logger.error(f"解析解读结果失败: {e}")
                # 创建一个简单的解读对象
                interpretation = DreamInterpretation(
                    summary=accumulated_content,
                    psychological="",
                    symbolic="",
                    follow_up_questions=[]
                )
            
            # 发送最终完整的解读结果
            if writer:
                writer({
                    "type": "interpretation_complete",
                    "interpretation": self._interpretation_to_dict(interpretation)
                })
            
            return interpretation
            
        except Exception as e:
            logger.error(f"流式解读失败: {e}")
            # 降级到同步方式
            if config:
                result = await self.llm.ainvoke([HumanMessage(content=prompt_text)], config=config)
            else:
                result = await self.llm.ainvoke([HumanMessage(content=prompt_text)])
            
            try:
                interpretation = self.parser.parse(result.content)
            except Exception:
                interpretation = DreamInterpretation(
                    summary=result.content,
                    psychological="",
                    symbolic="",
                    follow_up_questions=[]
                )
            
            return interpretation
    
    def _interpretation_to_dict(self, interpretation: DreamInterpretation) -> dict:
        """将 DreamInterpretation 对象转换为可序列化的字典"""
        return {
            "summary": interpretation.summary or "",
            "psychological": interpretation.psychological or "",
            "symbolic": interpretation.symbolic or "",
            "biological": interpretation.biological or "",
            "spiritual": interpretation.spiritual or "",
            "personal_growth": interpretation.personal_growth or "",
            "key_elements": interpretation.key_elements or [],
            "follow_up_questions": interpretation.follow_up_questions or []
        }
    

    
    def _format_interpretation_text(self, interpretation: DreamInterpretation) -> str:
        """格式化完整的解读文本"""
        sections = []
        
        if interpretation.summary:
            sections.append(f"**梦境解读总结**\n{interpretation.summary}")
        
        if interpretation.psychological:
            sections.append(f"🧠 **心理学视角**\n{interpretation.psychological}")
        
        if interpretation.symbolic:
            sections.append(f"🔮 **象征学解读**\n{interpretation.symbolic}")
        
        if interpretation.biological:
            sections.append(f"🧬 **生物医学角度**\n{interpretation.biological}")
        
        if interpretation.spiritual:
            sections.append(f"✨ **灵性维度**\n{interpretation.spiritual}")
        
        if interpretation.personal_growth:
            sections.append(f"🌱 **个人成长启示**\n{interpretation.personal_growth}")
        
        # 添加追问问题
        if interpretation.follow_up_questions:
            question_text = "\n".join([f"{i+1}. {q}" for i, q in enumerate(interpretation.follow_up_questions)])
            sections.append(f"💭 **引导性追问**\n{question_text}")
        
        return "\n\n".join(sections)
    

    


"""
响应生成器 - 整合各节点输出生成最终响应
"""
import logging
from typing import Dict, Any
from ..graph.dream_assistant_state import OverallState

logger = logging.getLogger(__name__)


class ResponseGenerator:
    """响应生成器 - 负责整合各节点的输出并生成最终响应（支持流式输出）"""
    
    def __call__(self, state: OverallState) -> Dict[str, Any]:
        """生成最终响应"""
        logger.info("开始生成最终响应")
        
        try:
            # 检查是否有错误
            if state.get("error"):
                response = f"抱歉，处理您的请求时遇到了问题：{state['error']}"
                state["final_response"] = response
                state["next_node"] = "end"
                return state
            
            # 根据不同的处理结果生成响应
            response_parts = []
            
            # 1. 梦境解读结果
            if state.get("dream_interpretation"):
                interp = state["dream_interpretation"]
                interpretation_text = self._format_interpretation(interp)
                response_parts.append(interpretation_text)
                
                # 流式输出：先输出解读部分
                state["workspace"]["partial_response"] = interpretation_text
                
                # 添加追问问题
                if interp.follow_up_questions:
                    questions_text = "\n\n💭 **深入探索**\n"
                    for i, q in enumerate(interp.follow_up_questions, 1):
                        questions_text += f"{i}. {q}\n"
                    response_parts.append(questions_text)
            
            # 2. 知识问答结果
            elif state.get("knowledge_answer"):
                response_parts.append(state["knowledge_answer"])
            
            # 3. 通用回复（如果没有特定结果）
            if not response_parts and not state.get("generated_image_url"):
                # 根据用户意图生成适当的回复
                if state.get("user_intent"):
                    intent = state["user_intent"]
                    if intent.intent_type == "generate_image" and not state.get("dream_interpretation"):
                        response_parts.append(
                            "请先描述您的梦境内容，我会帮您生成相应的梦境图像。"
                            "您可以详细描述梦中的场景、人物、氛围等元素。"
                        )
                    elif intent.intent_type == "casual_chat":
                        # 引导用户回到梦境话题
                        # response_parts.append(
                        #     "我是专门为梦境解读而设计的AI助手。我可以帮助您：\n\n"
                        #     "🌙 **解读梦境** - 描述您的梦境，我会从心理学、象征学等多个维度为您解读\n"
                        #     "📚 **梦境知识** - 回答关于睡眠科学、清醒梦技巧、梦境符号等问题\n"
                        #     "🎨 **梦境图像** - 根据您的梦境描述生成相应的艺术图像\n\n"
                        #     "请告诉我您想了解梦境的哪个方面？梦境助手"
                        # )
                        response_parts.append(
                            "梦境助手重构开发中，请耐心等待。"
                        )
                    else:
                        response_parts.append("我理解您的问题。请问还有什么梦境相关的内容我可以帮助您的吗？")
                else:
                    response_parts.append(
                        "欢迎来到梦境助手！我可以帮助您解读梦境、了解睡眠科学，或生成梦境图像。"
                        "请告诉我您的梦境内容或想了解的梦境知识。"
                    )
            
            # 组合最终响应
            final_response = "\n".join(response_parts)
            state["final_response"] = final_response
            
            # 添加响应元数据
            state["response_metadata"]["response_length"] = len(final_response)
            state["response_metadata"]["has_interpretation"] = bool(state.get("dream_interpretation"))
            state["response_metadata"]["has_knowledge"] = bool(state.get("knowledge_answer"))
            state["response_metadata"]["has_image"] = bool(state.get("generated_image_url"))
            
            # 强制结束对话循环，避免状态污染导致的重复处理
            state["should_continue"] = False
            state["next_node"] = "end"
            
            logger.info("响应生成完成")
            return state
            
        except Exception as e:
            logger.error(f"响应生成失败: {e}")
            state["final_response"] = "抱歉，在生成响应时遇到了技术问题。请稍后重试。"
            state["next_node"] = "end"
            return state
    
    def _format_interpretation(self, interpretation) -> str:
        """格式化梦境解读结果"""
        sections = []
        
        # 综合总结
        if interpretation.summary:
            sections.append(f"**梦境解读总结**\n{interpretation.summary}")
        
        # 各维度解读
        dimension_parts = []
        
        if interpretation.psychological:
            dimension_parts.append(f"🧠 **心理学视角**\n{interpretation.psychological}")
        
        if interpretation.symbolic:
            dimension_parts.append(f"🔮 **象征学解读**\n{interpretation.symbolic}")
        
        if interpretation.biological:
            dimension_parts.append(f"🧬 **生物医学角度**\n{interpretation.biological}")
        
        if interpretation.spiritual:
            dimension_parts.append(f"✨ **灵性维度**\n{interpretation.spiritual}")
        
        if interpretation.personal_growth:
            dimension_parts.append(f"🌱 **个人成长启示**\n{interpretation.personal_growth}")
        
        if dimension_parts:
            sections.append("\n\n".join(dimension_parts))
        
        # 关键元素
        if interpretation.key_elements:
            elements_text = "**梦境关键元素**: " + "、".join(interpretation.key_elements)
            sections.append(elements_text)
        
        return "\n\n".join(sections)
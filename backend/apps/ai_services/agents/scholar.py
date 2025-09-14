"""
梦境知识学者 Scholar - 负责回答梦境相关的知识性问题
"""
import logging
from typing import Dict, Any

from ..graph.dream_assistant_state import OverallState
from ..config import get_knowledge_qa_llm, RAG_ENABLED
from ..prompts.dream_assistant_prompts import prompt_manager
from ..rag.dream_analysis_retrieval import get_dream_rag_retriever

logger = logging.getLogger(__name__)


class DreamScholar:
    """梦境知识学者 - 使用 RAG 系统回答知识性问题"""
    
    def __init__(self):
        self.llm = get_knowledge_qa_llm()
        self._rag_enabled = bool(RAG_ENABLED)
        self.retriever = get_dream_rag_retriever()
    
    async def __call__(self, state: OverallState, config=None) -> Dict[str, Any]:
        """处理知识性问题 - 支持真正的流式输出"""
        logger.info("梦境知识学者开始流式处理问题")
        
        try:
            # 获取用户问题
            question = state.get("user_input", "")
            if not question:
                state["error"] = "未找到用户问题"
                state["next_node"] = "response_generator"
                return state
            
            # 检索知识
            retrieved_knowledge = self._retrieve_knowledge(question)
            
            # 流式生成答案
            knowledge_answer = await self._generate_knowledge_answer_streaming(
                question=question,
                knowledge_context=retrieved_knowledge,
                config=config
            )
            
            # 存储答案
            state["knowledge_answer"] = knowledge_answer
            
            # 设置下一个节点
            state["next_node"] = "response_generator"
            
            logger.info("知识问答完成")
            return state
            
        except Exception as e:
            logger.error(f"知识问答失败: {e}")
            state["error"] = f"知识检索过程中出现错误: {str(e)}"
            state["next_node"] = "response_generator"
            return state
    
    def _retrieve_knowledge(self, question: str) -> str:
        """从知识库检索相关内容"""
        try:
            if not self._rag_enabled:
                return ""

            # 使用 RAG 检索器检索文档
            docs = self.retriever.retrieve_documents([question])
            
            if not docs:
                return "知识库中暂无相关内容。"
            
            # 使用重排序提升检索质量
            if self.retriever.enable_reranking and self.retriever.reranker:
                docs = self.retriever.rerank_documents(docs, question)
            
            # 格式化检索结果
            return self.retriever.format_retrieved_knowledge(docs)
            
        except Exception as e:
            return "知识检索时出现错误，将基于通用知识回答。"
    
    async def _generate_knowledge_answer_streaming(self, question: str, knowledge_context: str, config=None) -> str:
        """生成知识问答答案 - 使用 LangGraph 官方流式方法"""
        from langgraph.config import get_stream_writer
        from langchain_core.messages import HumanMessage
        
        # 获取流写入器
        try:
            writer = get_stream_writer()
        except Exception:
            writer = None
        
        try:
            prompt_text = prompt_manager.format_prompt(
                "knowledge_qa",
                question=question,
                knowledge_context=knowledge_context
            )
            
            accumulated_content = ""
            
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
                            "type": "knowledge_chunk",
                            "content": chunk_content,
                            "accumulated": accumulated_content
                        })
            
            # 发送完成信号
            if writer:
                writer({
                    "type": "knowledge_complete",
                    "answer": accumulated_content
                })
            
            return accumulated_content
            
        except Exception as e:
            logger.error(f"流式知识问答失败: {e}")
            # 降级到同步方式
            try:
                if config:
                    result = await self.llm.ainvoke([HumanMessage(content=prompt_text)], config=config)
                else:
                    result = await self.llm.ainvoke([HumanMessage(content=prompt_text)])
                return result.content
            except Exception:
                return f"抱歉，无法回答您的问题：{str(e)}"

"""
梦境分析链
基于梦境数据进行深度分析，集成RAG检索与专业解析
"""
import json
import logging
import re
from typing import Optional, Dict, Any
from langchain_core.runnables import Runnable

from ..config import get_dream_analysis_llm, get_query_expansion_llm
from ..prompts.dream_analysis_prompts import DreamAnalysisPrompts
from ..rag.dream_analysis_retrieval import get_dream_rag_retriever
from ..schemas.dream_analysis_schemas import DreamAnalysisResult, QueryExpansionResult

logger = logging.getLogger(__name__)


def clean_json_response(text: str) -> str:
    """
    清理AI响应中的markdown标记，提取纯JSON
    
    Args:
        text: 原始AI响应文本
        
    Returns:
        清理后的JSON字符串
    """
    if not text or not isinstance(text, str):
        return text
    
    # 移除可能的markdown代码块标记
    # 匹配 ```json...``` 或 ```...``` 格式
    cleaned = re.sub(r'^```(?:json)?\s*\n?', '', text.strip(), flags=re.MULTILINE | re.IGNORECASE)
    cleaned = re.sub(r'\n?```\s*$', '', cleaned, flags=re.MULTILINE)
    
    # 移除可能的前后空白
    cleaned = cleaned.strip()
    
    # 验证是否为有效JSON
    try:
        json.loads(cleaned)
        return cleaned
    except json.JSONDecodeError:
        # 如果清理后仍不是有效JSON，返回原文
        logger.warning("Failed to clean JSON response, returning original text")
        return text


class DreamAnalysisChain:
    """梦境分析链 - 完整的分析流程"""
    
    def __init__(self):
        """初始化梦境分析链"""
        self.analysis_llm = get_dream_analysis_llm()
        self.query_expansion_llm = get_query_expansion_llm()
        self.rag_retriever = get_dream_rag_retriever()
        
        # 创建结构化输出链
        self.analysis_chain = self._create_analysis_chain()
        self.query_expansion_chain = self._create_query_expansion_chain()
        
    def _create_analysis_chain(self) -> Optional[Runnable]:
        """创建梦境分析链 - 使用结构化输出"""
        try:
            if not self.analysis_llm:
                logger.error("Dream analysis LLM not available")
                return None
                
            prompt = DreamAnalysisPrompts.create_analysis_prompt()
            
            # 使用 with_structured_output 并添加 method="json_mode" 确保JSON输出
            structured_llm = self.analysis_llm.with_structured_output(
                DreamAnalysisResult,
                method="json_mode",
                include_raw=False
            )
            
            # 构建链：输入 -> 提示 -> 结构化LLM -> Pydantic对象
            chain = prompt | structured_llm
            
            logger.info("Dream analysis chain created successfully with structured output")
            return chain
            
        except Exception as e:
            logger.error(f"Error creating dream analysis chain: {e}", exc_info=True)
            return None
    
    def _create_query_expansion_chain(self) -> Optional[Runnable]:
        """创建查询扩展链 - 使用结构化输出"""
        try:
            if not self.query_expansion_llm:
                logger.error("Query expansion LLM not available")
                return None
                
            prompt = DreamAnalysisPrompts.create_query_expansion_prompt()
            
            # 使用 with_structured_output 并添加 method="json_mode" 确保JSON输出
            structured_llm = self.query_expansion_llm.with_structured_output(
                QueryExpansionResult,
                method="json_mode",
                include_raw=False
            )
            
            # 构建链：输入 -> 提示 -> 结构化LLM -> Pydantic对象
            chain = prompt | structured_llm
            
            logger.info("Query expansion chain created successfully with structured output")
            return chain
            
        except Exception as e:
            logger.error(f"Error creating query expansion chain: {e}", exc_info=True)
            return None
    
    def expand_queries(self, dream_data: Dict[str, Any]) -> Optional[QueryExpansionResult]:
        """扩展查询，用于RAG检索 - 返回结构化对象"""
        if not self.query_expansion_chain:
            logger.error("Query expansion chain not available")
            return None
            
        try:
            # 准备输入数据
            input_data = {
                'dream_content': dream_data.get('content', ''),
                'categories': ', '.join([cat.get('name', '') for cat in dream_data.get('categories', [])]),
                'tags': ', '.join([tag.get('name', '') for tag in dream_data.get('tags', [])]),
                'mood_in_dream': dream_data.get('mood_in_dream_display', '未知')
            }
            
            # 执行查询扩展，返回Pydantic对象
            result = self.query_expansion_chain.invoke(input_data)
            
            logger.info(f"Query expansion completed: {result.primary_queries}")
            return result
            
        except Exception as e:
            logger.error(f"Error in query expansion: {e}", exc_info=True)
            return None
    
    def analyze_dream_with_rag(self, dream_data: Dict[str, Any]) -> Optional[DreamAnalysisResult]:
        """使用RAG增强的梦境分析 - 返回结构化对象"""
        if not self.analysis_chain:
            logger.error("Dream analysis chain not available")
            return None
            
        try:
            # 1. 查询扩展
            expansion_result = self.expand_queries(dream_data)
            if not expansion_result or not expansion_result.primary_queries:
                logger.warning("Query expansion failed, proceeding without RAG")
                retrieved_knowledge = "无法获取相关知识库信息"
            else:
                # 2. RAG检索
                queries = expansion_result.primary_queries
                retrieval_result = self.rag_retriever.retrieve_documents(queries)
                retrieved_knowledge = self.rag_retriever.format_retrieved_knowledge(
                    retrieval_result
                ) if retrieval_result else "未找到相关知识库信息"
            
            # 3. 格式化梦境数据用于分析
            formatted_data = DreamAnalysisPrompts.format_dream_data_for_analysis(dream_data)
            formatted_data['retrieved_knowledge'] = retrieved_knowledge
            
            # 4. 执行分析，返回Pydantic对象
            analysis_result = self.analysis_chain.invoke(formatted_data)
            
            logger.info("Dream analysis with RAG completed successfully")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error in dream analysis with RAG: {e}", exc_info=True)
            return None
    
    def analyze_dream_simple(self, dream_data: Dict[str, Any]) -> Optional[DreamAnalysisResult]:
        """简单的梦境分析（不使用RAG）- 返回结构化对象"""
        if not self.analysis_chain:
            logger.error("Dream analysis chain not available")
            return None
            
        try:
            # 格式化梦境数据
            formatted_data = DreamAnalysisPrompts.format_dream_data_for_analysis(dream_data)
            formatted_data['retrieved_knowledge'] = "本次分析基于梦境描述进行，未使用知识库增强"
            
            # 执行分析，返回Pydantic对象
            result = self.analysis_chain.invoke(formatted_data)
            
            logger.info("Simple dream analysis completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error in simple dream analysis: {e}", exc_info=True)
            return None


# 全局链实例，延迟加载
_dream_analysis_chain = None


def get_dream_analysis_chain() -> DreamAnalysisChain:
    """获取梦境分析链实例"""
    global _dream_analysis_chain
    if _dream_analysis_chain is None:
        _dream_analysis_chain = DreamAnalysisChain()
    return _dream_analysis_chain
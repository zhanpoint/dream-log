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
            
            return result
            
        except Exception as e:
            logger.error(f"Error in query expansion: {e}", exc_info=True)
            return None
    
    def analyze_dream_with_rag(self, dream_data: Dict[str, Any]) -> Optional[DreamAnalysisResult]:
        """使用RAG增强的梦境分析"""
        try:
            import concurrent.futures
            import time
            
            # 并行执行：查询扩展 + 格式化梦境数据
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                # 提交并行任务
                query_future = executor.submit(self.expand_queries, dream_data)
                format_future = executor.submit(
                    DreamAnalysisPrompts.format_dream_data_for_analysis, 
                    dream_data
                )
                
                # 收集结果
                expansion_result = query_future.result(timeout=10)
                formatted_data = format_future.result(timeout=5)
            
            # RAG检索（如果查询扩展成功）
            if expansion_result and expansion_result.primary_queries:
                retrieval_start = time.time()
                queries = expansion_result.primary_queries
                # retrieve_documents会创建一个线程池，池中的线程数量等于您生成的查询（queries）数量，最多为3个，以避免过多消耗资源
                # 它会将所有的查询任务提交到线程池，并等待所有任务完成。
                # 线程池中的多个线程会同时向向量数据库发起查询请求
                # 主线程会等待所有并行查询完成后，收集并去重所有结果，然后返回一个统一的文档列表。
                retrieval_result = self.rag_retriever.retrieve_documents(queries)
                retrieved_knowledge = self.rag_retriever.format_retrieved_knowledge(
                    retrieval_result
                ) if retrieval_result else "未找到相关知识库信息"
                
                retrieval_time = time.time() - retrieval_start
                logger.info(f"RAG retrieval completed in {retrieval_time:.2f}s")
            else:
                logger.warning("Query expansion failed, proceeding without RAG")
                retrieved_knowledge = "无法获取相关知识库信息"
            
            # 设置检索到的知识
            formatted_data['retrieved_knowledge'] = retrieved_knowledge
            
            # 执行最终分析
            analysis_result = self.analysis_chain.invoke(formatted_data)
             
            return analysis_result
            
        except concurrent.futures.TimeoutError:
            raise Exception("Timeout in parallel processing")
        except Exception as e:
            raise Exception(f"Error in parallel dream analysis: {e}")
    
    def analyze_dream_simple(self, dream_data: Dict[str, Any]) -> Optional[DreamAnalysisResult]:
        """简单的梦境分析（不使用RAG）- 返回结构化对象"""
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
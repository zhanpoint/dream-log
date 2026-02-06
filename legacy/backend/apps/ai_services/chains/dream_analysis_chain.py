"""
梦境分析链 - 纯异步实现
基于梦境数据进行深度分析，集成RAG检索与专业解析。
采用asyncio架构与LangChain异步API。
"""
import logging
from typing import Optional, Dict, Any
from langchain_core.runnables import Runnable

from ..config import get_dream_analysis_llm, get_query_expansion_llm
from ..prompts.dream_analysis_prompts import DreamAnalysisPrompts
from ..rag.dream_analysis_retrieval import get_dream_rag_retriever
from ..schemas.dream_analysis_schemas import DreamAnalysisResult, QueryExpansionResult

logger = logging.getLogger(__name__)


class DreamAnalysisChain:
    """梦境分析链 - 异步完整分析流程"""
    
    def __init__(self):
        """初始化梦境分析链"""
        self.analysis_llm = None
        self.query_expansion_llm = None
        self.rag_retriever = None
        self.analysis_chain = None
        self.query_expansion_chain = None
        self._initialized = False
    
    async def _ensure_initialized(self):
        """确保所有组件已初始化"""
        if not self._initialized:
            # 初始化所有组件（LLM获取函数是同步的）
            self.analysis_llm = get_dream_analysis_llm()
            self.query_expansion_llm = get_query_expansion_llm()
            self.rag_retriever = get_dream_rag_retriever()
            
            # 创建结构化输出链
            self.analysis_chain = await self._create_analysis_chain()
            self.query_expansion_chain = await self._create_query_expansion_chain()
            
            self._initialized = True
        
    async def _create_analysis_chain(self) -> Optional[Runnable]:
        """创建梦境分析链"""
        if not self.analysis_llm:
            return None
            
        prompt = DreamAnalysisPrompts.create_analysis_prompt()
        structured_llm = self.analysis_llm.with_structured_output(
            DreamAnalysisResult,
            method="json_mode",
            include_raw=False
        )
        
        return prompt | structured_llm
    
    async def _create_query_expansion_chain(self) -> Optional[Runnable]:
        """创建查询扩展链"""
        if not self.query_expansion_llm:
            return None
            
        prompt = DreamAnalysisPrompts.create_query_expansion_prompt()
        structured_llm = self.query_expansion_llm.with_structured_output(
            QueryExpansionResult,
            method="json_mode",
            include_raw=False
        )
        
        return prompt | structured_llm
    
    async def aexpand_queries(self, dream_data: Dict[str, Any]) -> Optional[QueryExpansionResult]:
        """异步扩展查询，用于RAG检索"""        
        try:
            await self._ensure_initialized()
            
            input_data = {
                'dream_content': dream_data.get('content', ''),
                'categories': ', '.join([cat.get('name', '') for cat in dream_data.get('categories', [])]),
                'tags': ', '.join([tag.get('name', '') for tag in dream_data.get('tags', [])]),
                'mood_in_dream': dream_data.get('mood_in_dream_display', '未知')
            }
            
            return await self.query_expansion_chain.ainvoke(input_data)
            
        except Exception as e:
            logger.error(f"查询扩展失败: {e}")
            return None


# 全局链实例，延迟加载
_dream_analysis_chain = None


async def get_dream_analysis_chain() -> DreamAnalysisChain:
    """获取梦境分析链实例（异步初始化）"""
    global _dream_analysis_chain
    if _dream_analysis_chain is None:
        _dream_analysis_chain = DreamAnalysisChain()
    await _dream_analysis_chain._ensure_initialized()
    return _dream_analysis_chain
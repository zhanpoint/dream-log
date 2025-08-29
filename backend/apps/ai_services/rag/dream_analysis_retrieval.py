"""
RAG检索器
实现查询扩展、向量检索和重排序的完整RAG流程
"""
import logging
from typing import List, Optional

from langchain_core.documents import Document
from langchain_voyageai import VoyageAIRerank

from ..config import VOYAGE_API_KEY
from ..knowledge_base.workflow._6_vectorstore import get_vectorstore

logger = logging.getLogger(__name__)


class DreamAnalysisRAGRetriever:
    """RAG检索器"""
    
    def __init__(self, 
                 top_k_initial: int = 15,
                 top_n_final: int = 5,
                 enable_reranking: bool = True,
                 score_threshold: float = 0.7):
        """
        初始化梦境分析RAG检索器
        
        Args:
            top_k_initial: 初始检索的文档数量
            top_n_final: 重排序后保留的文档数量
            enable_reranking: 是否启用重排序
            score_threshold: 相似度阈值
        """
        self.top_k_initial = top_k_initial
        self.top_n_final = top_n_final
        self.enable_reranking = enable_reranking
        self.score_threshold = score_threshold
        
        # 初始化组件
        self.vectorstore = get_vectorstore()
        
        # 初始化重排序器
        self.reranker = self._initialize_reranker()
    
    def _initialize_reranker(self) -> Optional[VoyageAIRerank]:
        """初始化VoyageAI重排序器"""
        try:
            if not VOYAGE_API_KEY:
                logger.warning("VOYAGE_API_KEY not found, reranking will be disabled")
                return None
                
            reranker = VoyageAIRerank(
                voyageai_api_key=VOYAGE_API_KEY,
                model='rerank-2.5-lite',
                top_k=self.top_n_final
            )
            return reranker
            
        except ImportError:
            logger.warning("VoyageAI reranker not available, falling back to score-based ranking")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize reranker: {e}", exc_info=True)
            return None
    
    def retrieve_documents(self, queries: List[str]) -> List[Document]:
        """
        使用多个查询进行并行向量检索
        
        Args:
            queries: 查询列表
            
        Returns:
            检索到的文档列表
        """
        import concurrent.futures
        
        if not queries:
            return []
            
        all_documents = []
        seen_content = set()
        
        def search_single_query(query: str) -> List[Document]:
            """单个查询的搜索函数"""
            try:
                docs = self.vectorstore.search_similar(
                    query=query,
                    k=self.top_k_initial // len(queries),  # 平均分配每个查询的检索数量
                    score_threshold=self.score_threshold
                )
                return docs
            except Exception as e:
                logger.error(f"Error searching for query '{query}': {e}")
                return []
        
        try:
            # 使用线程池并行执行所有查询
            with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(queries), 3)) as executor:
                # 提交所有查询任务
                future_to_query = {
                    executor.submit(search_single_query, query): query 
                    for query in queries
                }
                
                # 按完成顺序收集检索结果
                for future in concurrent.futures.as_completed(future_to_query):
                    try:
                        docs = future.result(timeout=10)  # 10秒超时
                        
                        for doc in docs:
                            content_hash = hash(doc.page_content)
                            if content_hash not in seen_content:
                                seen_content.add(content_hash)
                                all_documents.append(doc)
                                    
                    except concurrent.futures.TimeoutError:
                        logger.warning(f"Query  timed out")
                    except Exception as e:
                        logger.error(f"Query failed: {e}")
            
            return all_documents
            
        except Exception as e:
            logger.error(f"Error in parallel document retrieval: {e}", exc_info=True)
            return []
    
    def rerank_documents(self, documents: List[Document], query: str) -> List[Document]:
        """
        使用重排序器优化检索结果
        
        Args:
            documents: 待重排序的文档
            query: 原始查询
            
        Returns:
            重排序后的文档
        """
        if not documents:
            return documents
            
        try:
            # 使用VoyageAI重排序器
            reranked_docs = self.reranker.compress_documents(documents=documents, query=query)
            return reranked_docs
        except Exception as e:
            logger.error(f"Error in document reranking: {e}", exc_info=True)
            return []

    
    def format_retrieved_knowledge(self, documents: List[Document]) -> str:
        """
        将检索文档格式化为Prompt可用的知识文本
        
        Args:
            documents: 检索到的文档列表
            
        Returns:
            格式化的知识文本
        """
        if not documents:
            return "暂无相关知识库信息可供参考。"
        
        formatted_sections = []
        
        for i, doc in enumerate(documents, 1):
            title = doc.metadata.get('title', f'相关知识 {i}')
            content = doc.page_content.strip()
            
            section = f"**{title}**\n\n{content}"
            formatted_sections.append(section)
        
        return "\n\n---\n\n".join(formatted_sections)


# 单例实例
_dream_rag_retriever = None

def get_dream_rag_retriever(**kwargs) -> DreamAnalysisRAGRetriever:
    """获取梦境分析RAG检索器单例"""
    global _dream_rag_retriever
    if _dream_rag_retriever is None:
        # 只有在第一次调用时，才会创建这个昂贵的实例
        _dream_rag_retriever = DreamAnalysisRAGRetriever(**kwargs)
    return _dream_rag_retriever

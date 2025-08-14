"""
梦境分析专用RAG检索器
实现查询扩展、向量检索和重排序的完整RAG流程
"""
import logging
from typing import List, Optional

from langchain_core.documents import Document
from langchain.retrievers.document_compressors import CohereRerank
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from ..config import GOOGLE_API_KEY, GEMINI_EMBEDDING_MODEL
from ..knowledge_base.workflow._6_vectorstore import get_vectorstore

logger = logging.getLogger(__name__)


class DreamAnalysisRAGRetriever:
    """梦境分析专用RAG检索器"""
    
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
        self.embeddings = self._initialize_embeddings()
        
        # 初始化重排序器（如果可用）
        self.reranker = self._initialize_reranker() if enable_reranking else None
        
        logger.info("DreamAnalysisRAGRetriever initialized successfully")
    
    def _initialize_embeddings(self) -> GoogleGenerativeAIEmbeddings:
        """初始化Gemini嵌入模型"""
        try:
            if not GOOGLE_API_KEY:
                raise ValueError("GOOGLE_API_KEY is required for embeddings")
                
            embeddings = GoogleGenerativeAIEmbeddings(
                model=GEMINI_EMBEDDING_MODEL,
                google_api_key=GOOGLE_API_KEY
            )

            return embeddings
            
        except Exception as e:
            logger.error(f"Failed to initialize embeddings: {e}", exc_info=True)
            raise
    
    def _initialize_reranker(self) -> Optional[CohereRerank]:
        """初始化Cohere重排序器"""
        try:
            from decouple import config
            cohere_api_key = config('COHERE_API_KEY', default='')
            
            if not cohere_api_key:
                logger.warning("COHERE_API_KEY not found, reranking will be disabled")
                return None
                
            reranker = CohereRerank(
                cohere_api_key=cohere_api_key,
                top_n=self.top_n_final
            )
            return reranker
            
        except ImportError:
            logger.warning("Cohere reranker not available, falling back to score-based ranking")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize reranker: {e}", exc_info=True)
            return None
    
    def retrieve_documents(self, queries: List[str]) -> List[Document]:
        """
        使用多个查询进行向量检索
        
        Args:
            queries: 查询列表
            
        Returns:
            检索到的文档列表
        """
        all_documents = []
        seen_content = set()
        
        try:
            for query in queries:
                # 使用向量存储进行相似性搜索
                docs = self.vectorstore.search_similar(
                    query=query,
                    k=self.top_k_initial // len(queries),  # 平均分配每个查询的检索数量
                    score_threshold=self.score_threshold
                )
                
                # 去重
                for doc in docs:
                    content_hash = hash(doc.page_content)
                    if content_hash not in seen_content:
                        seen_content.add(content_hash)
                        all_documents.append(doc)
                        
                logger.info(f"Query '{query}' retrieved {len(docs)} documents")
            
            logger.info(f"Total unique documents retrieved: {len(all_documents)}")
            return all_documents
            
        except Exception as e:
            logger.error(f"Error in document retrieval: {e}", exc_info=True)
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
            if self.reranker:
                # 使用Cohere重排序器
                reranked_docs = self.reranker.compress_documents(documents, query)
                logger.info(f"Cohere reranker processed {len(documents)} -> {len(reranked_docs)} documents")
                return reranked_docs[:self.top_n_final]
            else:
                # 回退到基于相似度的简单排序
                return self._simple_rerank(documents, query)
                
        except Exception as e:
            logger.error(f"Error in document reranking: {e}", exc_info=True)
            return documents[:self.top_n_final]
    
    def _simple_rerank(self, documents: List[Document], query: str) -> List[Document]:
        """简单的基于关键词匹配的重排序"""
        try:
            query_terms = set(query.lower().split())
            
            def calculate_relevance_score(doc: Document) -> float:
                content = doc.page_content.lower()
                title = doc.metadata.get('title', '').lower()
                
                # 计算关键词匹配分数
                content_matches = sum(1 for term in query_terms if term in content)
                title_matches = sum(2 for term in query_terms if term in title)  # 标题匹配权重更高
                
                # 考虑文档长度
                length_score = min(len(content) / 1000, 1.0)  # 标准化到0-1
                
                return content_matches + title_matches + length_score
            
            # 根据相关性分数排序
            scored_docs = [(doc, calculate_relevance_score(doc)) for doc in documents]
            scored_docs.sort(key=lambda x: x[1], reverse=True)
            
            reranked = [doc for doc, score in scored_docs[:self.top_n_final]]
            logger.info(f"Simple reranking processed {len(documents)} -> {len(reranked)} documents")
            return reranked
            
        except Exception as e:
            logger.error(f"Error in simple reranking: {e}", exc_info=True)
            return documents[:self.top_n_final]
    
# 移除了冗余的retrieve_for_dream_analysis方法
    # 现在使用更简洁的retrieve_documents -> format_retrieved_knowledge流程
    
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
            
            # 简化格式，只保留标题和内容
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

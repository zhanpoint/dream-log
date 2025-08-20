"""
向量存储系统 V2 - 优化版本
实现高效的哈希去重和异步相似性检查
"""
import logging
import time
import hashlib
from typing import List, Dict, Optional, Any, Set
from threading import Lock

from langchain_chroma import Chroma
from langchain_voyageai import VoyageAIEmbeddings
from langchain_core.documents import Document


from ...config import (
    VOYAGE_API_KEY,
    CHROMA_CLOUD_API_KEY,
    CHROMA_COLLECTION_NAME, CHROMA_TENANT, CHROMA_DATABASE, EMBEDDING_MODEL
)

logger = logging.getLogger(__name__)


class DocumentHashIndex:
    """文档哈希索引 - 用于快速去重"""
    
    def __init__(self):
        self.hashes: Set[str] = set()
        self.url_to_hashes: Dict[str, Set[str]] = {}
        self._lock = Lock()
        
    def add(self, doc_hash: str, url: str = None):
        """添加哈希"""
        with self._lock:
            self.hashes.add(doc_hash)
            if url:
                if url not in self.url_to_hashes:
                    self.url_to_hashes[url] = set()
                self.url_to_hashes[url].add(doc_hash)
                
    def contains(self, doc_hash: str) -> bool:
        """检查哈希是否存在"""
        with self._lock:
            return doc_hash in self.hashes
            
    def remove(self, doc_hash: str):
        """移除哈希"""
        with self._lock:
            if doc_hash in self.hashes:
                self.hashes.remove(doc_hash)
                
            # 从URL映射中移除
            for url, hashes in self.url_to_hashes.items():
                if doc_hash in hashes:
                    hashes.remove(doc_hash)
                    
    def get_url_hashes(self, url: str) -> Set[str]:
        """获取URL对应的所有哈希"""
        with self._lock:
            return self.url_to_hashes.get(url, set()).copy()
            
    def clear(self):
        """清空索引"""
        with self._lock:
            self.hashes.clear()
            self.url_to_hashes.clear()
            
    def size(self) -> int:
        """获取索引大小"""
        with self._lock:
            return len(self.hashes)


class OptimizedDreamVectorStore:
    """梦境向量存储系统"""
    
    def __init__(self):
        """初始化优化的向量存储"""
        # 初始化组件
        self.embeddings = VoyageAIEmbeddings(
            model=EMBEDDING_MODEL,
            voyage_api_key=VOYAGE_API_KEY,
        )
        self.vectorstore: Optional[Chroma] = None
        
        # 哈希索引（主要去重机制）
        self.hash_index = DocumentHashIndex()
        
        # 线程安全
        self._lock = Lock()
        
    def _get_vectorstore(self) -> Chroma:
        """获取向量存储实例"""
        # 使用线程锁确保vectorstore的单例初始化是线程安全的
        with self._lock:
            if self.vectorstore is None:
                self.vectorstore = Chroma(
                    collection_name=CHROMA_COLLECTION_NAME,
                    embedding_function=self.embeddings,
                    chroma_cloud_api_key=CHROMA_CLOUD_API_KEY,
                    tenant=CHROMA_TENANT,
                    database=CHROMA_DATABASE,
                    # 调整 efConstruction 和 M 可加快搜索速度。
                    collection_metadata={"hnsw:space": "cosine"}
                )
                
                # 首次初始化时，加载现有哈希
                self._load_existing_hashes()
            
        return self.vectorstore
        
    def _load_existing_hashes(self):
        """加载现有文档哈希到索引"""
        try:
            collection = self.vectorstore._collection
            results = collection.get(include=["metadatas"]) 
            
            if results and results.get("metadatas"):
                for metadata in results["metadatas"]:
                    if metadata and "document_hash" in metadata:
                        doc_hash = metadata["document_hash"]
                        url = metadata.get("source_url", "")
                        self.hash_index.add(doc_hash, url)
                        
        except Exception as e:
            logger.exception(f"Failed to load existing hashes: {e}")
            
    def _generate_hash(self, content: str, url: str = "") -> str:
        """生成文档哈希"""
        hash_input = f"{content[:1000]}{url}".encode('utf-8')
        return hashlib.sha256(hash_input).hexdigest()
        
    def add_documents_optimized(self, documents: List[Document]) -> Dict[str, Any]:
        """
        利用 vectorstore.add_documents 处理嵌入和存储
        """
        if not documents:
            return {"added": 0, "duplicates": 0, "errors": 0}
            
        start_time = time.time()
        vectorstore = self._get_vectorstore()
        
        # 第一步：快速哈希去重
        unique_docs = []
        duplicate_count = 0
        
        for doc in documents:
            doc_hash = self._generate_hash(
                doc.page_content,
                doc.metadata.get("source_url", "")
            )
            
            if self.hash_index.contains(doc_hash):
                duplicate_count += 1
                logger.debug(f"Duplicate hash detected: {doc_hash[:16]}...")
                continue
                
            # 临时保存哈希用于去重，稍后在清理阶段统一处理元数据
            doc._temp_doc_hash = doc_hash
            unique_docs.append(doc)
            
        if not unique_docs:
            logger.info(f"All {len(documents)} documents were duplicates")
            return {
                "added": 0,
                "duplicates": duplicate_count,
                "errors": 0,
                "time_seconds": time.time() - start_time
            }
            
        # 第二步：清理元数据并添加文档
        added_count = 0
        error_count = 0
        
        try:
            # 精简元数据到9个核心字段，确保不超过ChromaDB限制
            cleaned_docs = []
            for doc in unique_docs:
                # 只保留9个核心字段，确保符合ChromaDB限制
                cleaned_metadata = {
                    "source_url": doc.metadata.get("source_url", ""),
                    "title": doc.metadata.get("title", "")[:200],  # 限制长度
                    "document_hash": getattr(doc, '_temp_doc_hash', ''),
                    "quality_score": float(doc.metadata.get("quality_score", 0.0)),
                    "chunk_index": int(doc.metadata.get("chunk_index", 0)),
                    "chunk_size": int(doc.metadata.get("chunk_size", 0)),
                    "is_chunk": bool(doc.metadata.get("is_chunk", False)),
                    "parent_doc_id": doc.metadata.get("parent_doc_id", ""),
                    "added_timestamp": time.time()
                }
                
                cleaned_doc = Document(
                    page_content=doc.page_content,
                    metadata=cleaned_metadata
                )
                cleaned_docs.append(cleaned_doc)

            # add_documents 会自动处理嵌入计算
            if cleaned_docs:
                vectorstore.add_documents(documents=cleaned_docs)
                added_count = len(cleaned_docs)
                
                # 更新哈希索引
                for doc in cleaned_docs:
                    self.hash_index.add(
                        doc.metadata["document_hash"],
                        doc.metadata.get("source_url", "")
                    )
            else:
                logger.warning("No documents to add after cleaning metadata.")
                added_count = 0
                
        except Exception as e:
            logger.error(f"Failed to add documents using LangChain API: {e}", exc_info=True)
            error_count = len(unique_docs)
            

        processing_time = time.time() - start_time
        
        result = {
            "added": added_count,
            "duplicates": duplicate_count,
            "errors": error_count,
            "time_seconds": round(processing_time, 2),
            "throughput_docs_per_second": len(documents) / processing_time if processing_time > 0 else 0
        }
        
        logger.info(f"Document addition completed: {result}")
        return result
        
    def search_similar(self, query: str, k: int = 5, 
                      score_threshold: float = 0.0) -> List[Document]:
        """搜索相似文档 - 遵循LangChain标准实践"""
        try:
            vectorstore = self._get_vectorstore()
            
            if score_threshold > 0:
                results = vectorstore.similarity_search_with_relevance_scores(query, k=k)
                return [doc for doc, score in results if score >= score_threshold]
            else:
                return vectorstore.similarity_search(query, k=k)
                
        except Exception as e:
            logger.error(f"Error searching documents: {e}", exc_info=True)
            return []


# 单例实例
_optimized_vectorstore = None

def get_vectorstore() -> OptimizedDreamVectorStore:
    """获取优化的向量存储单例"""
    global _optimized_vectorstore
    if _optimized_vectorstore is None:
        _optimized_vectorstore = OptimizedDreamVectorStore()
    return _optimized_vectorstore

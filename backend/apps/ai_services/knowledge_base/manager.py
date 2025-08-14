"""
梦境知识库管理器
整合URL搜索、URL内容抓取、处理、分块和存储的完整流程，具备高性能、可扩展和可维护的架构
"""
import logging
import time
from typing import List, Dict, Optional, Any, Callable
from datetime import datetime
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import os

from ..prompts.knowledge_base_search_prompts import DreamSearchCategory, DreamSearchTemplates
from .workflow._2_tavily_search import get_tavily_searcher
from .workflow._3_content_crawler import get_content_extractor
from .workflow._4_data_processor import create_document_processor
from .workflow._5_text_splitter import create_dream_splitter
from .workflow._6_vectorstore import get_vectorstore
from .quality_assessment import UnifiedQualityEvaluator

logger = logging.getLogger(__name__)


class ProcessingError(Exception):
    """处理过程中的错误"""
    def __init__(self, step: str, message: str, partial_stats: Dict = None):
        self.step = step
        self.message = message
        self.partial_stats = partial_stats or {}
        super().__init__(f"Error in {step}: {message}")


@dataclass
class KnowledgeBaseStats:
    """知识库统计信息"""
    total_searches: int = 0 # 搜索次数      
    total_urls_found: int = 0 # 找到的URL数量
    total_documents_extracted: int = 0 # 提取的文档数量
    total_documents_processed: int = 0 # 处理的文档数量
    total_chunks_created: int = 0 # 创建的分块数量
    total_chunks_stored: int = 0 # 存储的分块数量
    total_processing_time: float = 0.0 # 处理时间
    last_update: Optional[str] = None # 最后更新时间
    success_rate: float = 0.0 # 成功率
    avg_quality_score: float = 0.0 # 平均质量分数
    
    def update_success_rate(self):
        """更新成功率"""
        if self.total_urls_found > 0: # 如果找到的URL数量大于0，则更新成功率
            self.success_rate = (self.total_chunks_stored / self.total_urls_found) * 100


@dataclass
class ProcessingConfig:
    """处理配置"""
    enable_parallel_processing: bool = True # 是否启用并行处理
    max_workers: int = 4 # 最大工作线程数
    batch_size: int = 20 # 批量处理大小
    enable_quality_filtering: bool = True # 是否启用质量过滤
    min_quality_threshold: float = 0.3 # 最小质量阈值
    enable_progress_tracking: bool = True # 是否启用进度跟踪
    save_intermediate_results: bool = False # 是否保存中间结果


class DreamKnowledgeBaseManager:
    """梦境知识库管理器"""
    
    def __init__(self, config: ProcessingConfig = None):
        """初始化知识库管理器"""
        self.config = config or ProcessingConfig()
        
        # 初始化组件
        self.tavily_searcher = get_tavily_searcher() # 初始化Tavily搜索器
        self.content_extractor = get_content_extractor() # 初始化内容提取器
        self.document_processor = create_document_processor() # 初始化文档处理器
        self.text_splitter = create_dream_splitter() # 初始化文本分割器
        self.vectorstore = get_vectorstore() # 初始化向量存储
        self.quality_evaluator = UnifiedQualityEvaluator() # 初始化质量评估器
        
        # 统计信息
        self.stats = KnowledgeBaseStats() # 初始化统计信息
        
        # 进度回调函数
        self.progress_callbacks: List[Callable] = [] # 进度回调函数列表
    
    def add_progress_callback(self, callback: Callable[[str, float], None]):
        """添加进度回调函数"""
        self.progress_callbacks.append(callback)
    
    def _notify_progress(self, stage: str, progress: float):
        """通知进度"""
        if self.config.enable_progress_tracking:
            for callback in self.progress_callbacks:
                try:
                    callback(stage, progress)
                except Exception as e:
                    logger.warning(f"Progress callback failed: {e}")
    
    def build_comprehensive_knowledge_base(self, 
                                         categories: Optional[List[DreamSearchCategory]] = None,
                                         max_urls: int = 100) -> Dict[str, Any]:
        """
        构建全面的梦境知识库
        
        Args:
            categories: 要搜索的类别，None表示所有类别
            max_urls: 最大URL数量
            
        Returns:
            构建结果统计
        """
        logger.info("Starting comprehensive dream knowledge base construction")
        start_time = time.time()
        
        # 定义处理步骤 - 优化后的流程（质量过滤提前到分块前）
        steps = [
            ("Searching for relevant URLs", self._step_search_urls, categories, max_urls),
            ("Extracting content from URLs", self._step_extract_content),
            ("Processing and cleaning documents", self._step_process_documents),
            ("Quality filtering complete documents", self._step_filter_document_quality),
            ("Splitting validated documents into chunks", self._step_split_documents),
            ("Storing chunks in vector database", self._step_store_chunks),
        ]
        
        # 执行流程
        try:
            context = {}  # 在步骤间传递数据的上下文
            total_steps = len(steps)
            self._notify_progress("启动知识库构建", 0)

            for i, (step_name, step_func, *args) in enumerate(steps):
                logger.info(f"Step {i + 1}/{total_steps}: {step_name}...")
                context = self._execute_step(step_name, step_func, context, *args)
                progress = ((i + 1) / total_steps) * 100
                self._notify_progress(f"已完成: {step_name}", progress)

                
            # 计算最终结果
            return self._build_final_result(context, start_time)
            
        except ProcessingError as e:
            logger.error(f"Knowledge base construction failed at step '{e.step}': {e.message}")
            return {
                "success": False,
                "error": f"Failed at {e.step}: {e.message}",
                "failed_step": e.step,
                "partial_stats": getattr(e, 'partial_stats', {}),
                "total_time": time.time() - start_time
            }
        except Exception as e:
            logger.error(f"Unexpected error during knowledge base construction: {e}", exc_info=True)
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}",
                "total_time": time.time() - start_time
            }
    
    def build_symbol_specific_knowledge_base(self, 
                                           symbols: List[str],
                                           max_urls_symbol: int = 10) -> Dict[str, Any]:
        """
        为特定梦境象征构建知识库
        
        Args:
            symbols: 梦境象征列表
            max_urls_per_symbol: 每个象征的最大URL数量
            
        Returns:
            构建结果统计
        """
        start_time = time.time()
        overall_success = True
        all_results = {}
        processed_symbols_count = 0
        total_urls_found = 0
        total_chunks_stored = 0

        for symbol in symbols:  
            symbol_start_time = time.time()  # 为每个符号记录开始时间
            try:
                logger.info(f"Processing symbol: '{symbol}'")
                queries = DreamSearchTemplates.generate_symbol_queries([symbol])
                search_results = self.tavily_searcher.search_dream_knowledge(queries, max_urls_total=max_urls_symbol)
                
                if not search_results:
                    # 获取去重前的原始搜索结果指标，以判断是"全部重复"还是"真无结果"
                    metrics = self.tavily_searcher.get_search_metrics()
                    if metrics.get("duplicate_results", 0) > 0 and metrics.get("total_results", 0) > 0:
                        message = f"All search results for symbol '{symbol}' were duplicates of existing ones."
                        logger.info(message)
                        # 这种情况被视为成功，因为它意味着该主题已被充分覆盖
                        all_results[symbol] = {"success": True, "message": message, "status": "all_duplicates"}
                        processed_symbols_count += 1 # 标记为已处理
                        continue # 继续处理下一个symbol
                    else:
                        message = f"No new search results found for symbol: '{symbol}'"
                        logger.warning(message)
                        all_results[symbol] = {"success": False, "error": message}
                        overall_success = False
                        continue

                symbol_result = self._process_search_results(search_results, symbol_start_time)
                all_results[symbol] = symbol_result
                
                if not symbol_result.get("success"):
                    overall_success = False
                else:
                    processed_symbols_count += 1
                    total_urls_found += symbol_result.get("search_results", 0)
                    total_chunks_stored += symbol_result.get("storage_result", {}).get("added", 0)

            except Exception as e:
                logger.error(f"Error processing symbol '{symbol}': {e}", exc_info=True)
                all_results[symbol] = {"success": False, "error": str(e)}
                overall_success = False

        return {
            "success": overall_success,
            "total_symbols_processed": processed_symbols_count,
            "total_urls_found": total_urls_found,
            "total_chunks_stored": total_chunks_stored,
            "details": all_results,
            "processing_time_seconds": time.time() - start_time
        }
    
    def update_knowledge_base_incremental(self, 
                                        categories: Optional[List[DreamSearchCategory]] = None,
                                        max_new_urls: int = 20) -> Dict[str, Any]:
        """
        增量更新知识库
        
        Args:
            categories: 要更新的类别
            max_new_urls: 最大新URL数量
            
        Returns:
            更新结果统计
        """
        logger.info("Starting incremental knowledge base update")
        start_time = time.time()
        
        try:
            # 清理已处理URL缓存，以便发现新内容
            processed_count_before = self.tavily_searcher.get_processed_urls_count()
            
            # 搜索新内容
            if categories:
                queries = DreamSearchTemplates.generate_comprehensive_queries(categories)
            else:
                # 使用所有类别进行增量更新
                queries = DreamSearchTemplates.generate_comprehensive_queries()
            
            search_results = self.tavily_searcher.search_dream_knowledge(queries, max_urls_total=max_new_urls)
            
            if not search_results:
                logger.info("No new content found for incremental update")
                return {
                    "success": True,
                    "message": "No new content found",
                    "processing_time_seconds": time.time() - start_time
                }
            
            logger.info(f"Found {len(search_results)} new URLs for incremental update")
            
            # 处理新内容
            result = self._process_search_results(search_results, start_time)
            result["update_type"] = "incremental"
            result["processed_urls_before"] = processed_count_before
            result["processed_urls_after"] = self.tavily_searcher.get_processed_urls_count()
            
            return result
            
        except Exception as e:
            logger.error(f"Error in incremental knowledge base update: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "processing_time_seconds": time.time() - start_time
            }
    
    def _process_search_results(self, search_results: List[Dict], start_time: float) -> Dict[str, Any]:
        """
        处理搜索结果的通用流程
        
        Args:
            search_results: 搜索结果列表
            start_time: 开始时间
            
        Returns:
            处理结果统计
        """
        if not search_results:
            return {
                "success": False,
                "error": "No search results to process",
                "processing_time_seconds": time.time() - start_time
            }
        
        self._notify_progress("开始处理搜索结果", 0)
        
        # 提取内容
        documents = self.content_extractor.extract_from_search_results(search_results)
        self._notify_progress("内容提取完成", 20)
        if not documents:
            return {
                "success": False,
                "error": "No content extracted",
                "processing_time_seconds": time.time() - start_time
            }
        
        # 处理文档（清洗）
        processed_documents = self.document_processor.process_documents_batch(documents)
        self._notify_progress("文档处理完成", 40)
        if not processed_documents:
            return {
                "success": False,
                "error": "No documents processed",
                "processing_time_seconds": time.time() - start_time
            }

        # 统一验证
        validated_documents = []
        for doc in processed_documents:
            ok, detail = self.quality_evaluator.validate_document_text(
                doc.page_content, title=doc.metadata.get("title", "")
            )
            if ok:
                # 只保留核心质量分数，不存储复杂的验证结果
                doc.metadata["quality_score"] = detail.get("overall_quality_score", 0.0)
                validated_documents.append(doc)
        self._notify_progress("文档质量验证完成", 60)
        if not validated_documents:
            return {
                "success": False,
                "error": "No documents passed unified validation",
                "processing_time_seconds": time.time() - start_time
            }
        
        # 分块
        chunks = self.text_splitter.split_documents_batch(validated_documents)
        self._notify_progress("文档分块完成", 80)
        if not chunks:
            return {
                "success": False,
                "error": "No chunks created",
                "processing_time_seconds": time.time() - start_time
            }
        
        # 存储
        storage_result = self.vectorstore.add_documents_optimized(chunks)
        self._notify_progress("数据存储完成", 100)
        
        # 更新统计
        self.stats.total_documents_extracted += len(documents)
        self.stats.total_documents_processed += len(processed_documents)
        self.stats.total_chunks_created += len(chunks)
        self.stats.total_chunks_stored += storage_result["added"]
        self.stats.last_update = datetime.now().isoformat()
        
        return {
            "success": True,
            "processing_time_seconds": time.time() - start_time,
            "search_results": len(search_results),
            "documents_extracted": len(documents),
            "documents_processed": len(processed_documents),
            "chunks_created": len(chunks),
            "storage_result": storage_result,
            "stats": self.stats.__dict__.copy()
        }
    
    def get_knowledge_base_status(self) -> Dict[str, Any]:
        """获取知识库状态"""
        try:
            # 获取向量数据库统计
            vectorstore_stats = self.vectorstore.get_collection_stats()
            
            # 获取处理器统计
            processing_stats = self.stats.__dict__.copy()
            
            # 获取搜索器统计
            search_stats = {
                "processed_urls": self.tavily_searcher.get_processed_urls_count()
            }
            
            return {
                "vectorstore": vectorstore_stats,
                "processing": processing_stats,
                "search": search_stats,
                "last_check": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting knowledge base status: {e}", exc_info=True)
            return {"error": str(e)}
    
    def clear_knowledge_base(self) -> Dict[str, Any]:
        """清空知识库（慎用）"""
        try:
            logger.warning("Clearing entire knowledge base")
            
            # 清空向量数据库
            vectorstore_cleared = self.vectorstore.clear_collection()
            
            # 清空搜索器缓存
            self.tavily_searcher.clear_processed_urls()
            
            # 重置统计
            self.stats = KnowledgeBaseStats()
            
            return {
                "success": vectorstore_cleared,
                "message": "Knowledge base cleared" if vectorstore_cleared else "Failed to clear knowledge base",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error clearing knowledge base: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    def _execute_step(self, step_name: str, step_func, context: Dict, *args) -> Dict:
        """执行单个步骤并处理错误"""
        try:
            result = step_func(context, *args)
            if not result.get('success', True):
                raise ProcessingError(step_name, result.get('error', 'Unknown error'), result.get('stats', {}))
            return result
        except ProcessingError:
            raise
        except Exception as e:
            raise ProcessingError(step_name, str(e))
    
    def _step_search_urls(self, context: Dict, categories: Optional[List[DreamSearchCategory]], max_urls: int) -> Dict:
        """步骤1: 搜索URL"""
        queries = DreamSearchTemplates.generate_comprehensive_queries(categories)
        search_results = self.tavily_searcher.search_dream_knowledge(queries, max_urls_total=max_urls)
        
        self.stats.total_searches += 1
        self.stats.total_urls_found += len(search_results)
        
        if not search_results:
            return {"success": False, "error": "No search results found"}
            
        logger.info(f"Found {len(search_results)} URLs to process")
        context['search_results'] = search_results
        return {"success": True, "search_results": search_results}
    
    def _step_extract_content(self, context: Dict) -> Dict:
        """步骤2: 提取内容"""
        search_results = context['search_results']
        documents = self.content_extractor.extract_from_search_results(search_results)
        
        self.stats.total_documents_extracted += len(documents)
        
        if not documents:
            return {"success": False, "error": "No content extracted"}
            
        logger.info(f"Extracted content from {len(documents)} documents")
        context['documents'] = documents
        return {"success": True, "documents": documents}
    
    def _step_process_documents(self, context: Dict) -> Dict:
        """步骤3: 处理文档"""
        documents = context['documents']
        processed_documents = self.document_processor.process_documents_batch(documents)
        
        self.stats.total_documents_processed += len(processed_documents)
        
        if not processed_documents:
            return {"success": False, "error": "No documents processed"}
            
        logger.info(f"Processed {len(processed_documents)} documents")
        context['processed_documents'] = processed_documents
        return {"success": True, "processed_documents": processed_documents}
    
    def _step_filter_document_quality(self, context: Dict) -> Dict:
        """步骤4: 对完整文档进行质量过滤"""
        processed_documents = context['processed_documents']
        validated_documents = []
        
        for doc in processed_documents:
            ok, detail = self.quality_evaluator.validate_document_text(
                doc.page_content, title=doc.metadata.get("title", "")
            )
            if ok:
                # 只保留核心质量分数，不存储复杂的验证结果
                doc.metadata["quality_score"] = detail.get("overall_quality_score", 0.0)
                validated_documents.append(doc)
        
        if not validated_documents:
            return {"success": False, "error": "No documents passed quality filtering"}
            
        logger.info(f"Quality filtered {len(validated_documents)} documents (from {len(processed_documents)})")
        context['validated_documents'] = validated_documents
        return {"success": True, "validated_documents": validated_documents}
    
    def _step_split_documents(self, context: Dict) -> Dict:
        """步骤5: 分割已验证的文档"""
        validated_documents = context['validated_documents']
        all_chunks = self.text_splitter.split_documents_batch(validated_documents)
        
        self.stats.total_chunks_created += len(all_chunks)
        
        if not all_chunks:
            return {"success": False, "error": "No chunks created from validated documents"}
            
        logger.info(f"Created {len(all_chunks)} chunks from {len(validated_documents)} validated documents")
        context['chunks'] = all_chunks
        return {"success": True, "chunks": all_chunks}
    
    def _step_store_chunks(self, context: Dict) -> Dict:
        """步骤6: 存储分块"""
        chunks = context['chunks']
        storage_result = self.vectorstore.add_documents_optimized(chunks)
        
        self.stats.total_chunks_stored += storage_result.get("added", 0)
        
        logger.info(f"Stored {storage_result.get('added', 0)} chunks")
        context['storage_result'] = storage_result
        return {"success": True, "storage_result": storage_result}
    
    def _build_final_result(self, context: Dict, start_time: float) -> Dict:
        """构建最终结果"""
        # 更新统计
        self.stats.update_success_rate()
        self.stats.last_update = datetime.now().isoformat()
        
        total_time = time.time() - start_time
        self.stats.total_processing_time += total_time
        
        # 构建结果
        result = {
            "success": True,
            "stats": {
                "urls_found": len(context.get('search_results', [])),
                "documents_extracted": len(context.get('documents', [])),
                "documents_processed": len(context.get('processed_documents', [])),
                "documents_validated": len(context.get('validated_documents', [])),
                "chunks_created": len(context.get('chunks', [])),
                "chunks_stored": context.get('storage_result', {}).get("added", 0),
                "chunks_duplicates": context.get('storage_result', {}).get("duplicates", 0),
                "processing_time_seconds": round(total_time, 2),
                "success_rate_percent": self.stats.success_rate
            },
            "vectorstore_result": context.get('storage_result', {}),
            "extraction_metrics": self.content_extractor.get_extraction_metrics(),
            "search_metrics": self.tavily_searcher.get_search_metrics()
        }
        
        logger.info(f"Knowledge base construction completed successfully in {total_time:.2f}s")
        return result

    def close_services(self):
        """V3.2: 显式关闭所有依赖的服务，确保资源被释放"""
        logger.info("Closing all knowledge base services...")
        if self.tavily_searcher:
            try:
                self.tavily_searcher.close()
            except Exception as e:
                logger.error(f"Error closing Tavily searcher: {e}", exc_info=True)
        
        if self.content_extractor:
            try:
                self.content_extractor.close()
            except Exception as e:
                logger.error(f"Error closing content extractor: {e}", exc_info=True)
        logger.info("All knowledge base services closed.")


# 单例实例
_kb_manager = None

def get_knowledge_base_manager() -> DreamKnowledgeBaseManager:
    """获取知识库管理器单例"""
    global _kb_manager
    if _kb_manager is None:
        _kb_manager = DreamKnowledgeBaseManager()
    return _kb_manager

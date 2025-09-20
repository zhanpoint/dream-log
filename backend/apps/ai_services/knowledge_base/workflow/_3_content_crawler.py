"""
FireCrawl内容抓取器
用于从URL抓取高质量的网页内容，具备智能重试、内容验证和批量处理能力
"""
import logging
import time
from typing import List, Dict, Optional
import hashlib
from urllib.parse import urlparse
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, as_completed
import re
from collections import defaultdict
import os

from langchain_core.documents import Document
from firecrawl import FirecrawlApp

from ...config import PROXY_URL
from config.env_loader import env
from ..quality_assessment import UnifiedQualityEvaluator

logger = logging.getLogger(__name__)



@dataclass
class ExtractionMetrics:
    """内容抓取指标统计"""
    total_urls: int = 0
    successful_extractions: int = 0
    failed_extractions: int = 0
    avg_extraction_time: float = 0.0
    avg_content_length: int = 0
    quality_scores: List[float] = field(default_factory=list)
    error_types: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    
    def update_extraction_time(self, extraction_time: float):
        """更新平均抓取时间"""
        if self.successful_extractions == 0:
            self.avg_extraction_time = extraction_time
        else:
            self.avg_extraction_time = (
                (self.avg_extraction_time * (self.successful_extractions - 1) + extraction_time) 
                / self.successful_extractions
            )


@dataclass
class ExtractionConfig:
    """抓取配置"""
    max_workers: int = 10  # 最大并发数
    request_interval: float = 0.2  # 请求间隔时间
    min_content_length: int = 250  # 最小内容字符长度
    max_content_length: int = 100000  # 最大内容字符长度
    enable_content_validation: bool = True  # 是否启用内容验证
    

class FireCrawlContentExtractor:
    """FireCrawl内容提取器 - 优化版本"""
    
    def __init__(self, config: ExtractionConfig = None):
        """
        初始化FireCrawl提取器
        
        Args:
            config: 抓取配置
        """    
        # V3.4 - 代理配置
        if PROXY_URL:
            os.environ['HTTP_PROXY'] = PROXY_URL
            os.environ['HTTPS_PROXY'] = PROXY_URL
        
        self.config = config or ExtractionConfig()
        
        # 并发控制
        self.executor = ThreadPoolExecutor(max_workers=self.config.max_workers)
        
        # 请求限流
        self.last_request_time = 0.0
        
        # 指标统计
        self.metrics = ExtractionMetrics()
        
        # 内容质量评估器（统一）
        self.quality_evaluator = UnifiedQualityEvaluator()

        # 初始化 Firecrawl 客户端（新版 SDK）
        firecrawl_api_key = env('FIRECRAWL_API_KEY', default='')
        if not firecrawl_api_key:
            raise ValueError("FIRECRAWL_API_KEY is required")
        self.firecrawl_app = FirecrawlApp(api_key=firecrawl_api_key)
        
    def _ensure_executor_is_active(self):
        """确保线程池执行器是活跃的，如果已关闭则重新创建"""
        # V3.3 - 修复Celery环境下单例导致“cannot schedule new futures after shutdown”的错误
        if not hasattr(self, 'executor') or self.executor._shutdown:
            logger.info("ThreadPoolExecutor for FireCrawl was shut down or missing. Re-creating a new one.")
            self.executor = ThreadPoolExecutor(max_workers=self.config.max_workers)
    
    def _wait_for_rate_limit(self):
        """等待满足请求频率限制"""
        current_time = time.time()
        elapsed = current_time - self.last_request_time
        if elapsed < self.config.request_interval:
            wait_time = self.config.request_interval - elapsed
            logger.debug(f"Rate limiting: waiting {wait_time:.2f} seconds")
            time.sleep(wait_time)
        self.last_request_time = time.time()
    
    def _extract_enhanced_metadata(self, url: str, content: str, title: str = "") -> Dict:
        """
        从内容中提取核心元数据
        
        Args:
            url: 网页URL
            content: 网页内容
            title: 网页标题
            
        Returns:
            元数据字典
        """
        # 生成文档哈希
        document_hash = hashlib.sha256(content.encode()).hexdigest()

        # 质量评估（统一）
        quality_evaluation = self.quality_evaluator.evaluate_content(content, title, url)

        return {
            "source_url": url,
            "title": title,
            "document_hash": document_hash,
            "quality_score": quality_evaluation.get("overall_score", 0.0),
        }
    
    def _extract_content(self, url: str) -> Optional[Document]:
        """
        从URL提取内容
        
        Args:
            url: 要抓取的URL
            
        Returns:
            提取的文档，如果失败则返回None
        """
        try:
            # 等待频率限制
            self._wait_for_rate_limit()
            
            start_time = time.time()
            
            scrape_result = self.firecrawl_app.scrape_url(
                url,
                formats=["markdown"],
                only_main_content=True,
                remove_base64_images=True,
                include_tags=["article", "main", "content", "section", "div", "p", "h1", "h2", "h3", "h4", "h5", "h6"],
                exclude_tags=["nav", "footer", "aside", "header", "advertisement", "popup", "sidebar", "menu"],
                wait_for=3000,
                timeout=30000
            )

            if scrape_result.success:
                content = scrape_result.markdown or ""
                title = scrape_result.metadata.get("title") or " "
            else:
                logger.error(f"Failed to scrape URL: {url}")
                return None

            if not content or not content.strip():
                logger.warning(f"No content extracted from URL: {url}")
                return None

            # 基本内容验证
            if len(content.strip()) < self.config.min_content_length:
                logger.warning(f"Content too short from URL: {url} ({len(content)} chars)")
                return None
            
            # 内容长度检查
            if len(content) > self.config.max_content_length:
                logger.warning(f"Content too long from URL: {url}, truncating...")
                content = content[:self.config.max_content_length]
            
            # 提取增强元数据
            enhanced_metadata = self._extract_enhanced_metadata(url, content, title)
            
            # 创建LangChain文档，直接使用完整元数据
            doc = Document(page_content=content, metadata=enhanced_metadata)
            
            # 质量检查
            if self.config.enable_content_validation:
                quality_score = enhanced_metadata["quality_score"]
                if quality_score < 0.3:
                    logger.warning(f"Low quality content from URL: {url} (score: {quality_score:.2f})")
                    return None
            
            # 更新指标
            extraction_time = time.time() - start_time
            self.metrics.successful_extractions += 1
            self.metrics.update_extraction_time(extraction_time)
            self.metrics.avg_content_length = (
                (self.metrics.avg_content_length * (self.metrics.successful_extractions - 1) + 
                 len(doc.page_content)) / self.metrics.successful_extractions
            )
            self.metrics.quality_scores.append(enhanced_metadata["quality_score"])
            
            logger.info(f"Successfully extracted content from {url} "
                       f"(quality: {enhanced_metadata['quality_score']:.2f}, "
                       f"time: {extraction_time:.2f}s)")
            
            return doc
            
        except Exception as e:
            error_type = type(e).__name__
            self.metrics.error_types[error_type] += 1
            
            logger.error(f"Error extracting content from {url}: {e}")
            
            self.metrics.failed_extractions += 1
            logger.error(f"Failed to extract content from {url}")
            return None
    
    def extract_content_from_url(self, url: str) -> Optional[Document]:
        """
        从单个URL提取内容
        
        Args:
            url: 要抓取的URL
            
        Returns:
            提取的文档，如果失败则返回None
        """
        self.metrics.total_urls += 1
        
        return self._extract_content(url)
    
    def extract_content_batch(self, urls: List[str], 
                            enable_parallel: bool = True,
                            max_concurrent: int = None) -> List[Document]:
        """
        批量提取内容
        
        Args:
            urls: URL列表
            enable_parallel: 是否启用并行处理
            max_concurrent: 最大并发数
            
        Returns:
            成功提取的文档列表
        """
        if not urls:
            return []
        
        self._ensure_executor_is_active()
        
        max_concurrent = max_concurrent or self.config.max_workers
        
        documents = []
        
        if enable_parallel and len(urls) > 1:
            executor = self.executor
            future_to_url = {
                executor.submit(self.extract_content_from_url, url): url 
                for url in urls
            }
            
            # 收集结果
            for future in as_completed(future_to_url):
                url = future_to_url[future]
                try:
                    doc = future.result(timeout=60)  # 60秒超时
                    if doc:
                        documents.append(doc)
                    else:
                        logger.debug(f"✗ Failed to process: {url}")
                except Exception as e:
                    logger.error(f"✗ Error processing {url}: {e}")
                    continue
        else:
            # 串行处理
            for i, url in enumerate(urls):
                try:
                    doc = self.extract_content_from_url(url)
                    if doc:
                        documents.append(doc)
                        logger.debug(f"✓ Successfully processed: {url}")
                    else:
                        logger.debug(f"✗ Failed to process: {url}")
                except Exception as e:
                    logger.error(f"✗ Error processing {url}: {e}")
                    continue
                
        return documents
    
    def extract_from_search_results(self, search_results: List[Dict], 
                                   enable_parallel: bool = True) -> List[Document]:
        """
        从搜索结果中提取内容
        
        Args:
            search_results: Tavily搜索结果列表
            enable_parallel: 是否启用并行处理
            
        Returns:
            提取的文档列表
        """
        if not search_results:
            return []
        
        urls = [result.get("url") for result in search_results if result.get("url")]

        documents = self.extract_content_batch(urls, enable_parallel=enable_parallel)
        
        # 优化标题信息：如果firecrawl未获取到标题，使用搜索结果的标题作为备用
        url_to_search_result = {result.get("url"): result for result in search_results}
        
        for doc in documents:
            source_url = doc.metadata.get("source_url")
            if source_url in url_to_search_result:
                search_result = url_to_search_result[source_url]
                
                # 如果文档标题为空，使用搜索标题
                if not doc.metadata.get("title") and search_result.get("title"):
                    doc.metadata["title"] = search_result.get("title")
        
        return documents
    
    def get_extraction_metrics(self) -> Dict:
        """
        获取抓取指标统计
        
        Returns:
            指标统计字典
        """
        success_rate = (self.metrics.successful_extractions / self.metrics.total_urls * 100) if self.metrics.total_urls > 0 else 0.0
        avg_quality = sum(self.metrics.quality_scores) / len(self.metrics.quality_scores) if self.metrics.quality_scores else 0.0
        
        return {
            "total_urls": self.metrics.total_urls,
            "successful_extractions": self.metrics.successful_extractions,
            "failed_extractions": self.metrics.failed_extractions,
            "success_rate_percent": round(success_rate, 2),
            "avg_extraction_time_seconds": round(self.metrics.avg_extraction_time, 2),
            "avg_content_length": self.metrics.avg_content_length,
            "avg_quality_score": round(avg_quality, 3),
            "error_types": dict(self.metrics.error_types),
            "config": {
                "max_workers": self.config.max_workers,
                "request_interval": self.config.request_interval,
                "min_content_length": self.config.min_content_length,
                "max_content_length": self.config.max_content_length,
                "enable_content_validation": self.config.enable_content_validation
            }
        }
    
    def reset_metrics(self):
        """重置抓取指标"""
        self.metrics = ExtractionMetrics()
        logger.info("Reset extraction metrics")
    
    def close(self):
        """V3.2: 显式关闭资源，替代不可靠的__del__"""
        logger.info("Closing FireCrawlContentExtractor resources...")
        try:
            if hasattr(self, 'executor') and self.executor:
                self.executor.shutdown(wait=False)
                logger.info("FireCrawl content extractor thread pool shut down.")
        except Exception as e:
            logger.error(f"Error during FireCrawlContentExtractor cleanup: {e}", exc_info=True)


# 单例实例
_content_extractor = None

def get_content_extractor(config: ExtractionConfig = None) -> FireCrawlContentExtractor:
    """
    获取内容提取器单例
    
    Args:
        config: 抓取配置
        
    Returns:
        FireCrawlContentExtractor实例
    """
    global _content_extractor
    if _content_extractor is None:
        _content_extractor = FireCrawlContentExtractor(config=config)
        logger.info(f"Initialized FireCrawl content extractor with config: {config or 'default'}")
    return _content_extractor

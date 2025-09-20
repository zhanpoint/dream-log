"""
Tavily搜索服务
用于获取高质量的梦境相关URL和内容，具备智能去重、质量评估和缓存机制
"""
import logging
import time
from typing import List, Dict, Set, Optional, Union
import hashlib
from urllib.parse import urlparse
from dataclasses import dataclass, field
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
import json
import os
import httpx

from langchain_tavily import TavilySearch

from ...config import PROCESSED_URLS_FILE_PATH, PROXY_URL
from config.env_loader import env
from ..quality_assessment import UnifiedQualityEvaluator
logger = logging.getLogger(__name__)


@dataclass
class SearchMetrics:
    """搜索指标统计"""
    total_searches: int = 0  # 总搜索次数
    successful_searches: int = 0  # 成功搜索次数
    total_results: int = 0  # 总结果数
    filtered_results: int = 0  # 过滤后的结果数
    duplicate_results: int = 0  # 重复结果数
    avg_response_time: float = 0.0  # 平均响应时间
    quality_scores: List[float] = field(default_factory=list)  # 质量分数列表
    
    def update_response_time(self, response_time: float):
        """更新平均响应时间"""
        if self.total_searches == 0:
            self.avg_response_time = response_time
        else:
            self.avg_response_time = (
                (self.avg_response_time * (self.total_searches - 1) + response_time) 
                / self.total_searches
            )


@dataclass
class SearchResult:
    """搜索结果数据结构"""
    url: str  # 网页URL
    title: str  # 网页标题
    content: str  # 网页内容
    score: float  # 搜索分数
    content_hash: str  # 内容哈希
    domain: str  # 域名
    quality_score: float = 0.0  # 质量分数


class TavilyDreamSearcher:
    """Tavily梦境知识搜索器"""
    
    def __init__(self, max_workers: int = 6):
        """
        初始化Tavily搜索器
        
        Args:
            max_workers: 最大并发搜索数
        """
        tavily_api_key = env('TAVILY_API_KEY', default='')
        if not tavily_api_key:
            raise ValueError("TAVILY_API_KEY is required")
        
        # V3.4 - 代理配置
        api_wrapper_kwargs = {}
        if PROXY_URL:
            # 配置httpx客户端以使用代理 - 修复httpx 0.28.0+版本兼容性
            api_wrapper_kwargs['client'] = httpx.Client(
                transport=httpx.HTTPTransport(proxy=PROXY_URL, retries=3), 
                timeout=30.0,
                verify=False  # 禁用SSL证书验证，解决代理环境下的SSLError
            )

        # 遵循Tavily最佳实践的高质量域名配置
        # 专注于权威的心理学、神经科学和学术资源
        self.high_quality_domains = [
            # 权威心理学网站
            "psychologytoday.com",
            "apa.org",  # American Psychological Association
            "simplypsychology.org",
            
            # 医学和健康权威网站
            "healthline.com",
            "sleepfoundation.org",
            "mayoclinic.org",
            "webmd.com",
            
            # 学术和科学期刊
            "ncbi.nlm.nih.gov",  # PubMed
            "nature.com",
            "sciencedirect.com",
            "springer.com",
            "jstor.org",
            "scientificamerican.com",
        ]
        
        # 明确排除的低质量域名
        self.excluded_domains = [
            # 中文低质量内容网站
            "baidu.com",
            "zhihu.com",  # 用户生成内容
            "douban.com", # 社交网络
            
            # 英文低质量解梦网站
            "dreammoods.com",
            "dreamdictionary.org",
            "dreambible.com",
            "dreamstop.com",
            "dreamlookup.com",
            
            # 论坛和社交媒体
            "reddit.com",
            "quora.com",
            "yahoo.com",
            
            # 商业化/广告网站
            "wikihow.com",
            "ehow.com"
        ]
        
        # API配置 - 遵循Tavily最佳实践
        self.search_tool = TavilySearch(
            api_key=tavily_api_key,
            max_results=5,  # 适中的结果数量，平衡质量和多样性
            search_depth="advanced",  # 高级搜索获得更好的内容质量
            include_answer=False,  # 确保返回搜索结果列表
            include_raw_content=True,  # 包含原始内容用于质量评估
            include_domains=self.high_quality_domains,  # 限制高质量域名
            exclude_domains=self.excluded_domains,  # 排除低质量域名
            api_wrapper_kwargs=api_wrapper_kwargs  # 注入代理客户端
        )
        
        # 并发控制
        self.executor = ThreadPoolExecutor(max_workers=max_workers) # 设置最大并发数
        self.max_workers = max_workers # 设置最大并发数
        
        # 缓存和去重
        self.processed_urls: Set[str] = set() # 设置已处理URL集合
        
        # 质量评估
        self._domain_scores = defaultdict(float)  # 域名质量分数缓存
        
        # 指标统计
        self.metrics = SearchMetrics()
        
        # 优化请求限流策略，平衡速度和API限制
        self.last_request_time = 0.0  
        self.min_request_interval = 0.3  # 减少间隔以提高效率，但避免触发限制

        # 统一质量评估器
        self.quality_evaluator = UnifiedQualityEvaluator()

        # 自动加载已处理的URL
        self.import_processed_urls(PROCESSED_URLS_FILE_PATH)
    
    def _ensure_executor_is_active(self):
        """确保线程池执行器是活跃的，如果已关闭则重新创建"""
        # V3.3 - 修复Celery环境下单例导致“cannot schedule new futures after shutdown”的错误
        if not hasattr(self, 'executor') or self.executor._shutdown:
            logger.info("ThreadPoolExecutor for Tavily was shut down or missing. Re-creating a new one.")
            self.executor = ThreadPoolExecutor(max_workers=self.max_workers)

    def _wait_for_rate_limit(self):
        """等待满足请求频率限制"""
        current_time = time.time()
        elapsed = current_time - self.last_request_time
        if elapsed < self.min_request_interval:
            wait_time = self.min_request_interval - elapsed
            logger.debug(f"Rate limiting: waiting {wait_time:.2f} seconds")
            time.sleep(wait_time)
        self.last_request_time = time.time()
    
    def _normalize_url(self, url: str) -> str:
        """标准化URL用于去重""" 
        try:
            # 解析URL，返回一个包含URL各部分的命名元组
            parsed = urlparse(url)
            # 移除查询参数和片段，只保留协议（scheme）、域名（netloc）和路径（path）
            normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            # 去掉末尾的 / ，确保URL格式一致
            return normalized.rstrip('/')
        except Exception as e:
            logger.warning(f"Failed to normalize URL {url}: {e}")
            return url
    
    def _validate_url(self, url: str) -> bool:
        """
        验证URL是否有效且可抓取
        
        Args:
            url: 要验证的URL
            
        Returns:
            是否为有效且适合抓取的URL
        """
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return False
            
            # 只支持HTTP和HTTPS
            if parsed.scheme not in ['http', 'https']:
                return False
            
            # 1. 文件类型过滤 - 扩展列表
            excluded_extensions = [
                # 文档类型
                '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.csv',
                '.txt', '.rtf', '.odt', '.ods', '.odp',
                # 压缩文件
                '.zip', '.rar', '.tar', '.gz', '.7z', '.bz2', '.xz',
                # 媒体文件
                '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
                '.wav', '.aac', '.ogg', '.m4a', '.m4v',
                # 图片文件
                '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
                '.tiff', '.ico', '.ico',
                # 可执行文件
                '.exe', '.dmg', '.pkg', '.deb', '.rpm', '.msi', '.app',
                # 其他
                '.xml', '.json', '.yaml', '.yml', '.sql', '.db', '.sqlite'
            ]
            
            url_lower = url.lower()
            if any(url_lower.endswith(ext) for ext in excluded_extensions):
                logger.debug(f"Skipping file URL: {url}")
                return False
            
            # 2. 域名质量评估
            domain = parsed.netloc.lower()
            domain_score = self._calculate_domain_score(domain)
            
            # 如果域名质量分数过低，直接拒绝
            if domain_score < 0.2:
                logger.debug(f"Skipping low-quality domain: {domain} (score: {domain_score:.2f})")
                return False
            
            # 3. URL结构分析
            path = parsed.path.lower()
            query = parsed.query.lower()
            
            # 排除明显的非内容页面
            non_content_indicators = [
                '/login', '/signin', '/register', '/signup', '/logout',
                '/admin', '/dashboard', '/profile', '/account', '/settings',
                '/cart', '/checkout', '/payment', '/order',
                '/search', '/filter', '/sort', '/category',
                '/api/', '/ajax/', '/json/', '/xml/',
                '/feed', '/rss', '/atom', '/sitemap',
                '/robots.txt', '/favicon.ico', '/ads.txt'
            ]
            
            if any(indicator in path for indicator in non_content_indicators):
                logger.debug(f"Skipping non-content URL: {url}")
                return False
            
            # 4. 查询参数分析
            if query:
                # 排除包含特定参数的URL（通常是动态生成的页面）
                excluded_params = ['utm_', 'ref_', 'source=', 'campaign=', 'medium=']
                if any(param in query for param in excluded_params):
                    logger.debug(f"Skipping URL with tracking parameters: {url}")
                    return False
            
            return True
            
        except Exception as e:
            logger.warning(f"Invalid URL format: {url} - {e}")
            return False

    def _calculate_domain_score(self, domain: str) -> float:
        """
        计算域名质量分数
        
        Args:
            domain: 域名
            
        Returns:
            质量分数(0-1)
        """
        if domain in self._domain_scores:
            return self._domain_scores[domain]
        score = self.quality_evaluator.score_domain(domain)
        self._domain_scores[domain] = score
        return score
    
    def _calculate_content_quality_score(self, url: str, title: str = "", content: str = "", tavily_score: Optional[float] = None) -> float:
        """
        计算内容质量分数
        
        Args:
            url: 网页URL
            title: 网页标题
            content: 网页内容摘要
            tavily_score: Tavily返回的原始分数
            
        Returns:
            质量分数(0-1)
        """
        # 使用统一质量评估器进行评分
        return self.quality_evaluator.score_search_result(
            url=url, 
            title=title or "", 
            snippet=content or "",
            tavily_score=tavily_score
        )
    
    def _is_high_quality_url(self, url: str, title: str = "", content: str = "") -> bool:
        """
        判断URL是否为高质量内容
        
        Args:
            url: 网页URL
            title: 网页标题
            content: 网页内容摘要
            
        Returns:
            是否为高质量内容
        """
        quality_score = self._calculate_content_quality_score(url, title, content)
        return quality_score >= self.quality_evaluator.config.min_search_quality_threshold
    

    def _convert_to_search_result(self, raw_result: Dict) -> Optional[SearchResult]:
        """
        将原始搜索结果转换为SearchResult对象
        
        Args:
            raw_result: 原始搜索结果
            
        Returns:
            SearchResult对象
        """
        url = raw_result.get("url", "")
        if not url or not self._validate_url(url):
            logger.debug(f"Skipping invalid or non-validatable URL: {url}")
            return None

        title = raw_result.get("title", "")
        content = raw_result.get("content", "")
        score = raw_result.get("score", 0.0)
        
        # 计算质量分数
        quality_score = self._calculate_content_quality_score(url, title, content, tavily_score=score)
        
        # 生成内容哈希
        content_hash = hashlib.md5(content.encode()).hexdigest()
        
        # 提取域名
        domain = urlparse(url).netloc
        
        return SearchResult(
            url=url,
            title=title,
            content=content,
            score=score,
            content_hash=content_hash,
            domain=domain,
            quality_score=quality_score
        )
    
    def _deduplicate_results(self, results: List[SearchResult]) -> List[SearchResult]:
        """
        去除重复的搜索结果
        
        Args:
            results: 搜索结果列表
            
        Returns:
            去重后的结果列表
        """
        # 最终去重结果列表
        unique_results = []
        # 本次有效：确保在处理当前这批次的几百条结果时，同一个URL不会被重复添加。
        seen_urls = set()

        seen_content_hashes = set()
        
        # 先按质量分数排序，优先保留高质量结果，再进行URL和内容去重
        sorted_results = sorted(results, key=lambda r: r.quality_score, reverse=True)
        
        for result in sorted_results:
            # 通过URL 标准化，提升去重准确性
            normalized_url = self._normalize_url(result.url)
            
            # URL去重
            if normalized_url in seen_urls or normalized_url in self.processed_urls:
                self.metrics.duplicate_results += 1
                logger.debug(f"Skipped duplicate URL: {normalized_url}")
                continue
            
            # 内容去重
            if result.content_hash in seen_content_hashes:
                self.metrics.duplicate_results += 1
                logger.debug(f"Skipped duplicate content: {result.content_hash[:16]}...")
                continue
            
            # 更新集合
            seen_urls.add(normalized_url)
            seen_content_hashes.add(result.content_hash)
            unique_results.append(result)
            
            logger.debug(f"Added unique result: {normalized_url} (quality: {result.quality_score:.2f})")
        
        return unique_results
    
    def _search_single_query(self, query: str) -> List[SearchResult]:
        """
        执行单个查询搜索
        
        Args:
            query: 搜索查询
            
        Returns:
            搜索结果列表
        """
        start_time = time.time()
        
        try:
            # 等待频率限制
            self._wait_for_rate_limit()
            
            # 执行搜索
            search_results = self.search_tool.invoke(query)
            
            # 解析结果
            if isinstance(search_results, list):
                results = search_results
            elif isinstance(search_results, dict) and "results" in search_results:
                results = search_results["results"]
            else:
                logger.warning(
                    f"Unexpected search result format for query: '{query}'. "
                    f"Received type: {type(search_results)}. "
                    f"Content(truncated): {str(search_results)[:250]}"
                )
                return []
            
            # 转换为SearchResult对象
            search_result_objects = []
            for result in results:
                search_result_obj = self._convert_to_search_result(result)
                
                # 如果URL无效或转换失败，则跳过
                if not search_result_obj:
                    continue

                # 质量过滤
                if search_result_obj.quality_score >= 0.3:
                    search_result_objects.append(search_result_obj)
                    self.metrics.quality_scores.append(search_result_obj.quality_score)
                else:
                    self.metrics.filtered_results += 1
                    logger.debug(f"Filtered low quality result: {search_result_obj.url} "
                               f"(score: {search_result_obj.quality_score:.2f})")
            
            # 更新指标
            self.metrics.total_searches += 1
            self.metrics.successful_searches += 1
            self.metrics.total_results += len(results)
            self.metrics.update_response_time(time.time() - start_time)
            
            logger.info(f"Query '{query}' returned {len(search_result_objects)} quality results "
                       f"(filtered {len(results) - len(search_result_objects)})")
            
            return search_result_objects
            
        except Exception as e:
            self.metrics.total_searches += 1
            logger.error(f"Error searching query '{query}': {e}", exc_info=True)
            return []
    
    def search_dream_knowledge(self, 
                             queries: List[str], 
                             max_urls_total: int = 10,
                             enable_parallel: bool = True) -> List[Dict]:
        """
        V3.0 - 搜索梦境知识相关内容，遵循Tavily最佳实践
        
        Args:
            queries: 优化的搜索查询列表（每个<400字符）
            max_urls_total: 最大URL总数
            enable_parallel: 是否启用并行搜索
            
        Returns:
            搜索结果列表，包含URL、标题、内容等信息
        """
        self._ensure_executor_is_active()
        all_search_results = []
        
        if enable_parallel and len(queries) > 1:
            # 优化的并行搜索 - 使用as_completed处理所有查询
            from concurrent.futures import as_completed
            
            # V3.2 修复: 不能在 with 语句中使用共享的 self.executor,
            # 因为 with 语句会在代码块结束时自动调用 executor.shutdown()。
            # 这会导致在第二次调用此方法时，执行器已关闭，从而引发 RuntimeError。
            # 共享的执行器应该由类的 __del__ 方法来管理其生命周期。
            executor = self.executor
            
            # 提交所有查询任务
            future_to_query = {
                executor.submit(self._search_single_query, query): query 
                for query in queries  # 处理所有查询，不限制数量
            }
            
            # 使用as_completed实时处理返回的结果
            for future in as_completed(future_to_query, timeout=60):
                try:
                    results = future.result(timeout=15)  # 单个任务15秒超时
                    all_search_results.extend(results)
                    
                    query = future_to_query[future]
                    
                    # 一旦达到限制就立即停止
                    if len(all_search_results) >= max_urls_total:
                        
                        # 取消剩余的未完成任务
                        for remaining_future in future_to_query:
                            if not remaining_future.done():
                                remaining_future.cancel()
                        break
                        
                except Exception as e:
                    query = future_to_query[future]
                    logger.warning(f"Future for query '{query}' generated an exception: {e}")
                    continue
        else:
            # 串行搜索
            for query in queries:
                if len(all_search_results) >= max_urls_total:
                    break
                
                results = self._search_single_query(query)
                all_search_results.extend(results)
        
        # 去重和排序
        unique_results = self._deduplicate_results(all_search_results)
        
        # 限制结果数量
        if len(unique_results) > max_urls_total:
            unique_results = unique_results[:max_urls_total]
        
        # V3.7: 如果去重后没有新结果，但原始结果存在，表明所有内容都是重复的
        if not unique_results and all_search_results:
            logger.info("All search results were duplicates of already processed URLs. No new content to process.")
            return [] # 返回空列表，上层会处理此情况

        # 更新已处理URL集合
        for result in unique_results:
            normalized_url = self._normalize_url(result.url)
            self.processed_urls.add(normalized_url)
        
        # 转换回字典格式以保持兼容性
        dict_results = []
        for result in unique_results:
            dict_result = {
                "url": result.url,
                "title": result.title,
                "content": result.content,
                "score": result.score,
                "content_hash": result.content_hash,
                "quality_score": result.quality_score,
                "domain": result.domain
            }
            dict_results.append(dict_result)
        
        return dict_results
    
    def get_search_metrics(self) -> Dict:
        """
        获取搜索指标统计
        
        Returns:
            指标统计字典
        """
        avg_quality = sum(self.metrics.quality_scores) / len(self.metrics.quality_scores) if self.metrics.quality_scores else 0.0
        success_rate = (self.metrics.successful_searches / self.metrics.total_searches * 100) if self.metrics.total_searches > 0 else 0.0
        
        return {
            "total_searches": self.metrics.total_searches,
            "successful_searches": self.metrics.successful_searches,
            "success_rate_percent": round(success_rate, 2),
            "total_results": self.metrics.total_results,
            "filtered_results": self.metrics.filtered_results,
            "duplicate_results": self.metrics.duplicate_results,
            "avg_response_time_seconds": round(self.metrics.avg_response_time, 2),
            "avg_quality_score": round(avg_quality, 3),
            "processed_urls_count": len(self.processed_urls),
            "domain_scores_cached": len(self._domain_scores)
        }
    
    def get_processed_urls_count(self) -> int:
        """获取已处理的URL数量"""
        return len(self.processed_urls)
    
    def clear_processed_urls(self):
        """清空知识库时清理URL缓存，并删除本地文件"""
        self.processed_urls.clear()
        logger.info("Cleared in-memory processed URLs cache")
        
        # 删除本地存储的文件
        if os.path.exists(PROCESSED_URLS_FILE_PATH):
            try:
                os.remove(PROCESSED_URLS_FILE_PATH)
                logger.info(f"Successfully deleted processed URLs file: {PROCESSED_URLS_FILE_PATH}")
            except OSError as e:
                logger.error(f"Error deleting processed URLs file {PROCESSED_URLS_FILE_PATH}: {e}")

    # 由于当前梦境知识库构建是分批次、长时间进行的，所以需要导出在多次运行脚本之间保存和加载已经处理过的 URL 列表，避免重复抓取同一个网页。
    def export_processed_urls(self, file_path: str = None) -> Union[List[str], bool]:
        """
        导出已处理的URL列表
        
        Args:
            file_path: 导出文件路径，None表示返回列表
            
        Returns:
            URL列表或导出成功状态
        """
        urls = list(self.processed_urls)
        
        if file_path is None:
            return urls
        try:
            # 确保目录存在
            dir_name = os.path.dirname(file_path)
            if dir_name:
                os.makedirs(dir_name, exist_ok=True)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "processed_urls": urls,
                    "exported_at": time.time(),
                    "total_count": len(urls)
                }, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Exported {len(urls)} processed URLs to {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to export processed URLs: {e}")
            return False
    
    def import_processed_urls(self, file_path: str) -> bool:
        """
        V3.1 - 导入已处理的URL列表，增强对文件不存在或损坏情况的包容性
        
        Args:
            file_path: 导入文件路径
            
        Returns:
            导入成功状态
        """
        try:
            # 文件不存在是首次运行的正常情况，直接返回成功
            if not os.path.exists(file_path):
                logger.info(f"Processed URLs file not found at {file_path}. Starting fresh (normal for first run).")
                return True

            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 校验文件格式
            if "processed_urls" in data and isinstance(data["processed_urls"], list):
                self.processed_urls.update(data["processed_urls"])
                logger.info(f"Imported {len(data['processed_urls'])} processed URLs from {file_path}")
            else:
                logger.warning(f"Invalid format in processed URLs file: {file_path}. Starting fresh.")
        
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to decode JSON from {file_path}: {e}. File might be corrupt, starting fresh.")
        except Exception as e:
            logger.error(f"An unexpected error occurred while importing processed URLs from {file_path}: {e}", exc_info=True)
            return False # For unexpected errors, we should probably fail.
        
        return True
    
    def close(self):
        """V3.2: 显式关闭资源并保存进度，替代不可靠的__del__"""
        logger.info("Closing TavilyDreamSearcher resources and saving progress...")
        try:
            # 1. 自动保存已处理的URL
            if self.processed_urls:
                self.export_processed_urls(PROCESSED_URLS_FILE_PATH)
            
            # 2. 关闭线程池
            if hasattr(self, 'executor') and self.executor:
                self.executor.shutdown(wait=False)
                logger.info("Tavily searcher thread pool shut down.")
        except Exception as e:
            logger.error(f"Error during TavilyDreamSearcher cleanup: {e}", exc_info=True)


# 单例实例
_tavily_searcher = None

def get_tavily_searcher(max_workers: int = 3) -> TavilyDreamSearcher:
    """
    获取Tavily搜索器单例
    
    Args:
        max_workers: 最大并发工作线程数
        
    Returns:
        TavilyDreamSearcher实例
    """
    global _tavily_searcher
    if _tavily_searcher is None:
        _tavily_searcher = TavilyDreamSearcher(max_workers=max_workers)
    return _tavily_searcher

"""
梦境知识库相关的Celery异步任务
用于定期自动更新和维护知识库
"""
import logging
import time
from datetime import datetime
from typing import List, Optional, Dict, Any
from datetime import datetime

from config.celery import app
from ..knowledge_base.manager import get_knowledge_base_manager
from ..prompts.knowledge_base_search_prompts import COMMON_DREAM_SYMBOLS
from ..knowledge_base.utils import convert_category_names_to_enums


logger = logging.getLogger(__name__)


@app.task(bind=True, name="build_comprehensive_knowledge_base")
def build_comprehensive_knowledge_base_task(self, 
                                          categories: Optional[List[str]] = None,
                                          max_urls: int = 100) -> Dict[str, Any]:
    """
    构建全面梦境知识库的异步任务
    
    Args:
        categories: 要搜索的类别列表
        max_urls: 最大URL数量
        
    Returns:
        构建结果字典
    """
    try:
        # 转换字符串类别为枚举（统一工具函数）
        category_enums = convert_category_names_to_enums(categories) if categories else None
        
        # 获取知识库管理器并执行构建
        manager = get_knowledge_base_manager()
        result = manager.build_comprehensive_knowledge_base(
            categories=category_enums,
            max_urls=max_urls
        )
        
        # 添加任务信息
        result.update({
            "task_id": self.request.id,
            "task_name": "build_comprehensive_knowledge_base",
            "completed_at": datetime.now().isoformat()
        })
        
        if result["success"]:
            logger.info(f"Knowledge base build task completed successfully: "
                       f"{result.get('storage_result', {}).get('added', 0)} chunks added")
        else:
            logger.error(f"Knowledge base build task failed: {result.get('error', 'Unknown error')}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error in knowledge base build task: {e}", exc_info=True)
        
        # 重试逻辑
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying task in {self.default_retry_delay} seconds "
                       f"(attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(countdown=self.default_retry_delay, exc=e)
        
        return {
            "success": False,
            "error": str(e),
            "task_id": self.request.id,
            "task_name": "build_comprehensive_knowledge_base",
            "completed_at": datetime.now().isoformat(),
            "retries_exhausted": True
        }


@app.task(bind=True, name="update_knowledge_base_incremental")
def update_knowledge_base_incremental_task(self, 
                                         categories: Optional[List[str]] = None,
                                         max_new_urls: int = 20) -> Dict[str, Any]:
    """
    增量更新知识库的异步任务
    
    Args:
        categories: 要更新的类别列表
        max_new_urls: 最大新URL数量
        
    Returns:
        更新结果字典
    """
    try:
        # 转换字符串类别为枚举（统一工具函数）
        category_enums = convert_category_names_to_enums(categories) if categories else None
        
        # 执行增量更新
        manager = get_knowledge_base_manager()
        result = manager.update_knowledge_base_incremental(
            categories=category_enums,
            max_new_urls=max_new_urls
        )
        
        # 添加任务信息
        result.update({
            "task_id": self.request.id,
            "task_name": "update_knowledge_base_incremental",
            "completed_at": datetime.now().isoformat()
        })
        
        if result["success"]:
            logger.info(f"Incremental update task completed successfully: "
                       f"{result.get('storage_result', {}).get('added', 0)} new chunks added")
        else:
            logger.warning(f"Incremental update task completed with issues: {result.get('error', 'Unknown error')}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error in incremental update task: {e}", exc_info=True)
        
        # 重试逻辑
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying task in {self.default_retry_delay} seconds "
                       f"(attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(countdown=self.default_retry_delay, exc=e)
        
        return {
            "success": False,
            "error": str(e),
            "task_id": self.request.id,
            "task_name": "update_knowledge_base_incremental",
            "completed_at": datetime.now().isoformat(),
            "retries_exhausted": True
        }


@app.task(bind=True, name="build_symbol_knowledge_base")
def build_symbol_knowledge_base_task(self, symbols: List[str] = None, max_urls_per_symbol: int = 10):
    """
    为特定梦境象征构建知识库 - V2.0 优化版
    - 确保资源在使用后被正确关闭
    - 聚合所有象征的处理结果
    """
    task_id = self.request.id
    logger.info(f"Starting symbol knowledge base build task {task_id} for symbols: {symbols}")
    
    start_time = time.time()
    kb_manager = None
    
    try:
        # 在try块中获取管理器，确保finally能访问到
        kb_manager = get_knowledge_base_manager()
        
        # 如果没有提供symbols，使用默认列表
        if not symbols:
            symbols = COMMON_DREAM_SYMBOLS[:3] # 默认处理3个象征
            logger.info(f"No symbols provided, using default list: {symbols}")

        # 一次性处理所有symbols
        results = kb_manager.build_symbol_specific_knowledge_base(
            symbols=symbols,
            max_urls_symbol=max_urls_per_symbol
        )

        final_result = {
            "success": results.get("success", False),
            "task_id": task_id,
            "task_name": "build_symbol_knowledge_base",
            "symbols_processed": symbols,
            "results": results,
            "processing_time_seconds": round(time.time() - start_time, 2),
            "completed_at": datetime.now().isoformat(),
        }
        
        logger.info(f"Symbol knowledge base build task {task_id} completed successfully.")
        return final_result

    except Exception as e:
        logger.error(f"Critical error in build_symbol_knowledge_base_task {task_id}: {e}", exc_info=True)
        # 返回失败结果
        return {
            "success": False,
            "task_id": task_id,
            "task_name": "build_symbol_knowledge_base",
            "symbols_processed": symbols,
            "error": str(e),
            "processing_time_seconds": round(time.time() - start_time, 2),
            "completed_at": datetime.now().isoformat(),
        }
        
    finally:
        # 确保在任务结束时关闭所有服务
        if kb_manager:
            logger.info("Closing all knowledge base services...")
            kb_manager.close_services()
            logger.info("All knowledge base services closed.")

"""
梦境分析服务 - 纯异步实现
核心业务逻辑层，处理梦境分析的完整流程，基于asyncio架构。
移除gevent兼容代码，专注于与LangChain的asyncio集成。
"""
import logging
import asyncio
from typing import Dict, Any, Optional
from django.core.cache import cache
from django.utils import timezone

from ..chains.dream_analysis_chain import get_dream_analysis_chain
from ..config import RAG_ENABLED
from ..prompts.dream_analysis_prompts import DreamAnalysisPrompts

logger = logging.getLogger(__name__)


class DreamAnalysisService:
    """梦境分析服务类 - 异步实现"""
    
    def __init__(self):
        """初始化梦境分析服务"""
        self.analysis_chain = None  # 延迟初始化
        
    async def _ensure_chain_initialized(self):
        """确保分析链已初始化"""
        if self.analysis_chain is None:
            from ..chains.dream_analysis_chain import get_dream_analysis_chain
            self.analysis_chain = await get_dream_analysis_chain()
    
    def prepare_dream_data_for_analysis(self, dream_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        为分析准备梦境数据，确保所有必需字段都存在
        
        Args:
            dream_data: 原始梦境数据
            
        Returns:
            处理后的梦境数据
        """
        # 确保基础字段存在
        prepared_data = {
            'id': dream_data.get('id'),
            'title': dream_data.get('title', '未命名梦境'),
            'content': dream_data.get('content', ''),
            'categories': dream_data.get('categories', []),
            'tags': dream_data.get('tags', []),
            'lucidity_level': dream_data.get('lucidity_level', 1),
            'vividness': dream_data.get('vividness', 3),
            'mood_before_sleep': dream_data.get('mood_before_sleep', 'unknown'),
            'mood_in_dream': dream_data.get('mood_in_dream', 'unknown'),
            'mood_after_waking': dream_data.get('mood_after_waking', 'unknown'),
            'sleep_quality': dream_data.get('sleep_quality', 3),
            'personal_notes': dream_data.get('personal_notes', ''),
            # 显示名称字段
            'mood_before_sleep_display': dream_data.get('mood_before_sleep_display', '未知'),
            'mood_in_dream_display': dream_data.get('mood_in_dream_display', '未知'),
            'mood_after_waking_display': dream_data.get('mood_after_waking_display', '未知'),
            'lucidity_level_display': dream_data.get('lucidity_level_display', f"{dream_data.get('lucidity_level', 1)}/5"),
            'sleep_quality_display': dream_data.get('sleep_quality_display', f"{dream_data.get('sleep_quality', 3)}/5"),
        }
        
        return prepared_data
    
    def start_async_analysis(self, dream_data: Dict[str, Any], websocket_channel_id: str) -> Dict[str, Any]:
        """
        启动异步梦境分析任务
        
        Args:
            dream_data: 梦境数据（已在前端验证）
            websocket_channel_id: WebSocket频道ID
            
        Returns:
            任务启动结果
        """
        try:
            prepared_data = self.prepare_dream_data_for_analysis(dream_data)
            
            from ..tasks.dream_analysis_tasks import analyze_dream_task
            task = analyze_dream_task.apply_async(args=(prepared_data, websocket_channel_id))
            
            cache_key = f"analysis_task:{task.id}"
            cache.set(cache_key, {
                'status': 'started',
                'websocket_channel': websocket_channel_id,
                'use_rag': RAG_ENABLED,
                'created_at': str(timezone.now())
            }, timeout=600)
            
            return {
                'success': True,
                'task_id': task.id,
                'status': 'started',
                'message': '梦境分析已开始，请等待结果'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'启动分析失败: {str(e)}'
            }
    
    async def perform_analysis(self, dream_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行梦境分析（核心异步分析逻辑）
        
        Args:
            dream_data: 梦境数据
        
        Returns:
            分析结果
        """
        try:
            await self._ensure_chain_initialized()
            
            if RAG_ENABLED:
                # 1) 异步查询扩展
                expansion_result = await self.analysis_chain.aexpand_queries(dream_data)

                # 2) 格式化输入
                formatted_data = DreamAnalysisPrompts.format_dream_data_for_analysis(dream_data)

                # 3) 异步知识检索
                retrieved_knowledge = "无法获取相关知识库信息"
                if expansion_result and expansion_result.primary_queries:
                    retrieval_result = await self.analysis_chain.rag_retriever.aretrieve_documents(
                        expansion_result.primary_queries
                    )
                    retrieved_knowledge = self.analysis_chain.rag_retriever.format_retrieved_knowledge(
                        retrieval_result
                    ) if retrieval_result else "未找到相关知识库信息"

                formatted_data['retrieved_knowledge'] = retrieved_knowledge

                # 4) 异步最终分析
                analysis_result = await self.analysis_chain.analysis_chain.ainvoke(formatted_data)
            else:
                # 不使用 RAG，直接格式化 + 异步分析
                formatted_data = DreamAnalysisPrompts.format_dream_data_for_analysis(dream_data)
                formatted_data['retrieved_knowledge'] = "本次分析基于梦境描述进行，未使用知识库增强"
                analysis_result = await self.analysis_chain.analysis_chain.ainvoke(formatted_data)
            
            if not analysis_result:
                return {
                    'success': False,
                    'error': '分析执行失败，请重试'
                }
            
            # 准备结果
            result = {
                'success': True,
                'analysis_result': analysis_result.model_dump() if analysis_result else None,
                'used_rag': RAG_ENABLED,
                'from_cache': False
            }
            
            return result
            
        except Exception as e:
            logger.error(f"异步分析过程出错: {e}", exc_info=True)
            return {
                'success': False,
                'error': f'分析过程中出错: {str(e)}'
            }
    
    def cancel_analysis(self, task_id: str) -> Dict[str, Any]:
        """
        取消分析任务
        
        Args:
            task_id: 任务ID
            
        Returns:
            取消结果
        """
        try:
            from celery.result import AsyncResult
            result = AsyncResult(task_id)
            
            if result.ready():
                return {'success': True, 'message': '任务已完成，无需取消'}
            
            result.revoke(terminate=True)
            cache.delete(f"analysis_task:{task_id}")
            
            return {'success': True, 'message': '任务已成功取消'}
            
        except Exception as e:
            logger.error(f"取消分析任务失败 {task_id}: {e}")
            return {'success': False, 'error': f'取消任务失败: {str(e)}'}


# 全局服务实例
_dream_analysis_service = None


def get_dream_analysis_service() -> DreamAnalysisService:
    """获取梦境分析服务实例（轻量级版本，仅用于Django视图启动任务）"""
    global _dream_analysis_service
    if _dream_analysis_service is None:
        _dream_analysis_service = DreamAnalysisService()
    return _dream_analysis_service

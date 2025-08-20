"""
梦境分析服务
核心业务逻辑层，处理梦境分析的完整流程
"""
import logging
from typing import Dict, Any
from django.core.cache import cache
from django.utils import timezone
from channels.layers import get_channel_layer

from ..chains.dream_analysis_chain import get_dream_analysis_chain
from ..config import RAG_ENABLED

logger = logging.getLogger(__name__)


class DreamAnalysisService:
    """梦境分析服务类"""
    
    def __init__(self):
        """初始化梦境分析服务"""
        self.analysis_chain = get_dream_analysis_chain()
        self.channel_layer = get_channel_layer()
    
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
            # 准备数据（确保所有必需字段都存在）
            prepared_data = self.prepare_dream_data_for_analysis(dream_data)
            
            # 启动异步任务（动态导入避免循环引用）
            from ..tasks.dream_analysis_tasks import analyze_dream_task
            # 生成唯一task_id,创建任务消息,发送到队列,立即返回AsyncResult对象
            # task 是 AsyncResult 对象，包含：
            # - task.id: 任务ID (UUID字符串)
            # - task.status: 当前状态 ('PENDING')
            # - task.result: 结果 (None，因为还没执行)
            task = analyze_dream_task.delay(prepared_data, websocket_channel_id)
            
            # 缓存任务信息
            cache_key = f"analysis_task:{task.id}"
            cache.set(cache_key, {
                'status': 'started',
                'websocket_channel': websocket_channel_id,
                'use_rag': RAG_ENABLED,
                'created_at': str(timezone.now())
            }, timeout=600)  # 10分钟超时
            
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
    
    def perform_analysis(self, dream_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行梦境分析（核心分析逻辑）
        
        Args:
            dream_data: 梦境数据
            
        Returns:
            分析结果
        """
        try:
            # 执行分析
            if RAG_ENABLED:
                analysis_result = self.analysis_chain.analyze_dream_with_rag(dream_data)
            else:
                analysis_result = self.analysis_chain.analyze_dream_simple(dream_data)
            
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
                return {
                    'success': False,
                    'message': '任务已完成，无法取消'
                }
            
            # 取消任务
            result.revoke(terminate=True)
            
            # 清理缓存
            cache_key = f"analysis_task:{task_id}"
            cache.delete(cache_key)
            
            logger.info(f"Analysis task {task_id} cancelled")
            
            return {
                'success': True,
                'message': '任务已成功取消'
            }
            
        except Exception as e:
            logger.error(f"Error cancelling analysis task {task_id}: {e}", exc_info=True)
            return {
                'success': False,
                'error': f'取消任务失败: {str(e)}'
            }


# 全局服务实例
_dream_analysis_service = None


def get_dream_analysis_service() -> DreamAnalysisService:
    """获取梦境分析服务实例"""
    global _dream_analysis_service
    if _dream_analysis_service is None:
        _dream_analysis_service = DreamAnalysisService()
    return _dream_analysis_service

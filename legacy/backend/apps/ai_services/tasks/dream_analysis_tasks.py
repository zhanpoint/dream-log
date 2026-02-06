"""
梦境分析 Celery 异步任务 - 纯异步实现
委托 Service 层处理核心业务逻辑；任务层负责状态推进与 WebSocket 通知。
使用 asyncio.run() 在 prefork worker 中运行纯异步代码，彻底解决 gevent/asyncio 冲突。
"""
import logging
import time
import json
import asyncio
from typing import Dict, Any
from celery import shared_task
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist

logger = logging.getLogger(__name__)


class DreamAnalysisStatus:
    """梦境分析状态常量"""
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    ERROR = "error"


@shared_task(bind=True, max_retries=2)
def analyze_dream_task(self, dream_data: Dict[str, Any], websocket_channel_id: str) -> Dict[str, Any]:
    """
    梦境分析异步任务 - 纯异步实现
    - 使用 asyncio.run() 在 prefork worker 中运行纯异步代码
    - 彻底解决 gevent/asyncio 事件循环冲突
    
    Args:
        dream_data: 梦境数据（前端已校验与裁剪）
        websocket_channel_id: WebSocket 房间组 ID（用户专属）
    
    Returns:
        任务执行结果
    """
    # 在 prefork worker 中使用 asyncio.run() 执行异步任务
    return asyncio.run(_async_analyze_dream_task(self, dream_data, websocket_channel_id))


async def _async_analyze_dream_task(task_self, dream_data: Dict[str, Any], websocket_channel_id: str) -> Dict[str, Any]:
    """
    内部异步分析任务实现
    """
    task_id = task_self.request.id

    async def send_final_result(status: str, data: Any):
        """发送最终分析结果"""
        try:
            result_message = {
                'type': 'dream_analysis_update',
                'task_id': task_id,
                'status': status,
                'data': data,
                'timestamp': time.time()
            }

            await _send_websocket_update_async(websocket_channel_id, result_message)

        except Exception as e:
            logger.error(f"发送WebSocket结果失败: {e}")

    try:
        # 动态导入 Service 层避免循环引用
        from ..services.dream_analysis_service import get_dream_analysis_service
        service = get_dream_analysis_service()
        await service._ensure_chain_initialized()

        # 执行异步核心分析逻辑
        try:
            analysis_result = await service.perform_analysis(dream_data)

            if analysis_result and analysis_result['success']:
                # 分析成功，保存到数据库
                await _save_analysis_to_database_async(dream_data, analysis_result['analysis_result'])

                # 发送最终成功结果
                result_data = {
                    'analysis_result': analysis_result['analysis_result'],
                    'used_rag': analysis_result.get('used_rag', False),
                    'processing_time': time.time()
                }

                await send_final_result(DreamAnalysisStatus.COMPLETED, result_data)

                return {
                    'success': True,
                    'task_id': task_id,
                    'result': result_data
                }
            else:
                # 分析失败
                error_msg = analysis_result.get('error', '分析执行失败') if analysis_result else "分析未返回结果"
                await send_final_result(DreamAnalysisStatus.ERROR, {'error': error_msg})

                return {
                    'success': False,
                    'error': error_msg,
                    'task_id': task_id
                }

        except Exception as run_err:
            logger.error(f"梦境分析失败: {run_err}", exc_info=True)
            error_msg = f"分析执行时发生内部错误: {run_err}"
            await send_final_result(DreamAnalysisStatus.ERROR, {'error': error_msg})
            
            return {
                'success': False,
                'error': error_msg,
                'task_id': task_id
            }

    except Exception as e:
        # 统一错误处理
        logger.error(f"梦境分析任务顶层错误: {e}", exc_info=True)
        error_msg = f"分析过程中发生严重错误: {str(e)}"
        await send_final_result(DreamAnalysisStatus.ERROR, {'error': error_msg})

        # 重试逻辑
        if task_self.request.retries < task_self.max_retries:
            raise task_self.retry(countdown=60, exc=e)

        return {
            'success': False,
            'error': error_msg,
            'task_id': task_id,
            'retries_exhausted': True
        }


async def _send_websocket_update_async(websocket_channel_id: str, message: Dict[str, Any]) -> None:
    """
    异步发送WebSocket更新
    
    Args:
        websocket_channel_id: WebSocket频道ID
        message: 消息内容
    """
    try:
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        if channel_layer:
            logger.info(f"发送WebSocket消息到 {websocket_channel_id}: {message}")
            await channel_layer.group_send(
                websocket_channel_id,
                {
                    'type': 'dream_analysis_update',
                    'message': message
                }
            )
            logger.info("WebSocket消息发送成功")
        else:
            logger.error("Channel layer未配置")
    except Exception as e:
        logger.error(f"异步WebSocket消息发送失败: {e}", exc_info=True)


async def _save_analysis_to_database_async(dream_data: Dict[str, Any], analysis_result: Dict[str, Any]) -> None:
    """
    异步将AI分析结果保存到数据库
    
    Args:
        dream_data: 梦境数据，必须包含id字段
        analysis_result: AI分析结果
    """
    try:
        from asgiref.sync import sync_to_async
        await sync_to_async(_save_analysis_to_database_sync)(dream_data, analysis_result)
    except Exception as e:
        logger.error(f"保存分析结果失败: {e}")
        raise


@transaction.atomic
def _save_analysis_to_database_sync(dream_data: Dict[str, Any], analysis_result: Dict[str, Any]) -> None:
    """将AI分析结果保存到数据库"""
    from apps.dream.models import Dream
    
    dream_id = dream_data.get('id')
    if not dream_id:
        return
        
    dream = Dream.objects.get(id=dream_id)
    dream.ai_analysis = json.dumps(analysis_result, ensure_ascii=False)
    dream.save(update_fields=['ai_analysis'])


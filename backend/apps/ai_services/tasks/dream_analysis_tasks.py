"""
梦境分析Celery异步任务
委托给Service层处理核心业务逻辑，任务层只负责异步执行和状态管理
"""
import logging
import time
from typing import Dict, Any
from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


class DreamAnalysisStatus:
    """梦境分析状态常量"""
    STARTING = "starting"
    QUERY_EXPANSION = "query_expansion"
    RETRIEVING = "retrieving"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    ERROR = "error"


@shared_task(bind=True, soft_time_limit=300, time_limit=360, max_retries=3)
def analyze_dream_task(self, dream_data: Dict[str, Any], websocket_channel_id: str, use_rag: bool = True) -> Dict[str, Any]:
    """
    梦境分析异步任务
    🔥这个函数在独立的Celery worker中异步执行，不会阻塞Django view
    Args:
        dream_data: 梦境数据（已在前端验证和准备）
        websocket_channel_id: WebSocket频道ID
        use_rag: 是否使用RAG增强
        
    Returns:
        分析结果
    """
    task_id = self.request.id # 获取的是Celery在.delay()调用时立即生成的UUID
    channel_layer = get_channel_layer()
    
    def send_update(status: str, data: Any = None, progress: int = 0):
        """发送WebSocket更新"""
        try:
            update_message = {
                'type': 'dream_analysis_update',  # Django Channels要求消息处理器方法名必须与消息类型完全一致。
                'task_id': task_id,
                'status': status,
                'progress': progress,
                'data': data,
                'timestamp': time.time()
            }
            
            # 🔥 这是异步非阻塞调用
            # 因为 Django view 是同步函数，这里用 async_to_sync() 把异步调用转成同步
            async_to_sync(channel_layer.group_send)(
                websocket_channel_id,  # 用户专属房间组标识符
                update_message
            )
            # ↓ 立即继续执行下一行，不等待WebSocket发送完成

            logger.info(f"Sent WebSocket update: {status} (progress: {progress}%)")
            # ↓ 函数结束，返回到调用处继续执行
            
        except Exception as e:
            logger.error(f"Failed to send WebSocket update: {e}")
    
    # 步骤1: 发送开始状态 (非阻塞)
    send_update(DreamAnalysisStatus.STARTING, progress=5)
    
    try:
        # 动态导入Service层避免循环引用
        from ..services.dream_analysis_service import get_dream_analysis_service
        service = get_dream_analysis_service()
        
        # 步骤2: 扩展查询 (非阻塞)
        send_update(DreamAnalysisStatus.QUERY_EXPANSION, progress=20)

        # 步骤3: 检索数据 (非阻塞)
        send_update(DreamAnalysisStatus.RETRIEVING, progress=40)
        
        # 步骤4: 分析 (非阻塞)
        send_update(DreamAnalysisStatus.ANALYZING, progress=60)
        
        # 步骤5: 执行分析 (非阻塞)
        analysis_result = service.perform_analysis(dream_data, use_rag=use_rag)
        
        if analysis_result['success']:
            # 分析成功
            result_data = {
                'analysis_result': analysis_result['analysis_result'],
                'used_rag': analysis_result.get('used_rag', use_rag),
                'processing_time': time.time()
            }
            # 步骤6: 发送完成状态 (非阻塞)
            send_update(DreamAnalysisStatus.COMPLETED, result_data, progress=100)
            logger.info(f"Dream analysis task {task_id} completed successfully")
            
            return {
                'success': True,
                'task_id': task_id,
                'result': result_data
            }
        else:
            # 分析失败
            error_msg = analysis_result.get('error', '分析执行失败')
            # 步骤7: 发送错误状态 (非阻塞)
            send_update(DreamAnalysisStatus.ERROR, {'error': error_msg}, progress=100)
            
            return {
                'success': False,
                'error': error_msg,
                'task_id': task_id
            }
    
    except SoftTimeLimitExceeded:
        error_msg = "分析任务超时，请稍后重试"
        logger.warning(f"Dream analysis task {task_id} timed out")
        send_update(DreamAnalysisStatus.ERROR, {'error': error_msg}, progress=100)
        
        return {
            'success': False,
            'error': error_msg,
            'task_id': task_id
        }
    
    except Exception as e:
        error_msg = f"分析过程中发生错误: {str(e)}"
        logger.error(f"Dream analysis task {task_id} failed: {e}", exc_info=True)
        send_update(DreamAnalysisStatus.ERROR, {'error': error_msg}, progress=100)
        
        # 重试逻辑
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying dream analysis task {task_id} (attempt {self.request.retries + 1})")
            raise self.retry(countdown=60, exc=e)
        
        return {
            'success': False,
            'error': error_msg,
            'task_id': task_id,
            'retries_exhausted': True
        }

"""
梦境分析Celery异步任务
委托给Service层处理核心业务逻辑，任务层只负责异步执行和状态管理
"""
import logging
import time
import json
import threading
from typing import Dict, Any
from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist

logger = logging.getLogger(__name__)


class DreamAnalysisStatus:
    """梦境分析状态常量"""
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    ERROR = "error"


class ProgressUpdater:
    """
    线程安全的进度更新管理器
    负责在独立线程中发送平滑的进度更新
    """
    
    # 诗意化进度消息
    PROGRESS_MESSAGES = [
        "AI正在解读你的梦境...",
        "梦境分析进行中...",
        "洞察正在浮现...",
        "分析即将完成..."
    ]
    
    def __init__(self, send_update_func):
        """
        初始化进度更新器
        
        Args:
            send_update_func: 发送更新的函数
        """
        # 发送更新的函数
        self.send_update = send_update_func
        # 用于停止线程的Event对象
        self.stop_event = threading.Event()
        # 进度更新线程
        self.progress_thread = None
    
    def start(self):
        """启动进度更新线程"""
        # target指定新线程启动后要执行的函数，daemon=True表示新线程是守护线程，当主线程结束时，不会等待它执行完，直接退出
        self.progress_thread = threading.Thread(target=self._update_progress, daemon=True)
        # 启动线程
        self.progress_thread.start()
    
    def stop(self):
        """停止进度更新线程"""
        # set() 会把事件标志设为 True，在后台线程里，_update_progress 会定期检查 self.stop_event.is_set()，如果为 True 就主动退出循环。
        self.stop_event.set()
        # 最多等待1秒，如果线程还没结束，就继续往下执行（不会无限阻塞主线程）
        if self.progress_thread:
            self.progress_thread.join(timeout=1.0)
    
    def _update_progress(self):
        """平滑进度更新的线程函数"""
        # 为4条消息设计的进度节点：25%, 50%, 75%, 90%
        progress_points = [25, 50, 75, 90]
        
        for i, message in enumerate(self.PROGRESS_MESSAGES):
            # 立即返回、非阻塞的检查。防止在 stop() 被调用后，还发送一次多余的进度更新。
            if self.stop_event.is_set():
                break

            # 使用预定义的进度点
            progress = progress_points[i]
            self.send_update(DreamAnalysisStatus.ANALYZING, {'message': message}, progress)
            
            # 调整等待时间：4条消息，每条间隔2.5秒，总共约10秒
            if self.stop_event.wait(timeout=2.5):
                break


@shared_task(bind=True, soft_time_limit=60, time_limit=120, max_retries=2, acks_late=True, reject_on_worker_lost=True)
def analyze_dream_task(self, dream_data: Dict[str, Any], websocket_channel_id: str) -> Dict[str, Any]:
    """
    梦境分析异步任务
    使用独立线程进行平滑进度更新，同时并行执行AI分析
    
    Args:
        dream_data: 梦境数据（已在前端验证和准备）
        websocket_channel_id: WebSocket频道ID
        
    Returns:
        分析结果
    """
    task_id = self.request.id
    channel_layer = get_channel_layer()
    
    def send_update(status: str, data: Any = None, progress: int = 0):
        """发送WebSocket更新"""
        try:
            update_message = {
                'type': 'dream_analysis_update',
                'task_id': task_id,
                'status': status,
                'progress': progress,
                'data': data,
                'timestamp': time.time()
            }
            
            async_to_sync(channel_layer.group_send)(
                websocket_channel_id,
                update_message
            )
            
        except Exception as e:
            logger.error(f"Failed to send WebSocket update: {e}")
    
    try:
        # 动态导入Service层避免循环引用
        from ..services.dream_analysis_service import get_dream_analysis_service
        service = get_dream_analysis_service()
        
        # 启动进度更新器
        progress_updater = ProgressUpdater(send_update)
        progress_updater.start()
        
        # 执行实际分析（并行进行）
        analysis_result = service.perform_analysis(dream_data)
        
        # 停止进度更新器
        progress_updater.stop()
        
        if analysis_result['success']:
            # 分析成功，保存到数据库
            _save_analysis_to_database(dream_data, analysis_result['analysis_result'])
            
            result_data = {
                'analysis_result': analysis_result['analysis_result'],
                'used_rag': analysis_result.get('used_rag', False),
                'processing_time': time.time()
            }
            
            # 确保进度到达100%
            send_update(DreamAnalysisStatus.COMPLETED, result_data, progress=100)
            
            return {
                'success': True,
                'task_id': task_id,
                'result': result_data
            }
        else:
            # 分析失败
            error_msg = analysis_result.get('error', '分析执行失败')
            send_update(DreamAnalysisStatus.ERROR, {'error': error_msg}, progress=100)
            
            return {
                'success': False,
                'error': error_msg,
                'task_id': task_id
            }
    
    except SoftTimeLimitExceeded:
        # 确保进度更新器安全停止
        if 'progress_updater' in locals():
            progress_updater.stop()
        
        error_msg = "分析任务超时，请稍后重试"
        send_update(DreamAnalysisStatus.ERROR, {'error': error_msg}, progress=100)
        
        return {
            'success': False,
            'error': error_msg,
            'task_id': task_id
        }
    
    except Exception as e:
        # 确保进度更新器安全停止
        if 'progress_updater' in locals():
            progress_updater.stop()
        
        error_msg = f"分析过程中发生错误: {str(e)}"
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


@transaction.atomic
def _save_analysis_to_database(dream_data: Dict[str, Any], analysis_result: Dict[str, Any]) -> None:
    """
    将AI分析结果保存到数据库
    
    Args:
        dream_data: 梦境数据，必须包含id字段
        analysis_result: AI分析结果
    """
    try:
        # 动态导入避免循环引用
        from apps.dream.models import Dream
        
        dream_id = dream_data.get('id')
        if not dream_id:
            logger.warning(f"Dream ID not found in dream_data. Keys: {list(dream_data.keys())}")
            return
            
        dream = Dream.objects.get(id=dream_id)
        dream.ai_analysis = json.dumps(analysis_result, ensure_ascii=False)
        dream.save(update_fields=['ai_analysis'])
        
        logger.info(f"Successfully saved AI analysis result to dream {dream_id}")
        
    except ObjectDoesNotExist:
        logger.error(f"Dream with ID {dream_id} does not exist")
    except Exception as e:
        logger.error(f"Failed to save AI analysis result: {e}")
        raise


# 删除了手动触发的Celery任务，现在只使用实时分析

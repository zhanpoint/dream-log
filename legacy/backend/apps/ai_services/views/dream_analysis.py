"""
梦境分析视图
只处理HTTP请求/响应，数据序列化和认证授权，业务逻辑委托给Service层
"""
import logging
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..services.dream_analysis_service import get_dream_analysis_service

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def start_dream_analysis_view(request):
    """
    启动梦境分析
    
    请求参数:
        - dream_data: 梦境数据字典（必需）
    说明:
        - WebSocket 房间组 ID 由后端依据用户 ID 自动生成，无需前端传入
    """
    try:
        data = request.data
        
        # 获取服务实例
        service = get_dream_analysis_service()
        
        # 参数解析和验证
        dream_data = data.get('dream_data')
        
        # 验证必需参数
        if not dream_data:
            return Response({
                'success': False,
                'error': '必须提供 dream_data'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 自动生成用户专属的房间组名称，与 WebSocket 消费者保持一致
        websocket_channel_id = f"dream_analysis_group_{request.user.id}"
        
        # 执行异步分析
        result = service.start_async_analysis(
            dream_data=dream_data,
            websocket_channel_id=websocket_channel_id
        )
        
        # 返回响应
        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error in start_dream_analysis_view: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': '服务器内部错误，请稍后重试'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_analysis_view(request, task_id):
    """
    取消分析任务
    
    路径参数:
        - task_id: 任务ID
    """
    try:
        if not task_id:
            return Response({
                'success': False,
                'error': '任务ID不能为空'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 获取服务实例
        service = get_dream_analysis_service()
        
        # 取消任务
        result = service.cancel_analysis(task_id)
        
        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error in cancel_analysis_view: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': '取消任务失败'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

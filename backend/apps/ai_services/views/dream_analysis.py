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
        - use_rag: 是否使用RAG增强（可选，默认True）
        - websocket_channel_id: WebSocket频道ID（必需）
    """
    try:
        data = request.data
        
        # 获取服务实例
        service = get_dream_analysis_service()
        
        # 参数解析和验证
        dream_data = data.get('dream_data')
        use_rag = data.get('use_rag', True)
        websocket_channel_id = data.get('websocket_channel_id')
        
        # 验证必需参数
        if not dream_data:
            return Response({
                'success': False,
                'error': '必须提供 dream_data'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not websocket_channel_id:
            return Response({
                'success': False,
                'error': '必须提供 websocket_channel_id'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 执行异步分析
        result = service.start_async_analysis(
            dream_data=dream_data,
            websocket_channel_id=websocket_channel_id,
            use_rag=use_rag
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_analysis_status_view(request, task_id):
    """
    获取分析任务状态，仅用于HTTP轮询备用机制，不用于WebSocket实时更新
    
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
        
        # 获取状态
        status_info = service.get_analysis_status(task_id)
        
        return Response({
            'success': True,
            'status_info': status_info
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in get_analysis_status_view: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': '获取状态失败'
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

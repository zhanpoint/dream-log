"""
梦境标题生成视图
只处理HTTP请求/响应和数据验证，业务逻辑委托给Service层
"""
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..services.generate_dream_title import get_dream_title_service

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_title_view(request):
    """
    生成梦境标题
    
    请求参数:
        - dream_content: 梦境内容（必需）
    """
    try:
        data = request.data
        
        # 获取服务实例
        service = get_dream_title_service()
        
        # 参数解析
        dream_content = data.get('dream_content').strip()
        
        # 执行标题生成
        result = service.generate_title(dream_content)
        
        # 返回响应
        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error in generate_title_view: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': '标题生成服务暂时不可用，请稍后重试'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



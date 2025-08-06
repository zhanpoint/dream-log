import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..services.generate_dream_title import generate_dream_title

logger = logging.getLogger(__name__)

# 定义内容长度常量
MIN_CONTENT_LENGTH = 25
ERROR_CONTENT_TOO_SHORT = f"梦境内容需要至少 {MIN_CONTENT_LENGTH} 个字符才能生成标题"
ERROR_GENERATION_FAILED = "抱歉，无法为您的梦境生成合适的标题，请尝试手动输入。"
ERROR_INTERNAL = "抱歉，生成标题时遇到了一个内部错误。"

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_title_view(request):
    """
    AI生成梦境标题的API视图。
    接收梦境内容，返回AI生成的标题。
    """
    dream_content = request.data.get('dream_content', '').strip()

    if len(dream_content) < MIN_CONTENT_LENGTH:
        return Response({
            'success': False,
            'error': ERROR_CONTENT_TOO_SHORT
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        title = generate_dream_title(dream_content)

        if title:
            return Response({
                'success': True,
                'title': title,
                'message': '标题生成成功'
            }, status=status.HTTP_200_OK)
        else:
            logger.warning(f"Title generation failed for user {request.user.username}. "
                           "This could be due to service unavailability or model failure.")
            return Response({
                'success': False,
                'error': ERROR_GENERATION_FAILED
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    except Exception as e:
        logger.error(f"Internal server error in generate_title_view: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': ERROR_INTERNAL
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

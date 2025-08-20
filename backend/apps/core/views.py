from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from config.env_config import FEATURE_FLAGS
import logging

logger = logging.getLogger(__name__)


class FeatureFlagsAPIView(APIView):
    """
    获取系统功能开关状态API
    提供前端需要的功能开关配置信息
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """
        获取前端需要的功能开关状态
        GET /api/system/features/
        
        Returns:
            Response: 包含功能开关状态的响应
        """
        try:
            # 只返回前端需要的功能开关
            frontend_flags = {
                'SMS_SERVICE_ENABLED': FEATURE_FLAGS.get('SMS_SERVICE_ENABLED', False),
                'EMAIL_SERVICE_ENABLED': FEATURE_FLAGS.get('EMAIL_SERVICE_ENABLED', True),
                'PASSWORD_LOGIN_ENABLED': True,  # 密码登录始终启用
            }
            
            logger.info("成功获取功能开关状态")
            return Response({
                'code': 200,
                'message': '获取功能开关状态成功',
                'data': frontend_flags
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"获取功能开关状态失败: {str(e)}")
            return Response({
                'code': 500,
                'message': '获取功能开关状态失败'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

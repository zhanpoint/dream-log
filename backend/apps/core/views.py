from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from config.env_manager import settings
from .serializers import ContactSerializer, FeedbackSerializer
from .tasks import send_contact_email_task
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
            feature_flags = settings.features.settings
            frontend_flags = {
                'SMS_SERVICE_ENABLED': feature_flags.get('SMS_SERVICE_ENABLED', False),
                'EMAIL_SERVICE_ENABLED': feature_flags.get('EMAIL_SERVICE_ENABLED', True),
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


class ContactAPIView(APIView):
    """
    联系我们API - 简化版
    需要用户登录，从用户信息获取邮箱
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        提交联系我们表单
        POST /api/system/contact/
        
        Body: { "message": "联系内容" }
        """
        try:
            serializer = ContactSerializer(data=request.data)
            if not serializer.is_valid():
                logger.warning(f"联系表单验证失败: {serializer.errors}")
                return Response({
                    'code': 400,
                    'message': '表单验证失败',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 获取验证后的数据和用户邮箱
            message = serializer.validated_data['message']
            user_email = request.user.email
            
            if not user_email:
                return Response({
                    'code': 400,
                    'message': '用户邮箱信息不完整，无法提交'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 提交异步邮件发送任务
            send_contact_email_task.apply_async(
                args=["联系我们", message, user_email, "联系我们"],
                ignore_result=True
            )
            
            logger.info(f"成功提交联系我们请求 - 发件人: {user_email}")
            
            return Response({
                'code': 200,
                'message': '您的联系信息已成功提交，我们会尽快处理并回复您',
                'data': {'submitted_at': '已提交'}
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"提交联系表单失败: {str(e)}")
            return Response({
                'code': 500,
                'message': '提交失败，请稍后重试'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FeedbackAPIView(APIView):
    """
    反馈建议API - 简化版
    需要用户登录，从用户信息获取邮箱
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        提交反馈建议表单
        POST /api/system/feedback/
        
        Body: { "message": "反馈内容" }
        """
        try:
            serializer = FeedbackSerializer(data=request.data)
            if not serializer.is_valid():
                logger.warning(f"反馈表单验证失败: {serializer.errors}")
                return Response({
                    'code': 400,
                    'message': '表单验证失败',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 获取验证后的数据和用户邮箱
            message = serializer.validated_data['message']
            user_email = request.user.email
            
            if not user_email:
                return Response({
                    'code': 400,
                    'message': '用户邮箱信息不完整，无法提交'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 提交异步邮件发送任务
            send_contact_email_task.apply_async(
                args=["反馈建议", message, user_email, "反馈建议"],
                ignore_result=True
            )
            
            logger.info(f"成功提交反馈建议请求 - 发件人: {user_email}")
            
            return Response({
                'code': 200,
                'message': '您的反馈建议已成功提交，我们会尽快处理并回复您',
                'data': {'submitted_at': '已提交'}
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"提交反馈表单失败: {str(e)}")
            return Response({
                'code': 500,
                'message': '提交失败，请稍后重试'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

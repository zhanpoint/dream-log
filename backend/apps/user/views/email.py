from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from apps.user.serializers.user_serializers import VerificationCodeRequestSerializer
from apps.user.services import VerificationService
from apps.user.utils.response_handler import ResponseHandler
from apps.user.models import User
import logging

logger = logging.getLogger(__name__)


class EmailVerificationCodeAPIView(APIView):
    """
    邮箱验证码API
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        发送邮箱验证码
        POST /api/verifications/email/
        """
        serializer = VerificationCodeRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return ResponseHandler.validation_error(serializer.errors, "请求参数错误")

        email = serializer.validated_data.get('email')
        scene = serializer.validated_data['scene']

        if not email:
            return ResponseHandler.error("邮箱地址不能为空")

        if scene == 'reset_password':
            primary_exists = User.objects.filter(email=email).exists()
            backup_exists = User.objects.filter(backup_email=email).exists()
            if not (primary_exists or backup_exists):
                return ResponseHandler.error("该邮箱未注册", {"email": ["该邮箱未注册"]})

        # 调用验证码服务发送邮箱验证码
        success, error, wait_time = VerificationService.send_email_code(email, scene)
        
        if not success:
            if wait_time > 0:
                return ResponseHandler.rate_limit_error(wait_time)
            return ResponseHandler.error(error)
        
        return ResponseHandler.success(
            data={"expires_in": 300},
            message="验证码发送成功"
        ) 
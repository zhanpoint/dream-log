from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from apps.user.serializers.user_serializers import VerificationCodeRequestSerializer
from apps.user.services import VerificationService
from apps.user.utils.response_handler import ResponseHandler
import logging

logger = logging.getLogger(__name__)


class VerificationCodeAPIView(APIView):
    """
    短信验证码API
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        发送短信验证码
        POST /api/verifications/sms/
        """
        serializer = VerificationCodeRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return ResponseHandler.validation_error(serializer.errors, "请求参数错误")

        phone = serializer.validated_data.get('phone')
        scene = serializer.validated_data['scene']

        if not phone:
            return ResponseHandler.error("请提供手机号", {"phone": ["请提供手机号"]})

        # 调用验证码服务发送短信验证码
        success, error, wait_time = VerificationService.send_sms_code(phone, scene)
        
        if not success:
            if wait_time > 0:
                return ResponseHandler.rate_limit_error(wait_time)
            return ResponseHandler.error(error)
        
        return ResponseHandler.success(
            data={"expires_in": 300},
            message="验证码发送成功"
        )

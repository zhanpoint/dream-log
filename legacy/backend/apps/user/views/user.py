from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from apps.user.models import User
from apps.user.serializers.user_serializers import (
    UserSerializer,
    UserLoginSerializer,
    UserRegistrationSerializer,
    PhoneLoginSerializer,
    EmailLoginSerializer,
    PasswordResetSerializer,
    UserProfileUpdateSerializer,
    ChangeEmailSerializer,
    BackupEmailVerificationSerializer,
)
from apps.user.services import AuthService, UserService
from apps.user.utils.response_handler import ResponseHandler
import logging

logger = logging.getLogger(__name__)


class UserViewSet(viewsets.ModelViewSet):
    """
    用户资源ViewSet - 处理用户CRUD操作
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        """
        根据不同的操作返回不同的权限类
        - create（注册）: 允许匿名访问，注册操作应该是公开的，不需要认证。
        - 其他操作: 需要认证
        """
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """
        只返回当前用户的数据
        """
        return [self.request.user] if self.request.user.is_authenticated else []

    def create(self, request, *args, **kwargs):
        """
        用户注册 - 支持手机号和邮箱注册
        POST /api/users/
        """
        serializer = UserRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return ResponseHandler.validation_error(serializer.errors, "注册失败")
        
        # 确定注册方式
        phone_number = serializer.validated_data.get('phone_number')
        email = serializer.validated_data.get('email')
        code = serializer.validated_data.get('code')
        
        if phone_number:
            contact_method = 'phone'
        elif email:
            contact_method = 'email'
        else:
            return ResponseHandler.error("请提供手机号或邮箱地址")
        
        # 调用认证服务注册用户
        success, user, error = AuthService.register_user(
            validated_data=serializer.validated_data,
            verification_code=code,
            contact_method=contact_method
        )
        
        if not success:
            if "验证码" in error:
                return ResponseHandler.error(error, {"code": [error]})
            return ResponseHandler.error("注册失败", {"detail": [error]})
        
        # 注册成功，返回用户信息和令牌
        user_data = UserService.get_user_info(user)
        tokens = AuthService.generate_tokens(user)
        
        return ResponseHandler.success(
            data={**user_data, **tokens},
            message="注册成功",
            status_code=201
        )

    def retrieve(self, request, *args, **kwargs):
        """
        获取当前用户信息
        GET /api/users/{id}/
        """
        user_data = UserService.get_user_info(request.user)
        return ResponseHandler.success(user_data, "获取用户信息成功")

    def update(self, request, *args, **kwargs):
        """
        更新用户信息（用户名、头像）
        PUT /api/users/{id}/
        """
        serializer = UserProfileUpdateSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        
        if not serializer.is_valid():
            return ResponseHandler.validation_error(serializer.errors, "更新失败")
        
        # 调用用户服务更新信息
        success, updated_user, error = UserService.update_user_profile(
            request.user, 
            **serializer.validated_data
        )
        
        if not success:
            return ResponseHandler.error(error)
        
        user_data = UserService.get_user_info(updated_user)
        return ResponseHandler.success(user_data, "用户信息更新成功")


class AuthSessionAPIView(APIView):
    """
    认证会话API - 统一处理登录和登出
    """
    
    def get_permissions(self):
        """
        POST（登录）允许匿名，DELETE（登出）需要认证
        """
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsAuthenticated()]

    def post(self, request):
        """
        用户登录 - 支持用户名密码、手机验证码、邮箱验证码登录
        POST /api/auth/sessions/
        """
        # 根据请求参数判断登录方式
        if 'phone_number' in request.data and 'code' in request.data:
            return self._login_with_phone_code(request)
        elif 'email' in request.data and 'code' in request.data:
            return self._login_with_email_code(request)
        else:
            return self._login_with_password(request)

    def _login_with_password(self, request):
        """用户名密码登录"""
        serializer = UserLoginSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return ResponseHandler.validation_error(serializer.errors, "登录失败")
        
        username = request.data.get('username', '')
        password = request.data.get('password', '')
        
        # 检查登录尝试次数
        allowed, lockout_time = AuthService.check_login_attempts(username)
        if not allowed:
            return ResponseHandler.rate_limit_error(lockout_time)
        
        # 调用认证服务登录
        success, user, tokens, error = AuthService.login_with_password(
            username, password, request
        )
        
        if not success:
            AuthService.increment_login_attempts(username)
            return ResponseHandler.error(error)
        
        # 登录成功，重置尝试次数
        AuthService.reset_login_attempts(username)
        
        user_data = UserService.get_user_info(user)
        return ResponseHandler.success({**user_data, **tokens}, "登录成功")

    def _login_with_phone_code(self, request):
        """手机验证码登录"""
        serializer = PhoneLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return ResponseHandler.validation_error(serializer.errors, "登录失败")

        phone_number = serializer.validated_data['phone_number']
        code = serializer.validated_data['code']

        # 调用认证服务验证码登录
        success, user, tokens, error = AuthService.login_with_verification_code(
            phone_number, code, 'phone', request
        )
        
        if not success:
            return ResponseHandler.error(error, {"code": [error]})
        
        user_data = UserService.get_user_info(user)
        return ResponseHandler.success({**user_data, **tokens}, "登录成功")

    def _login_with_email_code(self, request):
        """邮箱验证码登录"""
        serializer = EmailLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return ResponseHandler.validation_error(serializer.errors, "登录失败")

        email = serializer.validated_data['email']
        code = serializer.validated_data['code']

        # 调用认证服务验证码登录
        success, user, tokens, error = AuthService.login_with_verification_code(
            email, code, 'email', request
        )
        
        if not success:
            return ResponseHandler.error(error, {"code": [error]})
        
        user_data = UserService.get_user_info(user)
        return ResponseHandler.success({**user_data, **tokens}, "登录成功")

    def delete(self, request):
        """
        用户登出
        DELETE /api/auth/sessions/
        """
        refresh_token = request.data.get('refresh')
        
        # 调用认证服务登出
        success, error = AuthService.logout_user(request, refresh_token)
        
        if not success:
            return ResponseHandler.server_error(error)
        
        return ResponseHandler.success(message="登出成功")


class UserPasswordAPIView(APIView):
    """
    统一密码管理API：一个接口支持三种方式
    PUT /api/users/me/password/
    - current_password：当前密码
    - phone：短信验证码
    - email：邮箱验证码（支持主/备邮箱）
    """
    permission_classes = [AllowAny]

    def put(self, request):
        """
        重置密码
        """
        serializer = PasswordResetSerializer(data=request.data)
        if not serializer.is_valid():
            return ResponseHandler.validation_error(serializer.errors, "重置失败")
        
        method = serializer.validated_data.get('method')
        new_password = serializer.validated_data['newPassword']
        
        if method == 'current_password':
            # 使用 AuthService 处理当前密码验证方式
            current_password = serializer.validated_data['currentPassword']
            contact = (serializer.validated_data.get('username') or 
                      serializer.validated_data.get('phone') or 
                      serializer.validated_data.get('email'))
            
            success, error = AuthService.reset_password(
                contact, current_password, new_password, 'current_password'
            )
            
            if not success:
                if "密码不正确" in error:
                    return ResponseHandler.error(error, {"currentPassword": [error]})
                return ResponseHandler.error(error)
            
            return ResponseHandler.success(message="密码重置成功")
        
        # phone/email 方式
        contact = serializer.validated_data.get('phone') or serializer.validated_data.get('email')
        code = serializer.validated_data['code']
        contact_method = 'phone' if serializer.validated_data.get('phone') else 'email'
        success, error = AuthService.reset_password(contact, code, new_password, contact_method)
        
        if not success:
            if "验证码" in error:
                return ResponseHandler.error(error, {"code": [error]})
            return ResponseHandler.error(error)
        
        return ResponseHandler.success(message="密码重置成功")


class PrimaryEmailAPIView(APIView):
    """
    更换主邮箱
    POST /api/users/me/primary-email/
    新邮箱验证码通过 /api/verifications/email/ 场景 change_email 发送
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """更换用户主邮箱"""
        serializer = ChangeEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return ResponseHandler.validation_error(serializer.errors, "参数错误")

        new_email = serializer.validated_data['new_email']
        code = serializer.validated_data['code']

        # 调用用户服务更换邮箱
        success, error = UserService.change_email(request.user, new_email, code)
        
        if not success:
            return ResponseHandler.error(error)

        return ResponseHandler.success(
            data={"email": new_email},
            message="更换邮箱成功"
        )


class BackupEmailAPIView(APIView):
    """
    设置备用邮箱
    PUT /api/users/me/backup-email/
    需要验证码校验确保邮箱真实存在
    """
    permission_classes = [IsAuthenticated]

    def put(self, request):
        """设置用户备用邮箱"""
        serializer = BackupEmailVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return ResponseHandler.validation_error(serializer.errors, "参数错误")

        backup_email = serializer.validated_data['backup_email']
        code = serializer.validated_data['code']

        # 调用用户服务设置备用邮箱
        success, error = UserService.set_backup_email(
            request.user, backup_email, code
        )
        
        if not success:
            if "备用邮箱不能与主邮箱相同" in error:
                return ResponseHandler.error(error, {"backup_email": [error]})
            return ResponseHandler.error(error)

        return ResponseHandler.success(
            data={"backup_email": backup_email},
            message="备用邮箱设置成功"
        )

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from apps.user.views.email import EmailVerificationCodeAPIView
from apps.user.views.sms import VerificationCodeAPIView
from apps.user.views.user import (
    UserViewSet,
    AuthSessionAPIView,
    UserPasswordAPIView,
    PrimaryEmailAPIView,
    BackupEmailAPIView,
)

# 用户资源路由
# API: /api/users/
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

# 认证相关路由
# API Prefix: /api/auth/
auth_urlpatterns = [
    # 会话管理（登录/登出）
    path('sessions/', AuthSessionAPIView.as_view(), name='auth-sessions'),
    # 令牌管理  
    path('tokens/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('tokens/verify/', TokenVerifyView.as_view(), name='token-verify'),
]

# 验证码相关路由
# API Prefix: /api/verifications/
verification_urlpatterns = [
    path('sms/', VerificationCodeAPIView.as_view(), name='sms-code'),
    path('email/', EmailVerificationCodeAPIView.as_view(), name='email-code'),
]

# 用户设置相关路由
# API Prefix: /api/users/me/
user_settings_urlpatterns = [
    path('primary-email/', PrimaryEmailAPIView.as_view(), name='user-change-primary-email'),
    path('backup-email/', BackupEmailAPIView.as_view(), name='user-backup-email'),
    path('password/', UserPasswordAPIView.as_view(), name='user-password-reset'),
]

# 主路由配置
urlpatterns = [
    # 用户设置路由
    path('users/me/', include(user_settings_urlpatterns)),
    
    # 认证路由
    path('auth/', include(auth_urlpatterns)),
    
    # 验证码路由
    path('verifications/', include(verification_urlpatterns)),
    
    # 用户CRUD路由
    path('', include(router.urls)),
]

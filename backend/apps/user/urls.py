from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView, TokenObtainPairView

from apps.user.views.email import EmailVerificationCodeAPIView
from apps.user.views.sms import VerificationCodeAPIView
from apps.user.views.user import (
    UserViewSet,
    AuthSessionAPIView,
    UserPasswordAPIView,
)

# 路由器和ViewSet注册
# API: /api/users/
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

# 认证相关路由
# API Prefix: /api/auth/
auth_urlpatterns = [
    # 登录/注册/登出
    path('sessions/', AuthSessionAPIView.as_view(), name='auth-sessions'),
    # 令牌管理
    path('tokens/', TokenObtainPairView.as_view(), name='token-obtain'),
    path('tokens/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('tokens/verify/', TokenVerifyView.as_view(), name='token-verify'),
    # 密码管理
    path('password/reset/', UserPasswordAPIView.as_view(), name='password-reset'),
]

# 验证码相关路由
# API Prefix: /api/verifications/
verification_urlpatterns = [
    path('sms/', VerificationCodeAPIView.as_view(), name='sms-verification'),
    path('email/', EmailVerificationCodeAPIView.as_view(), name='email-verification'),
]

# user app的主路由, 最终会通过 config/urls.py 组合成:
urlpatterns = [
    path('', include(router.urls)),
    path('auth/', include(auth_urlpatterns)),
    path('verifications/', include(verification_urlpatterns)),
]

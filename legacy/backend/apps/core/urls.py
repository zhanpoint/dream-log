from django.urls import path
from .views import FeatureFlagsAPIView, ContactAPIView, FeedbackAPIView

# 系统核心功能路由
# API Prefix: /api/system/
urlpatterns = [
    # 功能开关API
    path('features/', FeatureFlagsAPIView.as_view(), name='feature-flags'),
    # 联系我们API
    path('contact/', ContactAPIView.as_view(), name='contact'),
    # 反馈建议API
    path('feedback/', FeedbackAPIView.as_view(), name='feedback'),
]

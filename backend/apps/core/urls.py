from django.urls import path
from .views import FeatureFlagsAPIView

# 系统核心功能路由
# API Prefix: /api/system/
urlpatterns = [
    # 功能开关API
    path('features/', FeatureFlagsAPIView.as_view(), name='feature-flags'),
]

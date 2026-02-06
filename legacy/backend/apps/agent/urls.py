from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.chat import ChatViewSet
from .views.personal import PersonalizedSettingsView
from .views.assistant import process_message

# 创建路由器
router = DefaultRouter()
router.register(r'chats', ChatViewSet, basename='chat')

urlpatterns = [
    # 对话管理
    path('assistant/', include(router.urls)),
    # 个性化设置
    path('assistant/personalized-settings/', PersonalizedSettingsView.as_view(), name='personalized_settings'),
    # 消息处理
    path('assistant/message/', process_message, name='process_message'),
]
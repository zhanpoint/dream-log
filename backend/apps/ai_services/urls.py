from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.generate_dream_title import generate_title_view
from .views.dream_analysis import (
    start_dream_analysis_view,
    cancel_analysis_view,
)
from .views.dream_assistant import ChatViewSet, AIConfigView

# 创建路由器
router = DefaultRouter()
router.register(r'chats', ChatViewSet, basename='chat')

urlpatterns = [
    # 梦境标题生成
    path('generate-title/', generate_title_view, name='generate_dream_title'),
    
    # 梦境分析
    path('dream-analysis/start/', start_dream_analysis_view, name='start_dream_analysis'),
    path('dream-analysis/cancel/<str:task_id>/', cancel_analysis_view, name='cancel_analysis'),
    
    # AI 助手配置 
    path('assistant/config/', AIConfigView.as_view(), name='ai_config'),

    # 梦境助手 API 
    path('assistant/', include(router.urls)),
]
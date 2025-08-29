"""
WebSocket URL 路由配置
"""
from django.urls import re_path
from ..consumers.dream_analysis_consumer import DreamAnalysisConsumer
from ..consumers.dream_assistant_consumer import DreamAssistantConsumer

# WebSocket URL 路由配置
websocket_urlpatterns = [
    re_path(r'ws/dream/analysis/$', DreamAnalysisConsumer.as_asgi()),
    re_path(r'ws/dream/assistant/$', DreamAssistantConsumer.as_asgi()),
] 
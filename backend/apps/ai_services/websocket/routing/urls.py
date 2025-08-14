"""
WebSocket URL 路由配置
"""
from django.urls import re_path
from ..consumers.dream_analysis_consumer import DreamAnalysisConsumer

# WebSocket URL 路由配置
websocket_urlpatterns = [
    re_path(r'ws/dream/analysis/$', DreamAnalysisConsumer.as_asgi()),
] 
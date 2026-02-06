"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from config.env_loader import load_environment_variables

# 初始化Django ASGI应用
django_asgi_app = get_asgi_application()

# 导入JWT中间件和WebSocket路由
from config.middlewares.jwt_middleware import JWTAuthMiddlewareStack
from apps.ai_services.websocket.routing.urls import websocket_urlpatterns


application = ProtocolTypeRouter({  # - 根据不同的协议类型（HTTP/WebSocket）路由到不同的处理器
    "http": django_asgi_app,  # Django视图处理HTTP请求
    "websocket": AllowedHostsOriginValidator(  # 确保WebSocket连接来自允许的主机
        JWTAuthMiddlewareStack(  # 使用JWT认证中间件替代默认的AuthMiddlewareStack
            URLRouter(
                websocket_urlpatterns
            )
        )
    ),
})

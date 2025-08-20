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
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator, OriginValidator


# 设置Django的环境变量，指定设置模块
app_env = os.environ.get('APP_ENV', 'dev')
settings_module = f'config.settings.{app_env}'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_module)

"""
在某些运行环境中，重复调用 django.setup() 可能导致线程本地状态异常。
ASGI get_asgi_application() 会确保 Django 完成初始化，因此无需再次显式调用 django.setup()。
"""

# 初始化Django ASGI应用（内部会确保 Django 已正确 setup）
django_asgi_app = get_asgi_application()

# 导入WebSocket路由
from apps.ai_services.websocket.routing.urls import websocket_urlpatterns


application = ProtocolTypeRouter({  # - 根据不同的协议类型（HTTP/WebSocket）路由到不同的处理器
    "http": django_asgi_app,  # Django视图处理HTTP请求
    "websocket": AllowedHostsOriginValidator(  # 确保了在进行来源验证之前，用户的身份已经通过认证
        AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        )
    ),
})

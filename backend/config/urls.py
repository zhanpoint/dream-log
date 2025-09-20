"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import setting

urlpatterns = [
    # API主路由 - 将所有应用的API路由统一整合到 /api/ 前缀下
    path('api/', include([
        path('', include('apps.user.urls')),
        path('', include('apps.dream.urls')),
        path('ai/', include('apps.ai_services.urls')),  # AI服务使用 /ai/ 前缀
        path('system/', include('apps.core.urls')),  # 系统核心功能使用 /system/ 前缀
    ])),
]

# Django Debug Toolbar URL (only in DEBUG mode)
if settings.DEBUG:
    import debug_toolbar
    urlpatterns.insert(0, path('__debug__/', include(debug_toolbar.urls)))
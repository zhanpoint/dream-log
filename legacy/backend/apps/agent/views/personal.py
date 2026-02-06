"""
用户个性化设置视图
=================

处理对话管理、用户配置等 Agent 相关视图
"""
from django.db.models import Count, Q
from rest_framework import generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import PersonalizedSettings
from ..serializers import PersonalizedSettingsSerializer

        """删除对话（硬删除）"""
        self.get_object().delete()
        return Response(status=204)


class PersonalizedSettingsView(generics.RetrieveUpdateAPIView):
    """用户个性化设置视图"""
    serializer_class = PersonalizedSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        """获取或创建用户的个性化设置"""
        settings, _ = PersonalizedSettings.objects.get_or_create(
            user=self.request.user,
            defaults={'assistant_name': '梦境助手'}
        )
        return settings

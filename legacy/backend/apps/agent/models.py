"""
梦境助手 Agent 数据模型
===================

包含对话管理、用户配置等 Agent 相关模型
"""
import uuid
from django.db import models
from apps.user.models import User
from apps.dream.models import Dream


class Chat(models.Model):
    """AI对话会话模型"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="用户")
    title = models.CharField(max_length=30, default="新聊天", verbose_name="聊天标题")
    thread_id = models.CharField(max_length=8, null=True, blank=True, verbose_name="LangGraph线程ID")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at']),
        ]


class Message(models.Model):
    """对话消息模型"""
    ROLE_CHOICES = [
        ('user', '用户'),
        ('assistant', '梦境助手'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='messages', verbose_name="所属会话")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, verbose_name="角色")
    content = models.TextField(verbose_name="消息内容")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    

class PersonalizedSettings(models.Model):
    """梦境助手个性化配置模型"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, verbose_name="用户")
    assistant_name = models.CharField(max_length=10, default="梦境助手", verbose_name="梦境助手别名")

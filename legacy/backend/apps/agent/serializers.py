"""
梦境助手 Agent 序列化器
=====================

包含对话、消息、配置等相关序列化器
"""
from rest_framework import serializers
from .models import Chat, Message, PersonalizedSettings


class MessageSerializer(serializers.ModelSerializer):
    """消息序列化器"""
    
    class Meta:
        model = Message
        fields = [
            'id', 'chat', 'role', 'content', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ChatSerializer(serializers.ModelSerializer):
    """对话序列化器"""
    message_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Chat
        fields = [
            'id', 'title', 'created_at', 'updated_at', 'message_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PersonalizedSettingsSerializer(serializers.ModelSerializer):
    """个性化设置序列化器"""
    
    class Meta:
        model = PersonalizedSettings
        fields = ['assistant_name']



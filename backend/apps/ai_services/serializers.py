"""
梦境助手相关序列化器
"""
from rest_framework import serializers
from .models import Chat, Message, AIConfig


class MessageSerializer(serializers.ModelSerializer):
    """消息序列化器"""
    
    class Meta:
        model = Message
        fields = [
            'id', 'chat', 'role', 'content', 'images',
            'metadata', 'created_at', 'related_dream'
        ]
        read_only_fields = ['id', 'created_at']


class ChatSerializer(serializers.ModelSerializer):
    """对话序列化器"""
    message_count = serializers.IntegerField(read_only=True)
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = Chat
        fields = [
            'id', 'title', 'created_at', 'updated_at',
            'is_active', 'message_count', 'last_message'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_last_message(self, obj):
        """获取最后一条消息"""
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return {
                'role': last_msg.role,
                'content': last_msg.content[:100] + '...' if len(last_msg.content) > 100 else last_msg.content,
                'created_at': last_msg.created_at
            }
        return None


class AIConfigSerializer(serializers.ModelSerializer):
    """AI 配置序列化器"""
    
    class Meta:
        model = AIConfig
        fields = [
            'assistant_name', 'personality_traits', 'interpretation_style',
            'preferred_dimensions', 'response_length',
            'enable_auto_image_generation', 'enable_follow_up_questions',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate_personality_traits(self, value):
        """验证个性特征"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("个性特征必须是字典格式")
        return value
    
    def validate_preferred_dimensions(self, value):
        """验证偏好维度"""
        if not isinstance(value, list):
            raise serializers.ValidationError("偏好维度必须是列表格式")
        
        valid_dimensions = [
            'psychological', 'symbolic', 'biological',
            'spiritual', 'personal_growth'
        ]
        
        for dim in value:
            if dim not in valid_dimensions:
                raise serializers.ValidationError(
                    f"无效的维度: {dim}。有效维度包括: {', '.join(valid_dimensions)}"
                )
        
        return value

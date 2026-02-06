from rest_framework import serializers


class ContactSerializer(serializers.Serializer):
    """
    联系我们表单序列化器 - 简化版
    只需要消息内容，用户邮箱从认证信息获取
    """
    message = serializers.CharField(
        max_length=2000,
        error_messages={
            'required': '内容不能为空',
            'max_length': '内容长度不能超过2000个字符'
        }
    )
    
    def validate_message(self, value):
        """验证消息内容"""
        if not value.strip():
            raise serializers.ValidationError("内容不能为空")
        return value.strip()


class FeedbackSerializer(serializers.Serializer):
    """
    反馈建议表单序列化器 - 简化版
    只需要消息内容，用户邮箱从认证信息获取
    """
    message = serializers.CharField(
        max_length=2000,
        error_messages={
            'required': '内容不能为空',
            'max_length': '内容长度不能超过2000个字符'
        }
    )
    
    def validate_message(self, value):
        """验证消息内容"""
        if not value.strip():
            raise serializers.ValidationError("内容不能为空")
        return value.strip()

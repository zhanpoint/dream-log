"""
梦境助手AI服务相关模型
"""
from django.db import models
import uuid
from apps.user.models import User
from apps.dream.models import Dream


class Chat(models.Model):
    """AI对话会话模型"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="用户")
    title = models.CharField(max_length=200, default="新对话", verbose_name="对话标题")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    is_active = models.BooleanField(default=True, verbose_name="是否激活")
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"


class Message(models.Model):
    """对话消息模型"""
    ROLE_CHOICES = [
        ('user', '用户'),
        ('assistant', '梦境助手'),
        ('system', '系统'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='messages', verbose_name="所属会话")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, verbose_name="角色")
    content = models.TextField(verbose_name="消息内容")
    
    # 多模态内容
    images = models.JSONField(default=list, blank=True, verbose_name="图片URLs")
    
    # 元数据
    metadata = models.JSONField(default=dict, blank=True, verbose_name="元数据")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    
    # 关联梦境（如果消息中涉及特定梦境）
    related_dream = models.ForeignKey(
        Dream, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        verbose_name="关联梦境"
    )
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['chat', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.chat.title} - {self.role}: {self.content[:50]}..."


class AIConfig(models.Model):
    """用户AI助手配置模型"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, verbose_name="用户")
    
    # 助手个性化配置
    assistant_name = models.CharField(max_length=50, default="梦境助手", verbose_name="助手名称")
    personality_traits = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="个性特征",
        help_text="如：温柔、专业、幽默等"
    )
    
    # 解读偏好
    interpretation_style = models.CharField(
        max_length=20,
        choices=[
            ('professional', '专业学术'),
            ('friendly', '亲切友好'),
            ('poetic', '诗意浪漫'),
            ('balanced', '平衡综合'),
        ],
        default='balanced',
        verbose_name="解读风格"
    )
    
    preferred_dimensions = models.JSONField(
        default=list,
        blank=True,
        verbose_name="偏好解读维度",
        help_text="如：心理学、象征学、生物医学等"
    )
    
    # 响应配置
    response_length = models.CharField(
        max_length=10,
        choices=[
            ('concise', '简洁'),
            ('moderate', '适中'),
            ('detailed', '详细'),
        ],
        default='moderate',
        verbose_name="回复长度"
    )
    
    # 功能开关
    enable_auto_image_generation = models.BooleanField(default=False, verbose_name="自动生成梦境图像")
    enable_follow_up_questions = models.BooleanField(default=True, verbose_name="启用追问功能")
    enable_pattern_analysis = models.BooleanField(default=True, verbose_name="启用梦境模式智能分析", help_text="开启后系统会自动分析您的梦境模式并用于个性化解读")
    
    # 元数据
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

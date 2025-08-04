from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
import uuid
from apps.user.models import User


class SoftDeleteManager(models.Manager):
    """软删除管理器 - 只返回活跃状态的记录"""
    
    def get_queryset(self):
        return super().get_queryset().filter(status='active')


class AllObjectsManager(models.Manager):
    """全对象管理器 - 返回所有记录包括软删除的"""
    
    def get_queryset(self):
        return super().get_queryset()


class DreamCategory(models.Model):
    """梦境分类模型 - 扩展更多类型"""
    CATEGORY_CHOICES = [
        # 基础分类
        ('normal', '普通梦境'),
        ('lucid', '清醒梦'),
        ('nightmare', '噩梦'),
        ('recurring', '重复梦'),
        
        # 特殊体验
        ('prophetic', '预知梦'),
        ('healing', '治愈梦'),
        ('spiritual', '灵性梦境'),
        ('creative', '创意梦境'),
        
        # 睡眠相关
        ('hypnagogic', '入睡幻觉'),
        ('hypnopompic', '醒前幻觉'),
        ('sleep_paralysis', '睡眠瘫痪'),
        ('false_awakening', '假醒'),
        
        # 情感类型
        ('anxiety', '焦虑梦'),
        ('joyful', '快乐梦境'),
        ('melancholic', '忧郁梦境'),
        ('adventure', '冒险梦境'),
    ]

    name = models.CharField(
        max_length=50,
        unique=True,
        choices=CATEGORY_CHOICES,
        verbose_name="分类名称"
    )
    description = models.TextField(blank=True, verbose_name="分类描述")
    color_code = models.CharField(max_length=7, default='#6366f1', verbose_name="颜色代码")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")

    class Meta:
        verbose_name = "梦境分类"
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.get_name_display()


class Tag(models.Model):
    """标签模型 - 支持层级结构"""
    TAG_TYPE_CHOICES = [
        ('emotion', '情感'),
        ('character', '角色'),
        ('location', '地点'),
        ('object', '物体'),
        ('action', '行为'),
        ('symbol', '符号'),
        ('color', '颜色'),
        ('sound', '声音'),
        ('weather', '天气'),
        ('time', '时间'),
        ('custom', '自定义'),
    ]

    name = models.CharField(max_length=50, verbose_name="标签名称")
    tag_type = models.CharField(
        max_length=20,
        choices=TAG_TYPE_CHOICES,
        verbose_name="标签类型"
    )

    created_by = models.ForeignKey(
        User, 
        null=True, 
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="创建者"
    )
    is_public = models.BooleanField(default=False, verbose_name="是否公共标签")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")

    class Meta:
        verbose_name = "标签"
        verbose_name_plural = verbose_name
        indexes = [
            models.Index(fields=['tag_type']),
            models.Index(fields=['is_public']),
        ]

    def save(self, *args, **kwargs):
        if self.name:
            self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_tag_type_display()}:{self.name}"


class Dream(models.Model):
    """梦境记录模型 - 完整重构"""
    LUCIDITY_CHOICES = [
        (0, '完全无意识'),
        (1, '轻微意识'),
        (2, '部分清醒'),
        (3, '较为清醒'),
        (4, '完全清醒'),
        (5, '超清醒状态'),
    ]

    MOOD_CHOICES = [
        ('very_negative', '非常消极'),
        ('negative', '消极'),
        ('neutral', '中性'),
        ('positive', '积极'),
        ('very_positive', '非常积极'),
    ]

    SLEEP_QUALITY_CHOICES = [
        (1, '很差'),
        (2, '较差'),
        (3, '一般'),
        (4, '良好'),
        (5, '很好'),
    ]

    PRIVACY_CHOICES = [
        ('private', '私人'),
        ('public', '公开'),
        ('friends', '好友可见'),
    ]

    # 基础信息
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="用户")
    title = models.CharField(max_length=200, verbose_name="梦境标题")
    
    # 梦境内容
    content = models.TextField(verbose_name="梦境内容")
    interpretation = models.TextField(blank=True, verbose_name="梦境解析")
    personal_notes = models.TextField(blank=True, verbose_name="个人笔记")
    
    # 梦境特征
    dream_date = models.DateField(verbose_name="梦境日期")
    lucidity_level = models.IntegerField(
        choices=LUCIDITY_CHOICES,
        default=0,
        verbose_name="清醒度等级"
    )
    mood_before_sleep = models.CharField(
        max_length=20,
        choices=MOOD_CHOICES,
        blank=True,
        verbose_name="睡前情绪"
    )
    mood_in_dream = models.CharField(
        max_length=20,
        choices=MOOD_CHOICES,
        blank=True,
        verbose_name="梦中情绪"
    )
    mood_after_waking = models.CharField(
        max_length=20,
        choices=MOOD_CHOICES,
        blank=True,
        verbose_name="醒后情绪"
    )
    
    # 睡眠相关
    sleep_quality = models.IntegerField(
        choices=SLEEP_QUALITY_CHOICES,
        null=True,
        blank=True,
        verbose_name="睡眠质量"
    )
    sleep_duration = models.DurationField(null=True, blank=True, verbose_name="睡眠时长")
    bedtime = models.TimeField(null=True, blank=True, verbose_name="就寝时间")
    wake_time = models.TimeField(null=True, blank=True, verbose_name="醒来时间")
    
    # 梦境特性
    is_recurring = models.BooleanField(default=False, verbose_name="是否重复梦")
    recurring_elements = models.TextField(blank=True, verbose_name="重复元素")
    vividness = models.IntegerField(
        choices=[(i, str(i)) for i in range(1, 6)],
        null=True,
        blank=True,
        verbose_name="清晰度(1-5)"
    )
    
    # 关联关系
    categories = models.ManyToManyField(
        DreamCategory,
        blank=True,
        verbose_name="梦境分类"
    )
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        verbose_name="标签"
    )
    related_dreams = models.ManyToManyField(
        'self',
        blank=True,
        symmetrical=True,
        verbose_name="相关梦境"
    )
    
    # 隐私和分享
    privacy = models.CharField(
        max_length=10,
        choices=PRIVACY_CHOICES,
        default='private',
        verbose_name="隐私设置"
    )
    is_favorite = models.BooleanField(default=False, verbose_name="是否收藏")
    
    # 元数据
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        verbose_name = "梦境"
        verbose_name_plural = verbose_name
        ordering = ['-dream_date', '-created_at']
        indexes = [
            models.Index(fields=['user', '-dream_date']),
            models.Index(fields=['privacy', '-created_at']),
            models.Index(fields=['is_favorite', '-created_at']),
            models.Index(fields=['lucidity_level']),
        ]

    def clean(self):
        super().clean()
        # 仅保留关键验证
        if self.dream_date and self.dream_date > timezone.now().date():
            raise ValidationError({'dream_date': '梦境日期不能是未来日期'})

    def __str__(self):
        return f"{self.title} - {self.dream_date}"

    @property
    def word_count(self):
        """计算内容字数"""
        return len(self.content.replace(' ', ''))

    @property
    def reading_time(self):
        """估算阅读时间（分钟）"""
        return max(1, self.word_count // 200)


class DreamJournal(models.Model):
    """梦境日记本模型"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="用户")
    name = models.CharField(max_length=100, verbose_name="日记本名称")
    description = models.TextField(blank=True, verbose_name="日记本描述")
    color_theme = models.CharField(max_length=7, default='#6366f1', verbose_name="主题颜色")
    is_default = models.BooleanField(default=False, verbose_name="是否默认日记本")
    dreams = models.ManyToManyField(Dream, blank=True, verbose_name="包含的梦境")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        verbose_name = "梦境日记本"
        verbose_name_plural = verbose_name
        unique_together = ('user', 'name')

    def __str__(self):
        return f"{self.user.username} - {self.name}"


class SleepPattern(models.Model):
    """睡眠模式记录"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="用户")
    date = models.DateField(verbose_name="日期")
    bedtime = models.TimeField(verbose_name="就寝时间")
    sleep_time = models.TimeField(null=True, blank=True, verbose_name="入睡时间")
    wake_time = models.TimeField(verbose_name="醒来时间")
    sleep_quality = models.IntegerField(
        choices=Dream.SLEEP_QUALITY_CHOICES,
        verbose_name="睡眠质量"
    )
    total_sleep_time = models.DurationField(null=True, blank=True, verbose_name="总睡眠时间")
    awakenings = models.PositiveIntegerField(default=0, verbose_name="夜间醒来次数")
    notes = models.TextField(blank=True, verbose_name="备注")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")

    class Meta:
        verbose_name = "睡眠模式"
        verbose_name_plural = verbose_name
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.username} - {self.date}"


class UploadedImage(models.Model):
    """图片管理模型 - 简化版"""
    
    STATUS_CHOICES = [
        ('active', '活跃'),
        ('pending_delete', '待删除'),
    ]
    
    # 基础信息
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField(max_length=500, unique=True, null=True, blank=True, default=None, verbose_name="图片URL")
    file_key = models.CharField(max_length=500, verbose_name="OSS文件Key")
    
    # 关联信息
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="上传用户")
    dream = models.ForeignKey(
        Dream, 
        null=True, 
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="关联梦境"
    )
    
    # 状态管理
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name="状态"
    )
    
    # 元数据
    upload_time = models.DateTimeField(auto_now_add=True, verbose_name="上传时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="最后更新时间")
    
    class Meta:
        verbose_name = "上传图片"
        verbose_name_plural = verbose_name
        ordering = ['-upload_time']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'updated_at']),
            models.Index(fields=['dream', 'status']),
            models.Index(fields=['url']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.url} ({self.status})"
        
    def get_file_key_from_url(self):
        """从URL中提取文件key"""
        if not self.url:
            return None
        
        if '/users/' in self.url:
            return 'users/' + self.url.split('/users/', 1)[1]
        return None

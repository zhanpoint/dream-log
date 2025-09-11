from rest_framework import serializers
from django.utils import timezone
from apps.dream.models import (
    Dream, DreamCategory, Tag,
    DreamJournal, SleepPattern, UploadedImage
)
from apps.dream.utils.oss import OSS
from urllib.parse import urlparse
import re


class TagSerializer(serializers.ModelSerializer):
    """标签序列化器"""

    class Meta:
        model = Tag
        fields = [
            'id', 'name', 'tag_type', 'is_public'
        ]
        read_only_fields = ['id']


class DreamCategorySerializer(serializers.ModelSerializer):
    """梦境分类序列化器"""
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = DreamCategory
        fields = ['id', 'name', 'display_name', 'description', 'color_code']
        read_only_fields = ['id']

    def get_display_name(self, obj):
        return obj.get_name_display()


class DreamSerializer(serializers.ModelSerializer):
    """梦境详情序列化器"""
    categories = DreamCategorySerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    related_dreams = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()
    
    # 显示字段
    lucidity_level_display = serializers.CharField(source='get_lucidity_level_display', read_only=True)
    mood_before_sleep_display = serializers.CharField(source='get_mood_before_sleep_display', read_only=True)
    mood_in_dream_display = serializers.CharField(source='get_mood_in_dream_display', read_only=True)
    mood_after_waking_display = serializers.CharField(source='get_mood_after_waking_display', read_only=True)
    sleep_quality_display = serializers.CharField(source='get_sleep_quality_display', read_only=True)
    privacy_display = serializers.CharField(source='get_privacy_display', read_only=True)
    
    # 计算字段
    word_count = serializers.ReadOnlyField()
    reading_time = serializers.ReadOnlyField()
    
    @staticmethod
    def _extract_file_key_from_url(url):
        """从OSS URL中提取file_key"""
        try:
            # 匹配dreamlog-shared bucket中的文件路径
            if 'dreamlog-shared.oss-cn-wuhan-lr.aliyuncs.com/' in url:
                parsed = urlparse(url)
                return parsed.path.lstrip('/')
        except Exception:
            pass
        return None
    
    @staticmethod 
    def _process_image_urls_with_signatures(content, user_id):
        """处理HTML内容中的图片URL，为私有资源生成签名URL"""
        if not content or not user_id:
            return content
            
        try:
            # 匹配所有img标签的src属性
            img_pattern = r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>'
            
            def replace_img_src(match):
                img_tag = match.group(0)
                img_url = match.group(1)
                
                # 检查是否为私有OSS资源
                file_key = DreamSerializer._extract_file_key_from_url(img_url)
                if file_key and file_key.startswith(f'users/{user_id}/'):
                    try:
                        # 生成签名URL
                        oss_client = OSS(user_id=user_id)
                        signed_url = oss_client.get_signed_url(file_key, expires=3600)  # 1小时有效期
                        
                        # 替换src中的URL
                        return img_tag.replace(img_url, signed_url)
                    except Exception as e:
                        # 如果签名失败，返回原始标签
                        print(f"图片签名失败: {e}")
                        pass
                
                return img_tag
            
            return re.sub(img_pattern, replace_img_src, content)
            
        except Exception:
            return content
    
    def to_representation(self, instance):
        """自定义序列化输出，处理图片URL签名"""
        data = super().to_representation(instance)
        
        # 为内容中的私有图片生成签名URL
        if data.get('content') and instance.user_id:
            data['content'] = self._process_image_urls_with_signatures(
                data['content'], 
                instance.user_id
            )
        
        return data

    class Meta:
        model = Dream
        fields = [
            # 基础信息
            'id', 'title', 'content', 'user_analysis', 'ai_analysis', 'personal_notes',
            'dream_date', 'author',
            
            # 梦境特征
            'lucidity_level', 'lucidity_level_display',
            'mood_before_sleep', 'mood_before_sleep_display',
            'mood_in_dream', 'mood_in_dream_display', 
            'mood_after_waking', 'mood_after_waking_display',
            
            # 睡眠相关
            'sleep_quality', 'sleep_quality_display', 'sleep_duration',
            'bedtime', 'wake_time',
            
            # 梦境特性
            'is_recurring', 'recurring_elements', 'vividness',
            
            # 关联关系
            'categories', 'tags', 'related_dreams',
            
            # 隐私和分享
            'privacy', 'privacy_display', 'is_favorite',
            
            # 元数据
            'created_at', 'updated_at',
            'word_count', 'reading_time'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def get_author(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username
        }

    def get_related_dreams(self, obj):
        related = obj.related_dreams.all()[:5]  # 限制返回数量
        return [
            {
                'id': str(dream.id),
                'title': dream.title,
                'dream_date': dream.dream_date,
                'lucidity_level': dream.lucidity_level
            }
            for dream in related
        ]


class DreamCreateSerializer(serializers.ModelSerializer):
    """梦境创建序列化器"""
    categories = serializers.ListField(
        child=serializers.CharField(max_length=50),
        write_only=True,
        required=False,
        allow_empty=True
    )
    tags = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        allow_empty=True
    )

    related_dream_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Dream
        fields = [
            # 基础信息
            'title', 'content', 'user_analysis', 'ai_analysis', 'personal_notes', 'dream_date',
            
            # 梦境特征
            'lucidity_level', 'mood_before_sleep', 'mood_in_dream', 'mood_after_waking',
            
            # 睡眠相关
            'sleep_quality', 'sleep_duration', 'bedtime', 'wake_time',
            
            # 梦境特性
            'is_recurring', 'recurring_elements', 'vividness',
            
            # 隐私设置
            'privacy', 'is_favorite',
            
            # 关联数据（写入）
            'categories', 'tags', 'related_dream_ids'
        ]
    
    def validate_dream_date(self, value):
        """验证梦境日期"""
        if value and value > timezone.now().date():
            raise serializers.ValidationError("梦境日期不能是未来日期")
        return value
    
    def create(self, validated_data):
        # 提取关联数据
        categories_data = validated_data.pop('categories', [])
        tags_data = validated_data.pop('tags', [])

        related_dream_ids = validated_data.pop('related_dream_ids', [])
        
        # 创建梦境实例
        dream = Dream.objects.create(**validated_data)
        
        # 处理分类
        if categories_data:
            categories = DreamCategory.objects.filter(name__in=categories_data)
            dream.categories.set(categories)
        
        # 处理标签
        if tags_data:
            tag_instances = []
            for tag_data in tags_data:
                tag, created = Tag.objects.get_or_create(
                    name=tag_data['name'],
                    tag_type=tag_data.get('tag_type', 'emotion'),
                    created_by=self.context['request'].user,
                    defaults={
                        'is_public': tag_data.get('is_public', False)
                    }
                )
                tag_instances.append(tag)
            dream.tags.set(tag_instances)
        
        # 处理相关梦境
        if related_dream_ids:
            related_dreams = Dream.objects.filter(
                id__in=related_dream_ids,
                user=self.context['request'].user
            )
            dream.related_dreams.set(related_dreams)
        
        return dream


class DreamUpdateSerializer(DreamCreateSerializer):
    """梦境更新序列化器"""
    
    def update(self, instance, validated_data):
        # 提取关联数据
        categories_data = validated_data.pop('categories', None)
        tags_data = validated_data.pop('tags', None)
        related_dream_ids = validated_data.pop('related_dream_ids', None)
        
        # 更新基础字段
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # 更新分类
        if categories_data is not None:
            categories = DreamCategory.objects.filter(name__in=categories_data)
            instance.categories.set(categories)
        
        # 更新标签
        if tags_data is not None:
            instance.tags.clear()  # 先清除旧标签
            # 处理新标签
            tag_instances = []
            for tag_data in tags_data:
                tag, created = Tag.objects.get_or_create(
                    name=tag_data['name'],
                    tag_type=tag_data.get('tag_type', 'emotion'),
                    created_by=self.context['request'].user,
                    defaults={
                        'is_public': tag_data.get('is_public', False)
                    }
                )
                tag_instances.append(tag)
            instance.tags.set(tag_instances)
        
        # 更新相关梦境
        if related_dream_ids is not None:
            related_dreams = Dream.objects.filter(
                id__in=related_dream_ids,
                user=self.context['request'].user
            )
            instance.related_dreams.set(related_dreams)
        
        return instance


class DreamListSerializer(serializers.ModelSerializer):
    """梦境列表序列化器（简化版）"""
    categories = DreamCategorySerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    preview_image = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()
    
    # 显示字段
    lucidity_level_display = serializers.CharField(source='get_lucidity_level_display', read_only=True)
    mood_in_dream_display = serializers.CharField(source='get_mood_in_dream_display', read_only=True)
    
    # 计算字段
    word_count = serializers.ReadOnlyField()
    reading_time = serializers.ReadOnlyField()
    
    def to_representation(self, instance):
        """自定义序列化输出，处理图片URL签名"""
        data = super().to_representation(instance)
        
        # 为内容中的私有图片生成签名URL
        if data.get('content') and instance.user_id:
            data['content'] = DreamSerializer._process_image_urls_with_signatures(
                data['content'], 
                instance.user_id
            )
        
        return data

    class Meta:
        model = Dream
        fields = [
            'id', 'title', 'content', 'dream_date', 'author',
            'lucidity_level', 'lucidity_level_display',
            'mood_in_dream', 'mood_in_dream_display',
            'vividness', 'is_recurring',
            'categories', 'tags', 'preview_image',
            'privacy', 'is_favorite',
            'created_at', 'updated_at',
            'word_count', 'reading_time'
        ]
    
    def get_author(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username
        }
    
    def get_preview_image(self, obj):
        # 从HTML内容中提取第一张图片，并为私有图片生成签名URL
        if obj.content:
            from bs4 import BeautifulSoup
            try:
                soup = BeautifulSoup(obj.content, 'html.parser')
                first_img = soup.find('img')
                if first_img and first_img.get('src'):
                    img_url = first_img.get('src')
                    
                    # 检查是否为私有OSS资源，如果是则生成签名URL
                    file_key = DreamSerializer._extract_file_key_from_url(img_url)
                    if file_key and file_key.startswith(f'users/{obj.user_id}/'):
                        try:
                            oss_client = OSS(user_id=obj.user_id)
                            img_url = oss_client.get_signed_url(file_key, expires=3600)
                        except Exception:
                            pass  # 签名失败时使用原始URL
                    
                    return {
                        'url': img_url,
                        'alt': first_img.get('alt', '')
                    }
            except:
                pass
        return None


class DreamJournalSerializer(serializers.ModelSerializer):
    """梦境日记本序列化器"""
    dreams_count = serializers.SerializerMethodField()
    recent_dreams = serializers.SerializerMethodField()
    
    class Meta:
        model = DreamJournal
        fields = [
            'id', 'name', 'description', 'color_theme', 'is_default',
            'dreams_count', 'recent_dreams', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_dreams_count(self, obj):
        return obj.dreams.count()
    
    def get_recent_dreams(self, obj):
        recent = obj.dreams.order_by('-dream_date')[:3]
        return DreamListSerializer(recent, many=True).data


class SleepPatternSerializer(serializers.ModelSerializer):
    """睡眠模式序列化器"""
    sleep_quality_display = serializers.CharField(source='get_sleep_quality_display', read_only=True)
    
    class Meta:
        model = SleepPattern
        fields = [
            'id', 'date', 'bedtime', 'sleep_time', 'wake_time',
            'sleep_quality', 'sleep_quality_display', 'total_sleep_time',
            'awakenings', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate_date(self, value):
        """验证日期不能是未来"""
        if value > timezone.now().date():
            raise serializers.ValidationError("日期不能是未来日期")
        return value


class UploadedImageSerializer(serializers.ModelSerializer):
    """上传图片序列化器"""
    signed_url = serializers.SerializerMethodField()
    
    class Meta:
        model = UploadedImage
        fields = [
            'id', 'url', 'signed_url', 'file_key', 'user', 'dream', 
            'status', 'upload_time', 'updated_at'
        ]
        read_only_fields = ['id', 'upload_time', 'updated_at', 'signed_url']

    def get_signed_url(self, obj):
        """为私有图片生成临时访问签名URL"""
        if obj.file_key and obj.user_id:
            try:
                oss_client = OSS(user_id=obj.user_id)
                # 为即时预览生成一个5分钟有效期的签名URL
                return oss_client.get_signed_url(obj.file_key, expires=300)
            except Exception:
                return None
        return None

from rest_framework import serializers
from django.core.validators import RegexValidator
from django.contrib.auth import authenticate
from apps.user.models import User
import re

class UserSerializer(serializers.ModelSerializer):
    """
    用户序列化器
    """

    class Meta:
        model = User
        fields = (
            'id', 'username', 'phone_number', 'email', 'backup_email', 'avatar',
            'date_joined', 'last_login'
        )
        read_only_fields = ('id', 'date_joined', 'last_login')
        extra_kwargs = {
            'username': {
                'min_length': 3,
                'max_length': 20,
                'error_messages': {
                    'min_length': '用户名长度不能少于3个字符',
                    'max_length': '用户名长度不能超过20个字符',
                }
            }
        }


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """用户资料更新（头像、用户名）"""
    class Meta:
        model = User
        fields = ('username', 'avatar')

    def validate_username(self, value):
        if not value:
            raise serializers.ValidationError('用户名不能为空')
        if User.objects.exclude(pk=self.instance.pk).filter(username=value).exists():
            raise serializers.ValidationError('该用户名已被注册')
        return value


class BackupEmailSerializer(serializers.ModelSerializer):
    """备用邮箱设置，仅用于找回密码"""
    class Meta:
        model = User
        fields = ('backup_email',)

    def validate_backup_email(self, value):
        if value and self.instance.email and value == self.instance.email:
            raise serializers.ValidationError('备用邮箱不能与主邮箱相同')
        return value


class ChangeEmailSerializer(serializers.Serializer):
    """更换主邮箱"""
    new_email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)

    def validate_new_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('该邮箱已被注册')
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """已登录状态修改密码"""
    currentPassword = serializers.CharField(write_only=True, style={'input_type': 'password'})
    newPassword = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        error_messages={
            'min_length': '密码长度不能少于8个字符',
        }
    )

    def validate_newPassword(self, value):
        """验证新密码复杂度"""
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError('密码必须包含至少一个数字')
        if not any(char.isalpha() for char in value):
            raise serializers.ValidationError('密码必须包含至少一个字母')
        return value


class BackupEmailVerificationSerializer(serializers.Serializer):
    """备用邮箱验证码校验"""
    backup_email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)

    def validate_backup_email(self, value):
        # 备用邮箱不能与已存在的主邮箱重复
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('该邮箱已被他人注册为主邮箱')
        return value


class UserLoginSerializer(serializers.Serializer):
    """
    用户登录序列化器
    """
    username = serializers.CharField(label='用户名或手机号')
    password = serializers.CharField(
        label='密码',
        style={'input_type': 'password'},
        trim_whitespace=False
    )

    def validate(self, data):
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            raise serializers.ValidationError('请提供用户名和密码')

        # 支持使用手机号登录
        if username.isdigit() and len(username) == 11:
            try:
                user = User.objects.get(phone_number=username)
                username = user.username
            except User.DoesNotExist:
                pass

        # 验证用户
        user = authenticate(
            request=self.context.get('request'),
            username=username,
            password=password
        )

        if not user:
            raise serializers.ValidationError('无法使用提供的凭据登录')

        if not user.is_active:
            raise serializers.ValidationError('该用户已被禁用')

        data['user'] = user
        return data


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    用户注册序列化器 - 支持手机号和邮箱注册
    """
    code = serializers.CharField(
        max_length=6,
        min_length=6,
        write_only=True,
        label='验证码',
        error_messages={
            'required': '请提供验证码',
            'blank': '验证码不能为空',
            'max_length': '验证码最多为6个字符',
            'min_length': '验证码最少为6个字符',
        }
    )

    class Meta:
        model = User
        fields = ('username', 'phone_number', 'email', 'password', 'code')
        extra_kwargs = {
            'password': {
                'write_only': True,
                'style': {'input_type': 'password'},
                'min_length': 8,
                'error_messages': {
                    'required': '请提供密码',
                    'blank': '密码不能为空',
                    'min_length': '密码长度不能少于8个字符',
                }
            },
            'username': {
                'error_messages': {
                    'required': '请提供用户名',
                    'blank': '用户名不能为空',
                    'unique': '该用户名已被注册',
                },
                'min_length': 3,
                'max_length': 20
            },
            'phone_number': {
                'required': False,
                'error_messages': {
                    'blank': '手机号不能为空',
                    'unique': '该手机号已被注册',
                }
            },
            'email': {
                'required': False,
                'error_messages': {
                    'blank': '邮箱不能为空',
                    'unique': '该邮箱已被注册',
                }
            }
        }

    def validate_username(self, value):
        """验证用户名是否已经存在"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("该用户名已被注册")
        return value

    def validate_phone_number(self, value):
        """验证手机号是否已经存在"""
        if value and User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("该手机号已被注册")
        return value

    def validate_email(self, value):
        """验证邮箱是否已经存在"""
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("该邮箱已被注册")
        return value

    def validate(self, data):
        """通用验证"""
        # 确保提供了手机号或邮箱
        phone_number = data.get('phone_number')
        email = data.get('email')
        
        if not phone_number and not email:
            raise serializers.ValidationError("请提供手机号或邮箱地址")

        # 对密码进行验证
        password = data.get('password', '')
        if len(password) < 8:
            raise serializers.ValidationError({"password": "密码长度不能少于8个字符"})

        # 验证密码复杂度
        if not any(char.isdigit() for char in password):
            raise serializers.ValidationError({"password": "密码必须包含至少一个数字"})
        if not any(char.isalpha() for char in password):
            raise serializers.ValidationError({"password": "密码必须包含至少一个字母"})

        return data

    def create(self, validated_data):
        """
        根据注册方式创建用户
        """
        # 从验证数据中移除 code
        validated_data.pop('code', None)

        # 根据是否存在 email 或 phone_number 来决定注册方式
        if 'email' in validated_data:
            validated_data['registration_method'] = 'email'
        elif 'phone_number' in validated_data:
            validated_data['registration_method'] = 'phone'
        
        user = User.objects.create_user(**validated_data)
        return user


class PhoneLoginSerializer(serializers.Serializer):
    """
    手机号验证码登录序列化器
    """
    phone_number = serializers.CharField(
        max_length=11,
        validators=[
            RegexValidator(
                regex=r'^1[3-9]\d{9}$',
                message='请输入有效的中国大陆手机号'
            )
        ],
        error_messages={
            'required': '请提供手机号',
            'blank': '手机号不能为空',
            'max_length': '手机号最多为11个字符',
        }
    )

    code = serializers.CharField(
        max_length=6,
        min_length=6,
        error_messages={
            'required': '请提供验证码',
            'blank': '验证码不能为空',
            'max_length': '验证码最多为6个字符',
            'min_length': '验证码最少为6个字符',
        }
    )

    def validate(self, data):
        phone_number = data.get('phone_number')
        code = data.get('code')

        if not phone_number or not code:
            raise serializers.ValidationError('请提供手机号和验证码')

        # 尝试查找用户
        try:
            user = User.objects.get(phone_number=phone_number)
        except User.DoesNotExist:
            raise serializers.ValidationError('该手机号未注册')

        if not user.is_active:
            raise serializers.ValidationError('该用户已被禁用')

        data['user'] = user
        return data


class EmailLoginSerializer(serializers.Serializer):
    """
    邮箱验证码登录序列化器
    """
    email = serializers.EmailField(
        error_messages={
            'required': '请提供邮箱地址',
            'blank': '邮箱地址不能为空',
            'invalid': '请提供有效的邮箱地址'
        }
    )

    code = serializers.CharField(
        max_length=6,
        min_length=6,
        error_messages={
            'required': '请提供验证码',
            'blank': '验证码不能为空',
            'max_length': '验证码最多为6个字符',
            'min_length': '验证码最少为6个字符',
        }
    )

    def validate(self, data):
        email = data.get('email')
        code = data.get('code')

        if not email or not code:
            raise serializers.ValidationError('请提供邮箱和验证码')

        # 尝试查找用户
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError('该邮箱未注册')

        if not user.is_active:
            raise serializers.ValidationError('该用户已被禁用')

        data['user'] = user
        return data


class PasswordResetSerializer(serializers.Serializer):
    """
    密码重置序列化器 - 统一重置接口
    支持三种方式：
    - method = 'current_password'：已登录用户，提供 currentPassword + newPassword
    - method = 'phone'：手机号 + 验证码 + newPassword
    - method = 'email'：邮箱 + 验证码 + newPassword
    """
    method = serializers.ChoiceField(
        choices=['current_password', 'phone', 'email'], required=False
    )
    phone = serializers.CharField(
        max_length=11,
        required=False,
        validators=[
            RegexValidator(
                regex=r'^1[3-9]\d{9}$',
                message='请输入有效的中国大陆手机号'
            )
        ],
        error_messages={
            'blank': '手机号不能为空',
            'max_length': '手机号最多为11个字符',
        }
    )
    
    email = serializers.EmailField(
        required=False,
        error_messages={
            'blank': '邮箱地址不能为空',
            'invalid': '请提供有效的邮箱地址'
        }
    )
    
    currentPassword = serializers.CharField(
        required=False,
        write_only=True,
        style={'input_type': 'password'}
    )
    username = serializers.CharField(required=False)
    
    code = serializers.CharField(
        max_length=6,
        min_length=6,
        error_messages={
            'required': '请提供验证码',
            'blank': '验证码不能为空',
            'max_length': '验证码最多为6个字符',
            'min_length': '验证码最少为6个字符',
        }
    )
    
    newPassword = serializers.CharField(
        min_length=8,
        style={'input_type': 'password'},
        error_messages={
            'required': '请提供新密码',
            'blank': '新密码不能为空',
            'min_length': '密码长度不能少于8个字符',
        }
    )

    def validate(self, data):
        """验证数据，根据 method 做必填校验"""
        method = data.get('method')
        phone = data.get('phone')
        email = data.get('email')
        new_password = data.get('newPassword', '')
        current_password = data.get('currentPassword')

        # 若未提供 method，自动推断
        if not method:
            if current_password:
                method = 'current_password'
            elif phone:
                method = 'phone'
            elif email:
                method = 'email'
            data['method'] = method

        if method == 'current_password':
            if not current_password:
                raise serializers.ValidationError({'currentPassword': '当前密码不能为空'})
            # 需要提供一个可定位用户的标识（username/email/phone）
            if not (data.get('username') or phone or email):
                raise serializers.ValidationError({'identifier': '请提供用户名、手机号或邮箱其一'})
        elif method == 'phone':
            if not phone:
                raise serializers.ValidationError({'phone': '请提供手机号'})
            if not data.get('code'):
                raise serializers.ValidationError({'code': '请提供验证码'})
        elif method == 'email':
            if not email:
                raise serializers.ValidationError({'email': '请提供邮箱地址'})
            if not data.get('code'):
                raise serializers.ValidationError({'code': '请提供验证码'})
        else:
            raise serializers.ValidationError({'method': '不支持的重置方式'})
        
        # 验证密码复杂度
        if len(new_password) < 8:
            raise serializers.ValidationError({"newPassword": "密码长度不能少于8个字符"})
        
        if not any(char.isdigit() for char in new_password):
            raise serializers.ValidationError({"newPassword": "密码必须包含至少一个数字"})
        if not any(char.isalpha() for char in new_password):
            raise serializers.ValidationError({"newPassword": "密码必须包含至少一个字母"})
            
        return data


class VerificationCodeRequestSerializer(serializers.Serializer):
    """验证码请求序列化器 - 支持短信和邮箱"""
    phone = serializers.CharField(required=False)
    email = serializers.EmailField(required=False) 
    scene = serializers.ChoiceField(
        choices=['register', 'login', 'reset_password', 'change_email', 'backup_email'],
        required=True
    )
    
    def validate(self, data):
        phone = data.get('phone')
        email = data.get('email')
        
        if not phone and not email:
            raise serializers.ValidationError('请提供手机号或邮箱地址')
            
        return data

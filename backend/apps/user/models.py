from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.validators import UnicodeUsernameValidator


# 用户的注册方式
class RegistrationMethod(models.TextChoices):
    EMAIL = 'email', _('邮箱')
    PHONE = 'phone', _('手机')


class User(AbstractUser):
    """自定义用户模型"""
    username = models.CharField(
        _('username'),
        max_length=150,
        unique=True,
        help_text=_('Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.'),
        validators=[UnicodeUsernameValidator()],
        error_messages={
            'unique': _("A user with that username already exists."),
        },
    )

    email = models.EmailField(_('邮箱地址'), unique=True, null=True, blank=True, default=None)

    phone_number = models.CharField(
        _('手机号'),
        max_length=11,
        unique=True,
        null=True,
        blank=True,
        validators=[RegexValidator(r'^1[3-9]\d{9}$', '请输入正确的手机号')],
        default=None
    )

    registration_method = models.CharField(
        max_length=10,
        choices=RegistrationMethod.choices,
        default=RegistrationMethod.EMAIL,
        verbose_name=_('注册方式')
    )

    # 用户偏好设置
    timezone = models.CharField(max_length=50, default='Asia/Shanghai', verbose_name='时区')
    dream_privacy_default = models.CharField(
        max_length=10,
        choices=[('private', '私人'), ('public', '公开'), ('friends', '好友可见')],
        default='private',
        verbose_name='梦境默认隐私设置'
    )

    # 头像URL（存储OSS访问URL或相对路径）
    avatar = models.URLField(max_length=500, null=True, blank=True, verbose_name='头像地址')

    # 备用邮箱：仅用于找回密码
    backup_email = models.EmailField('备用邮箱', null=True, blank=True, default=None, unique=False)

    class Meta:
        verbose_name = _('用户')
        verbose_name_plural = verbose_name

    def clean(self):
        super().clean()
        if not self.phone_number and not self.email:
            raise ValidationError('必须提供手机号或邮箱地址其中一个')

        if self.phone_number:
            existing_user = User.objects.filter(phone_number=self.phone_number).exclude(pk=self.pk).first()
            if existing_user:
                raise ValidationError({'phone_number': '该手机号已被注册'})

        if self.email:
            existing_user = User.objects.filter(email=self.email).exclude(pk=self.pk).first()
            if existing_user:
                raise ValidationError({'email': '该邮箱地址已被注册'})

        # 备用邮箱不能与主邮箱相同
        if self.backup_email and self.email and self.backup_email == self.email:
            raise ValidationError({'backup_email': '备用邮箱不能与主邮箱相同'})

    def __str__(self):
        return self.username or self.phone_number or self.email

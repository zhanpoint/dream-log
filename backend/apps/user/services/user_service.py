"""
用户管理服务
处理用户信息更新、设置等业务逻辑
"""
from django.contrib.auth import get_user_model
from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings
from apps.user.utils.email import EmailService
from apps.dream.utils.oss import OSS
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class UserService:
    """用户管理服务类"""
    
    @staticmethod
    def update_user_profile(user, **validated_data):
        """
        更新用户资料（用户名、头像）
        
        Returns:
            tuple: (success: bool, updated_user: User, error: str)
        """
        try:
            for field, value in validated_data.items():
                if hasattr(user, field):
                    setattr(user, field, value)
            
            user.save(update_fields=validated_data.keys())
            logger.info(f"用户 {user.id} 资料更新成功")
            
            return True, user, None
            
        except Exception as e:
            logger.exception(f"用户资料更新失败: {str(e)}")
            return False, None, "更新失败"
    
    @staticmethod
    def change_email(user, new_email, verification_code):
        """
        更换主邮箱
        
        Returns:
            tuple: (success: bool, error: str)
        """
        try:
            # 校验验证码
            if not EmailService.verify_code(new_email, verification_code):
                return False, "验证码错误或已过期"
            
            # 检查邮箱是否已被使用
            if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
                return False, "该邮箱已被注册"
            
            # 更新邮箱
            old_email = user.email
            user.email = new_email
            user.save(update_fields=['email'])
            
            logger.info(f"用户 {user.id} 邮箱由 {old_email} 更换为 {new_email}")
            return True, None
            
        except Exception as e:
            logger.exception(f"更换邮箱失败: {str(e)}")
            return False, "更换邮箱失败"
    
    @staticmethod
    def change_password(user, current_password, new_password):
        """
        更改密码（已登录状态）
        
        Returns:
            tuple: (success: bool, error: str)
        """
        try:
            # 验证当前密码
            if not user.check_password(current_password):
                return False, "当前密码不正确"
            
            # 设置新密码
            user.set_password(new_password)
            user.save(update_fields=['password'])
            
            logger.info(f"用户 {user.id} 修改登录密码成功")
            return True, None
            
        except Exception as e:
            logger.exception(f"修改密码失败: {str(e)}")
            return False, "修改密码失败"
    
    @staticmethod
    def set_backup_email(user, backup_email, verification_code):
        """
        设置备用邮箱
        
        Returns:
            tuple: (success: bool, error: str)
        """
        try:
            # 验证验证码
            if not EmailService.verify_code(backup_email, verification_code):
                return False, "验证码错误或已过期"
            
            # 备用邮箱不能与主邮箱相同
            if backup_email == user.email:
                return False, "备用邮箱不能与主邮箱相同"
            
            # 检查备用邮箱是否已被其他人注册为主邮箱
            if User.objects.filter(email=backup_email).exists():
                return False, "该邮箱已被他人注册为主邮箱"
            
            # 设置备用邮箱
            old_backup_email = user.backup_email
            user.backup_email = backup_email
            user.save(update_fields=['backup_email'])
            
            logger.info(f"用户 {user.id} 备用邮箱由 {old_backup_email} 更换为 {backup_email}")
            
            # 发送安全提醒邮件
            UserService._send_security_alert(user, backup_email)
            
            return True, None
            
        except Exception as e:
            logger.exception(f"设置备用邮箱失败: {str(e)}")
            return False, "设置备用邮箱失败"
    
    @staticmethod
    def _send_security_alert(user, backup_email):
        """向主邮箱发送安全提醒"""
        try:
            if not user.email:
                return
            
            subject = 'DreamLog 安全提醒：备用邮箱已变更'
            context = {
                'username': user.username,
                'backup_email': backup_email,
            }
            
            html_message = render_to_string('user/email/security_backup_email_changed.html', context)
            text_message = render_to_string('user/email/security_backup_email_changed.txt', context)
            
            send_mail(
                subject,
                text_message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                html_message=html_message
            )
            
            logger.info(f"向用户 {user.id} 主邮箱发送备用邮箱安全提醒成功")
            
        except Exception as e:
            logger.warning(f"发送备用邮箱安全提醒失败: {e}")
    
    @staticmethod
    def get_user_info(user):
        """获取完整用户信息，确保包含所有必要字段"""
        # 规范化头像为稳定URL（去除任何签名查询参数）
        stable_avatar = UserService._normalize_avatar_url(user.avatar)

        data = {
            'id': user.id,
            'username': user.username,
            'phone_number': user.phone_number,
            'email': user.email,
            'backup_email': user.backup_email,
            'avatar': stable_avatar,
            'date_joined': user.date_joined.isoformat() if user.date_joined else None,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'timezone': getattr(user, 'timezone', 'Asia/Shanghai'),
            'dream_privacy_default': getattr(user, 'dream_privacy_default', 'private'),
        }

        # 为私有桶头像生成临时访问签名
        if stable_avatar and '/users/' in stable_avatar:
            file_key = UserService._extract_file_key(stable_avatar)
            if file_key:
                try:
                    oss_client = OSS(user_id=user.id)
                    data['avatar_signed'] = oss_client.get_signed_url(file_key)
                except Exception:
                    pass

        return data

    @staticmethod
    def _normalize_avatar_url(avatar_url):
        """规范化头像URL，移除签名参数"""
        if not avatar_url:
            return ''
        try:
            parsed = urlparse(avatar_url)
            return f"{parsed.scheme}://{parsed.netloc}{parsed.path}" if parsed.scheme and parsed.netloc else avatar_url.split('?')[0]
        except Exception:
            return avatar_url.split('?')[0]

    @staticmethod
    def _extract_file_key(stable_url):
        """从稳定URL提取file_key"""
        try:
            parsed = urlparse(stable_url)
            return parsed.path.lstrip('/')
        except Exception:
            # 降级处理：从URL中提取文件路径
            try:
                return stable_url.split('/', 3)[-1]
            except Exception:
                return None

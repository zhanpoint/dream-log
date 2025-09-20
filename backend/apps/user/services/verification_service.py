"""
验证码服务
统一管理短信和邮箱验证码的发送与验证
"""
from django.core.cache import cache
from apps.user.models import User
from apps.user.utils.sms import SMSService
from apps.user.utils.email import EmailService
from config.env_manager import settings
import logging

logger = logging.getLogger(__name__)


class VerificationService:
    """验证码服务类"""
    
    SCENE_MAPPING = {
        'register': '注册',
        'login': '登录', 
        'reset_password': '重置密码',
        'change_email': '更换邮箱',
        'backup_email': '设置备用邮箱'
    }
    
    @staticmethod
    def send_sms_code(phone, scene):
        """
        发送短信验证码
        
        Returns:
            tuple: (success: bool, error: str, wait_time: int)
        """
        # 检查短信服务是否启用
        if not settings.features.settings.get('SMS_SERVICE_ENABLED'):
            return False, "短信服务暂时不可用，请使用邮箱验证码", 0
        
        # 检查用户存在性
        error = VerificationService._check_user_existence(phone, 'phone', scene)
        if error:
            return False, error, 0
        
        # 检查发送频率
        allowed, wait_time = VerificationService._check_rate_limit(phone, 'sms')
        if not allowed:
            return False, f"发送过于频繁，请{wait_time}秒后再试", wait_time
        
        # 发送验证码
        success = SMSService.send_verification_code(phone, scene)
        if success:
            logger.info(f"短信验证码发送成功: {phone}, 场景: {scene}")
            return True, None, 0
        else:
            return False, "验证码发送失败，请稍后重试", 0
    
    @staticmethod
    def send_email_code(email, scene):
        """
        发送邮箱验证码
        
        Returns:
            tuple: (success: bool, error: str, wait_time: int)
        """
        # 检查用户存在性
        error = VerificationService._check_user_existence(email, 'email', scene)
        if error:
            return False, error, 0
        
        # 检查发送频率
        allowed, wait_time = VerificationService._check_rate_limit(email, 'email')
        if not allowed:
            return False, f"发送频率过快，请{wait_time}秒后再试", wait_time
        
        # 发送验证码
        success = EmailService.send_verification_code(email, scene)
        if success:
            logger.info(f"邮箱验证码发送成功: {email}, 场景: {scene}")
            return True, None, 0
        else:
            return False, "验证码发送失败，请稍后重试", 0
    
    @staticmethod
    def verify_sms_code(phone, code):
        """验证短信验证码"""
        return SMSService.verify_code(phone, code)
    
    @staticmethod
    def verify_email_code(email, code):
        """验证邮箱验证码"""
        return EmailService.verify_code(email, code)
    
    @staticmethod
    def _check_user_existence(contact, contact_type, scene):
        """
        检查用户存在性
        
        Args:
            contact: 联系方式（手机号或邮箱）
            contact_type: 联系方式类型（'phone' 或 'email'）  
            scene: 使用场景
            
        Returns:
            str: 错误信息，None表示检查通过
        """
        if contact_type == 'phone':
            user_exists = User.objects.filter(phone_number=contact).exists()
            contact_name = "手机号"
        else:
            # 邮箱：默认按主邮箱判断；在 reset_password 场景下同时允许备用邮箱
            primary_exists = User.objects.filter(email=contact).exists()
            backup_exists = User.objects.filter(backup_email=contact).exists()
            user_exists = primary_exists or (backup_exists if scene == 'reset_password' else False)
            contact_name = "邮箱"
        
        # 注册场景：不允许已存在的用户
        if scene == 'register' and user_exists:
            return f"该{contact_name}已被注册"
        
        # 登录和重置密码场景：要求用户存在
        if scene in ['login', 'reset_password'] and not user_exists:
            return f"该{contact_name}未注册"
        
        # 更换邮箱和备用邮箱场景：不允许已存在的邮箱
        if scene in ['change_email', 'backup_email'] and contact_type == 'email':
            if scene == 'change_email' and user_exists:
                return "该邮箱已被注册"
            elif scene == 'backup_email' and user_exists:
                return "该邮箱已被他人注册为主邮箱"
        
        return None
    
    @staticmethod
    def _check_rate_limit(contact, method, limit_seconds=60):
        """
        检查发送频率限制
        
        Returns:
            tuple: (allowed: bool, remaining_time: int)
        """
        rate_limit_key = f"{method}_rate_limit:{contact}"
        
        # 获取剩余的TTL
        ttl = cache.ttl(rate_limit_key)
        
        if ttl > 0:
            return False, ttl
        
        # 设置新的频率限制
        cache.set(rate_limit_key, True, timeout=limit_seconds)
        return True, 0

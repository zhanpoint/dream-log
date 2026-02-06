"""
认证服务
处理用户注册、登录、登出等认证相关业务逻辑
"""
from django.contrib.auth import login, logout, authenticate
from django.core.cache import cache
from rest_framework_simplejwt.tokens import RefreshToken
from apps.user.models import User
from apps.user.utils.sms import SMSService  
from apps.user.utils.email import EmailService
from apps.user.utils.response_handler import APIExceptionHandler
import logging

logger = logging.getLogger(__name__)


class AuthService:
    """认证服务类"""
    
    @staticmethod
    def register_user(validated_data, verification_code, contact_method):
        """
        用户注册
        
        Args:
            validated_data: 验证后的用户数据
            verification_code: 验证码
            contact_method: 联系方式('phone' 或 'email')
        
        Returns:
            tuple: (success: bool, user: User, error: str)
        """
        try:
            # 验证验证码
            if contact_method == 'phone':
                phone = validated_data['phone_number']
                if not SMSService.verify_code(phone, verification_code):
                    return False, None, "验证码错误或已过期"
            elif contact_method == 'email':
                email = validated_data['email']
                if not EmailService.verify_code(email, verification_code):
                    return False, None, "验证码错误或已过期"
            
            # 创建用户
            user = User.objects.create_user(**validated_data)
            logger.info(f"用户注册成功: {user.username}")
            
            return True, user, None
            
        except Exception as e:
            logger.exception(f"用户注册失败: {str(e)}")
            return False, None, str(e)
    
    @staticmethod
    def generate_tokens(user):
        """生成JWT令牌"""
        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }
    
    @staticmethod
    def login_with_password(username, password, request):
        """
        用户名密码登录
        
        Returns:
            tuple: (success: bool, user: User, tokens: dict, error: str)
        """
        try:
            # 支持使用手机号登录
            if username.isdigit() and len(username) == 11:
                try:
                    user_obj = User.objects.get(phone_number=username)
                    username = user_obj.username
                except User.DoesNotExist:
                    pass
            
            user = authenticate(request=request, username=username, password=password)
            
            if not user:
                return False, None, None, "用户名或密码错误"
            
            if not user.is_active:
                return False, None, None, "该用户已被禁用"
            
            login(request, user)
            tokens = AuthService.generate_tokens(user)
            logger.info(f"用户登录成功: {user.username}")
            
            return True, user, tokens, None
            
        except Exception as e:
            logger.exception(f"登录失败: {str(e)}")
            return False, None, None, "登录失败"
    
    @staticmethod
    def login_with_verification_code(contact, verification_code, contact_method, request):
        """
        验证码登录
        
        Args:
            contact: 联系方式（手机号或邮箱）
            verification_code: 验证码
            contact_method: 联系方式类型('phone' 或 'email')
            request: 请求对象
        
        Returns:
            tuple: (success: bool, user: User, tokens: dict, error: str)
        """
        try:
            # 验证验证码
            if contact_method == 'phone':
                if not SMSService.verify_code(contact, verification_code):
                    return False, None, None, "验证码错误或已过期"
                user = User.objects.get(phone_number=contact)
            elif contact_method == 'email':
                if not EmailService.verify_code(contact, verification_code):
                    return False, None, None, "验证码错误或已过期"
                user = User.objects.get(email=contact)
            
            if not user.is_active:
                return False, None, None, "该用户已被禁用"
            
            login(request, user)
            tokens = AuthService.generate_tokens(user)
            logger.info(f"验证码登录成功: {user.username}")
            
            return True, user, tokens, None
            
        except User.DoesNotExist:
            contact_type = "手机号" if contact_method == 'phone' else "邮箱"
            return False, None, None, f"该{contact_type}未注册"
        except Exception as e:
            logger.exception(f"验证码登录失败: {str(e)}")
            return False, None, None, "登录失败"
    
    @staticmethod
    def logout_user(request, refresh_token=None):
        """
        用户登出
        
        Returns:
            tuple: (success: bool, error: str)
        """
        try:
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            logout(request)
            logger.info(f"用户登出成功")
            return True, None
            
        except Exception as e:
            logger.exception(f"登出失败: {str(e)}")
            return False, "登出失败"
    
    @staticmethod
    def check_login_attempts(identifier, max_attempts=5, lockout_time=900):
        """
        检查登录尝试次数
        
        Returns:
            tuple: (allowed: bool, remaining_time: int)
        """
        attempts_key = f"login_attempts:{identifier}"
        lockout_key = f"login_lockout:{identifier}"
        
        # 检查是否被锁定
        lockout_ttl = cache.ttl(lockout_key)
        if lockout_ttl > 0:
            return False, lockout_ttl
        
        # 获取当前尝试次数
        attempts = cache.get(attempts_key, 0)
        
        if attempts >= max_attempts:
            # 设置锁定
            cache.set(lockout_key, True, timeout=lockout_time)
            cache.delete(attempts_key)
            return False, lockout_time
        
        return True, 0
    
    @staticmethod
    def increment_login_attempts(identifier):
        """增加登录尝试次数"""
        attempts_key = f"login_attempts:{identifier}"
        attempts = cache.get(attempts_key, 0)
        cache.set(attempts_key, attempts + 1, timeout=3600)
    
    @staticmethod
    def reset_login_attempts(identifier):
        """重置登录尝试次数"""
        attempts_key = f"login_attempts:{identifier}"
        lockout_key = f"login_lockout:{identifier}"
        cache.delete(attempts_key)
        cache.delete(lockout_key)
    
    @staticmethod
    def reset_password(contact, verification_code, new_password, contact_method):
        """
        重置密码
        
        Returns:
            tuple: (success: bool, error: str)
        """
        try:
            # 验证验证码
            if contact_method == 'current_password':
                # 该分支由上层直接调用 change_password，不经此处
                return False, "当前密码重置请调用用户修改密码接口"
            elif contact_method == 'phone':
                if not SMSService.verify_code(contact, verification_code):
                    return False, "验证码错误或已过期"
                user = User.objects.get(phone_number=contact)
            elif contact_method == 'email':
                if not EmailService.verify_code(contact, verification_code):
                    return False, "验证码错误或已过期"
                # 支持通过主邮箱或备用邮箱查找
                user = User.objects.filter(email=contact).first()
                if not user:
                    user = User.objects.filter(backup_email=contact).first()
                if not user:
                    return False, "该邮箱未注册"
            
            # 重置密码
            user.set_password(new_password)
            user.save(update_fields=['password'])
            
            logger.info(f"密码重置成功: {contact}")
            return True, None
            
        except User.DoesNotExist:
            contact_type = "手机号" if contact_method == 'phone' else "邮箱"
            return False, f"该{contact_type}未注册"
        except Exception as e:
            logger.exception(f"密码重置失败: {str(e)}")
            return False, "密码重置失败"

"""
WebSocket 使用自定义的 JWTAuthMiddleware
通过查询参数 ?token=<jwt_token> 传递
WebSocket 无法使用标准的 HTTP 认证头
"""
import logging
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)


@database_sync_to_async
def get_user(user_id):
    """根据用户ID获取用户对象"""
    try:
        return User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """JWT认证中间件"""
    
    async def __call__(self, scope, receive, send):
        # 解析查询字符串
        query_string = parse_qs(scope.get('query_string', b'').decode())
        token = query_string.get('token', [None])[0]
        
        # 默认设置为匿名用户
        scope['user'] = AnonymousUser()
        
        if token:
            try:
                # 验证JWT Token
                validated_token = UntypedToken(token)
                user_id = validated_token.payload.get('user_id')
                
                if user_id:
                    # 获取用户对象
                    scope['user'] = await get_user(user_id)
                    logger.info(f"WebSocket JWT authenticated user: {user_id}")
                else:
                    logger.warning("JWT Token missing user_id")
                    
            except (InvalidToken, TokenError) as e:
                logger.warning(f"Invalid JWT Token: {e}")
            except Exception as e:
                logger.error(f"JWT authentication error: {e}", exc_info=True)
        else:
            logger.debug("WebSocket connection without token")
        
        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """JWT认证中间件栈"""
    return JWTAuthMiddleware(inner)

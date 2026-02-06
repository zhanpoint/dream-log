"""
统一响应处理器
"""
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


class ResponseHandler:
    """统一API响应处理器"""
    
    @staticmethod
    def success(data=None, message="操作成功", status_code=status.HTTP_200_OK):
        """成功响应"""
        response_data = {
            "code": status_code,
            "message": message,
            "success": True
        }
        if data is not None:
            response_data["data"] = data
            
        return Response(response_data, status=status_code)
    
    @staticmethod
    def error(message="操作失败", errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        """错误响应"""
        response_data = {
            "code": status_code,
            "message": message,
            "success": False
        }
        if errors:
            response_data["errors"] = errors
            
        return Response(response_data, status=status_code)
    
    @staticmethod
    def validation_error(serializer_errors, message="参数验证失败"):
        """参数验证错误响应"""
        return ResponseHandler.error(
            message=message,
            errors=serializer_errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    @staticmethod
    def rate_limit_error(wait_time):
        """频率限制错误响应"""
        return ResponseHandler.error(
            message=f"操作过于频繁，请{wait_time}秒后再试",
            errors={"rate_limit": [f"请{wait_time}秒后再试"]},
            status_code=status.HTTP_429_TOO_MANY_REQUESTS
        )
    
    @staticmethod
    def unauthorized_error(message="认证失败"):
        """认证失败响应"""
        return ResponseHandler.error(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    @staticmethod
    def not_found_error(message="资源不存在"):
        """资源不存在响应"""
        return ResponseHandler.error(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    @staticmethod
    def server_error(message="服务器内部错误"):
        """服务器错误响应"""
        return ResponseHandler.error(
            message=message,
            errors={"detail": ["服务器内部错误，请稍后重试"]},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class APIExceptionHandler:
    """API异常处理器"""
    
    @staticmethod
    def handle_exception(exception, context=None):
        """统一异常处理"""
        logger.exception(f"API异常: {str(exception)}")
        
        # 数据库唯一约束错误
        if "unique constraint" in str(exception).lower():
            if "username" in str(exception).lower():
                return ResponseHandler.error(
                    message="用户名已被使用",
                    errors={"username": ["该用户名已被注册"]}
                )
            elif "phone_number" in str(exception).lower():
                return ResponseHandler.error(
                    message="手机号已被使用",
                    errors={"phone_number": ["该手机号已被注册"]}
                )
            elif "email" in str(exception).lower():
                return ResponseHandler.error(
                    message="邮箱已被使用",
                    errors={"email": ["该邮箱已被注册"]}
                )
        
        # 默认服务器错误
        return ResponseHandler.server_error()

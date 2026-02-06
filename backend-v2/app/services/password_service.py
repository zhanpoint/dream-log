"""
密码服务 - 处理密码哈希、验证和强度检查
"""

import bcrypt


class PasswordService:
    """密码服务类"""

    @staticmethod
    def hash_password(password: str) -> str:
        """哈希密码"""
        # bcrypt 需要 bytes 类型
        password_bytes = password.encode('utf-8')
        # 生成 salt 并哈希
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        # 返回字符串形式
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        """验证密码"""
        try:
            # 转换为 bytes
            plain_bytes = plain.encode('utf-8')
            hashed_bytes = hashed.encode('utf-8')
            # 验证密码
            return bcrypt.checkpw(plain_bytes, hashed_bytes)
        except Exception:
            return False

    @staticmethod
    def validate_password_strength(password: str) -> dict[str, bool | list[str]]:
        """
        验证密码强度
        规则: 至少8位 + 至少包含3种字符类型(大写/小写/数字/特殊符号)

        Returns:
            dict: {"valid": bool, "errors": list[str]}
        """
        errors: list[str] = []

        if len(password) < 8:
            errors.append("密码至少需要 8 个字符")

        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "@#$%^&*()_+-=[]{}|;:,.<>?/" for c in password)

        type_count = sum([has_upper, has_lower, has_digit, has_special])
        if type_count < 3:
            errors.append("密码需要包含至少 3 种字符类型(大写字母、小写字母、数字、特殊符号)")

        return {"valid": len(errors) == 0, "errors": errors}

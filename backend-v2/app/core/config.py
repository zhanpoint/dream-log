"""
应用配置管理
"""
from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    # 自动读取 .env 文件并加载环境变量
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # 应用配置
    app_name: str = Field(default="Dream Log API", alias="APP_NAME")
    app_env: Literal["development", "production", "testing"] = Field(
        default="development", alias="APP_ENV"
    )
    debug: bool = Field(default=False, alias="DEBUG")
    secret_key: str = Field(..., alias="SECRET_KEY")

    # 服务器配置
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    # 数据库配置
    database_url: PostgresDsn = Field(..., alias="DATABASE_URL")

    # Redis 配置
    redis_url: RedisDsn = Field(..., alias="REDIS_URL")

    # JWT 配置
    jwt_secret_key: str = Field(..., alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=10080, alias="ACCESS_TOKEN_EXPIRE_MINUTES")  # 7天 = 7 * 24 * 60 = 10080分钟
    refresh_token_expire_days: int = Field(default=30, alias="REFRESH_TOKEN_EXPIRE_DAYS")  # 30天

    # CORS 配置
    allowed_origins: str = Field(
        default="http://localhost:3000",
        alias="ALLOWED_ORIGINS",
    )
    
    @property
    def cors_origins(self) -> list[str]:
        """解析 CORS 允许的源（支持逗号分隔）"""
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    # SMTP 配置
    smtp_host: str = Field(..., alias="SMTP_HOST")
    smtp_port: int = Field(default=465, alias="SMTP_PORT")
    smtp_user: str = Field(..., alias="SMTP_USER")
    smtp_password: str = Field(..., alias="SMTP_PASSWORD")
    smtp_use_ssl: bool = Field(default=True, alias="SMTP_USE_SSL")
    smtp_use_tls: bool = Field(default=False, alias="SMTP_USE_TLS")

    # Google OAuth 配置
    google_client_id: str | None = Field(default=None, alias="GOOGLE_CLIENT_ID")
    google_client_secret: str | None = Field(default=None, alias="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str | None = Field(default=None, alias="GOOGLE_REDIRECT_URI")

    # AI 服务配置 (统一使用 OpenRouter)
    openrouter_api_key: str | None = Field(default=None, alias="OPENROUTER_API_KEY")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    google_api_key: str | None = Field(default=None, alias="GOOGLE_API_KEY")

    # 阿里云 OSS 配置
    aliyun_oss_access_key_id: str | None = Field(default=None, alias="ALIYUN_OSS_ACCESS_KEY_ID")
    aliyun_oss_access_key_secret: str | None = Field(default=None, alias="ALIYUN_OSS_ACCESS_KEY_SECRET")
    aliyun_oss_endpoint: str | None = Field(default=None, alias="ALIYUN_OSS_ENDPOINT")
    aliyun_oss_role_arn: str | None = Field(default=None, alias="ALIYUN_OSS_ROLE_ARN")
    
    # 公开 Bucket（头像、公开图片等）- 设置为公共读
    aliyun_oss_public_bucket: str | None = Field(default=None, alias="ALIYUN_OSS_PUBLIC_BUCKET")
    
    # 私密 Bucket（用户文档、私密文件等）- 设置为私有
    aliyun_oss_private_bucket: str | None = Field(default=None, alias="ALIYUN_OSS_PRIVATE_BUCKET")

    @property
    def is_development(self) -> bool:
        """是否为开发环境"""
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        """是否为生产环境"""
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """获取配置实例（单例模式）"""
    return Settings()


settings = get_settings()

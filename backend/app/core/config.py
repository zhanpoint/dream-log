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

    # Stripe 配置（按环境区分：sandbox/local 与 production）
    stripe_public_key_sandbox: str | None = Field(
        default=None, alias="STRIPE_PUBLIC_KEY_SANDBOX"
    )
    stripe_public_key_prod: str | None = Field(default=None, alias="STRIPE_PUBLIC_KEY_PROD")
    stripe_secret_key_sandbox: str | None = Field(
        default=None, alias="STRIPE_SECRET_KEY_SANDBOX"
    )
    stripe_secret_key_prod: str | None = Field(default=None, alias="STRIPE_SECRET_KEY_PROD")
    stripe_webhook_secret_sandbox: str | None = Field(
        default=None, alias="STRIPE_WEBHOOK_SECRET_SANDBOX"
    )
    stripe_webhook_secret_prod: str | None = Field(
        default=None, alias="STRIPE_WEBHOOK_SECRET_PROD"
    )
    stripe_price_pro_monthly_sandbox: str | None = Field(
        default=None, alias="STRIPE_PRICE_PRO_MONTHLY_SANDBOX"
    )
    stripe_price_pro_monthly_prod: str | None = Field(
        default=None, alias="STRIPE_PRICE_PRO_MONTHLY_PROD"
    )
    stripe_price_ultra_monthly_sandbox: str | None = Field(
        default=None, alias="STRIPE_PRICE_ULTRA_MONTHLY_SANDBOX"
    )
    stripe_price_ultra_monthly_prod: str | None = Field(
        default=None, alias="STRIPE_PRICE_ULTRA_MONTHLY_PROD"
    )
    stripe_success_url_sandbox: str | None = Field(
        default=None, alias="STRIPE_SUCCESS_URL_SANDBOX"
    )
    stripe_success_url_prod: str | None = Field(
        default=None, alias="STRIPE_SUCCESS_URL_PROD"
    )
    stripe_cancel_url_sandbox: str | None = Field(
        default=None, alias="STRIPE_CANCEL_URL_SANDBOX"
    )
    stripe_cancel_url_prod: str | None = Field(
        default=None, alias="STRIPE_CANCEL_URL_PROD"
    )
    stripe_portal_return_url_sandbox: str | None = Field(
        default=None, alias="STRIPE_PORTAL_RETURN_URL_SANDBOX"
    )
    stripe_portal_return_url_prod: str | None = Field(
        default=None, alias="STRIPE_PORTAL_RETURN_URL_PROD"
    )
    stripe_portal_configuration_id_sandbox: str | None = Field(
        default=None, alias="STRIPE_PORTAL_CONFIGURATION_ID_SANDBOX"
    )
    stripe_portal_configuration_id_prod: str | None = Field(
        default=None, alias="STRIPE_PORTAL_CONFIGURATION_ID_PROD"
    )

    # Billing kill-switch（用于 Stripe 账号受限时快速关闭收款入口）
    billing_disabled: bool = Field(default=False, alias="BILLING_DISABLED")

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
    # AI 请求代理（可选，用于开发机需要代理访问 OpenRouter 的场景）
    ai_proxy_url: str | None = Field(default=None, alias="AI_PROXY_URL")

    # Dify 工作流（梦境符号批量生成）
    dify_api_key: str | None = Field(default=None, alias="DIFY_API_KEY")
    dify_api_url: str = Field(
        default="https://api.dify.ai/v1/workflows/run",
        alias="DIFY_API_URL",
    )

    # AI 模型配置（两阶段：基础分析 + 标题 + 深度洞察 + 图像生成）
    ai_model_text_analysis: str = Field(default="openai/gpt-4o", alias="AI_MODEL_TEXT_ANALYSIS")
    ai_model_title_generation: str = Field(default="google/gemini-flash-1.5", alias="AI_MODEL_TITLE_GENERATION")
    # 梦境正文 AI（意象补完 / 文学润色 / 智能续写），与标题生成独立配置
    ai_model_content_assist: str = Field(default="openai/gpt-4o", alias="AI_MODEL_CONTENT_ASSIST")
    ai_model_insight_generation: str = Field(default="openai/gpt-4o", alias="AI_MODEL_INSIGHT_GENERATION")
    # 图像生成模型必须由环境变量提供，避免代码内“默认值”掩盖部署配置。
    ai_model_image_generation: str = Field(..., alias="AI_MODEL_IMAGE_GENERATION")
    ai_model_embedding: str = Field(default="openai/text-embedding-3-large", alias="AI_MODEL_EMBEDDING")
    # AI 模型参数
    ai_embedding_dimensions: int = Field(default=1024, alias="AI_EMBEDDING_DIMENSIONS")


    # 语音转录 Provider 开关: "google" | "xfyun"
    voice_transcribe_provider: Literal["google", "xfyun"] = Field(
        default="xfyun", alias="VOICE_TRANSCRIBE_PROVIDER"
    )

    # Google Cloud 配置（语音转录）
    google_cloud_project: str | None = Field(default=None, alias="GOOGLE_CLOUD_PROJECT")
    google_cloud_credentials_json: str | None = Field(
        default=None, alias="GOOGLE_CLOUD_CREDENTIALS_JSON"
    )

    # 讯飞星火配置（实时语音转写大模型）
    xfyun_app_id: str | None = Field(default=None, alias="XFYUN_APP_ID")
    xfyun_access_key_id: str | None = Field(default=None, alias="XFYUN_ACCESS_KEY_ID")
    xfyun_access_key_secret: str | None = Field(default=None, alias="XFYUN_ACCESS_KEY_SECRET")

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

    def _select_env_value(self, sandbox_value: str | None, prod_value: str | None) -> str | None:
        if self.is_production:
            return prod_value
        return sandbox_value

    @property
    def stripe_secret_key(self) -> str | None:
        return self._select_env_value(self.stripe_secret_key_sandbox, self.stripe_secret_key_prod)

    @property
    def stripe_webhook_secret(self) -> str | None:
        return self._select_env_value(
            self.stripe_webhook_secret_sandbox, self.stripe_webhook_secret_prod
        )

    @property
    def stripe_price_pro_monthly(self) -> str | None:
        return self._select_env_value(
            self.stripe_price_pro_monthly_sandbox, self.stripe_price_pro_monthly_prod
        )

    @property
    def stripe_price_ultra_monthly(self) -> str | None:
        return self._select_env_value(
            self.stripe_price_ultra_monthly_sandbox,
            self.stripe_price_ultra_monthly_prod,
        )

    @property
    def stripe_success_url(self) -> str | None:
        return self._select_env_value(self.stripe_success_url_sandbox, self.stripe_success_url_prod)

    @property
    def stripe_cancel_url(self) -> str | None:
        return self._select_env_value(self.stripe_cancel_url_sandbox, self.stripe_cancel_url_prod)

    @property
    def stripe_portal_return_url(self) -> str | None:
        return self._select_env_value(
            self.stripe_portal_return_url_sandbox, self.stripe_portal_return_url_prod
        )

    @property
    def stripe_portal_configuration_id(self) -> str | None:
        return self._select_env_value(
            self.stripe_portal_configuration_id_sandbox,
            self.stripe_portal_configuration_id_prod,
        )


@lru_cache
def get_settings() -> Settings:
    """获取配置实例（单例模式）"""
    return Settings()


settings = get_settings()

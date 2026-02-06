"""
AI 模型统一配置
所有模型通过 OpenRouter 调用
"""

from app.core.config import settings

# OpenRouter 配置
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_API_KEY = settings.openrouter_api_key or ""

# 任务 -> 模型映射
MODELS: dict[str, str] = {
    "text_analysis": "openai/gpt-4o",
    "emotion_analysis": "google/gemini-flash-1.5",
    "symbol_extraction": "google/gemini-flash-1.5",
    "title_generation": "google/gemini-flash-1.5",
    "insight_generation": "openai/gpt-4o",
    "embedding": "openai/text-embedding-3-large",
}

# Embedding 维度
EMBEDDING_DIMENSIONS = 3072

# 默认参数
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 4096

"""
AI 模型统一配置
所有模型通过 OpenRouter 调用
两阶段分析：阶段1 基础分析 → 阶段2 深度洞察
"""

from app.core.config import settings

# OpenRouter 配置
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_API_KEY = settings.openrouter_api_key or ""

# 任务 -> 模型映射（从环境变量读取）
# 注：语音转文字使用 Google Cloud Speech-to-Text，不经过 OpenRouter
MODELS: dict[str, str] = {
    "text_analysis": settings.ai_model_text_analysis,      # 阶段1 基础分析
    "title_generation": settings.ai_model_title_generation,
    "insight_generation": settings.ai_model_insight_generation,  # 阶段2 深度洞察
    "image_generation": settings.ai_model_image_generation,       # 梦境图像生成
    "embedding": settings.ai_model_embedding,
    "content_assist": settings.ai_model_content_assist,
}

# Embedding 维度
EMBEDDING_DIMENSIONS = settings.ai_embedding_dimensions

# ========== 两阶段温度与 Token 配置 ==========

# 标题生成（高温 = 诗意、人性化）
TEMPERATURE_TITLE = 0.8
MAX_TOKENS_TITLE = 100  # 20字标题 ≈ 40-60 tokens，留足 JSON 格式余量

# 阶段1 基础分析（低温 = 精确、无幻觉）
TEMPERATURE_BASIC = 0.25
MAX_TOKENS_BASIC = 3072  # 估算输出 1500-2000 tokens（含 JSON 结构）

# 阶段2 深度洞察（中高温 = 温暖、共情）
TEMPERATURE_INSIGHT = 0.7
MAX_TOKENS_INSIGHT = 4096  # 估算输出 1800-2200 tokens（含 JSON 结构）

# 梦境正文辅助（续写/润色/扩写/缩写/深度）
TEMPERATURE_CONTENT_ASSIST_DEFAULT = 0.65
MAX_TOKENS_CONTENT_ASSIST = 2200

"""
AI 分析服务
统一通过 OpenRouter 调用多种 AI 模型
"""

import json
import logging

import openai

from app.config.ai_models import (
    DEFAULT_MAX_TOKENS,
    DEFAULT_TEMPERATURE,
    MODELS,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
)
from app.prompts.dream_analysis import (
    EMOTION_ANALYSIS_PROMPT,
    INSIGHT_PROMPT,
    STRUCTURE_PROMPT,
    TITLE_GENERATION_PROMPT,
)

logger = logging.getLogger(__name__)


class AIService:
    """统一 AI 分析服务，支持多模型"""

    def __init__(self) -> None:
        if not OPENROUTER_API_KEY:
            logger.warning("OPENROUTER_API_KEY 未配置, AI 服务将不可用")
        self.client = openai.AsyncOpenAI(
            base_url=OPENROUTER_BASE_URL,
            api_key=OPENROUTER_API_KEY,
        )

    async def _chat(
        self,
        model_key: str,
        messages: list[dict[str, str]],
        *,
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        json_mode: bool = False,
    ) -> str:
        """通用聊天调用"""
        kwargs: dict = {
            "model": MODELS[model_key],
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = await self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    async def _parse_json(self, text: str) -> dict:
        """安全解析 JSON"""
        # 去除可能的 markdown 代码块标记
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            logger.error(f"JSON 解析失败: {cleaned[:200]}")
            return {}

    # ========== 公开方法 ==========

    async def generate_title(self, content: str) -> str:
        """生成梦境标题"""
        prompt = TITLE_GENERATION_PROMPT.format(content=content[:500])
        result = await self._chat(
            "title_generation",
            [{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=50,
        )
        # 清理结果: 去掉引号和多余空白
        title = result.strip().strip('"\'《》「」')
        return title[:20] if title else "无题之梦"

    async def analyze_structure(self, content: str) -> dict:
        """结构化梦境内容"""
        prompt = STRUCTURE_PROMPT.format(content=content)
        result = await self._chat(
            "text_analysis",
            [{"role": "user", "content": prompt}],
            json_mode=True,
        )
        return await self._parse_json(result)

    async def analyze_emotions(self, content: str) -> dict:
        """情绪分析"""
        prompt = EMOTION_ANALYSIS_PROMPT.format(content=content)
        result = await self._chat(
            "emotion_analysis",
            [{"role": "user", "content": prompt}],
            json_mode=True,
        )
        return await self._parse_json(result)

    async def generate_insight(
        self,
        content: str,
        sleep_quality: int | None = None,
        lucidity_level: int | None = None,
        primary_emotion: str | None = None,
        life_context: str | None = None,
    ) -> dict:
        """生成深度洞察"""
        prompt = INSIGHT_PROMPT.format(
            content=content,
            sleep_quality=sleep_quality or "未知",
            lucidity_level=lucidity_level or "未知",
            primary_emotion=primary_emotion or "未知",
            life_context=life_context or "未提供",
        )
        result = await self._chat(
            "insight_generation",
            [{"role": "user", "content": prompt}],
            json_mode=True,
        )
        return await self._parse_json(result)


# 单例
ai_service = AIService()

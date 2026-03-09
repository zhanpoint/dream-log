"""
AI 分析服务
基于 LangChain LCEL，统一通过 OpenRouter 调用多种 AI 模型
"""

import asyncio
import base64
import logging
import os
from pathlib import Path
from uuid import UUID

import httpx

# 在首次使用 OpenAIEmbeddings 前设置 tiktoken 缓存目录，避免每次请求去拉取
# openaipublic.blob.core.windows.net（国内/受限网络易 SSL 超时）
if "TIKTOKEN_CACHE_DIR" not in os.environ:
    _cache_dir = Path(__file__).resolve().parent.parent.parent / ".tiktoken_cache"
    _cache_dir.mkdir(parents=True, exist_ok=True)
    os.environ["TIKTOKEN_CACHE_DIR"] = str(_cache_dir)

from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.config.ai_models import (
    EMBEDDING_DIMENSIONS,
    MAX_TOKENS_BASIC,
    MAX_TOKENS_INSIGHT,
    MAX_TOKENS_TITLE,
    MODELS,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    TEMPERATURE_BASIC,
    TEMPERATURE_INSIGHT,
    TEMPERATURE_TITLE,
)
from app.prompts.dream_analysis import (
    BASIC_ANALYSIS_PROMPT,
    IMAGE_GENERATION_PROMPT,
    INSIGHT_PROMPT,
    TITLE_GENERATION_PROMPT,
)

logger = logging.getLogger(__name__)


def get_target_language_from_locale(locale: str | None) -> str:
    """
    将前端传来的语言代码/首选语言映射为提示词中使用的 {target_language} 描述。

    约定：
    - zh-CN / zh 开头: 中文
    - en / en-*       : English
    - ja / ja-*       : 日语
    其它情况默认中文，保证提示词始终可用。
    """
    if not locale:
        return "中文"
    v = locale.strip().lower()
    if v.startswith("en"):
        return "English"
    if v.startswith("ja"):
        return "日语"
    if v.startswith("zh"):
        return "中文"
    return "中文"


def _create_llm(
    model_key: str,
    *,
    temperature: float,
    max_tokens: int,
) -> ChatOpenAI:
    """创建指定任务的 ChatOpenAI 实例（多阶段认知管道）"""
    return ChatOpenAI(
        model=MODELS[model_key],
        base_url=OPENROUTER_BASE_URL,
        api_key=OPENROUTER_API_KEY,
        temperature=temperature,
        max_tokens=max_tokens,
    )


# ========== LCEL 多阶段认知管道 ==========

# 标题生成链: 高温 = 诗意、人性化（仅用 content）
_title_chain = (
    ChatPromptTemplate.from_messages([("human", TITLE_GENERATION_PROMPT)])
    | _create_llm("title_generation", temperature=TEMPERATURE_TITLE, max_tokens=MAX_TOKENS_TITLE)
    | StrOutputParser()
)

# 阶段1 基础分析链: 低温 = 精确、无幻觉（合并 structure + emotion + trigger + sleep）
_basic_analysis_chain = (
    ChatPromptTemplate.from_messages([("human", BASIC_ANALYSIS_PROMPT)])
    | _create_llm("text_analysis", temperature=TEMPERATURE_BASIC, max_tokens=MAX_TOKENS_BASIC).bind(
        response_format={"type": "json_object"}
    )
    | JsonOutputParser()
)

# 阶段2 深度洞察链: 中高温 = 温暖、共情（依赖阶段1结果）
_insight_chain = (
    ChatPromptTemplate.from_messages([("human", INSIGHT_PROMPT)])
    | _create_llm("insight_generation", temperature=TEMPERATURE_INSIGHT, max_tokens=MAX_TOKENS_INSIGHT).bind(
        response_format={"type": "json_object"}
    )
    | JsonOutputParser()
)


class AIService:
    """统一 AI 分析服务 - 多阶段认知管道"""

    def __init__(self) -> None:
        if not OPENROUTER_API_KEY:
            logger.warning("OPENROUTER_API_KEY 未配置, AI 服务将不可用")

    # ========== 公开方法 ==========

    async def generate_title(self, content: str, *, target_language: str) -> str:
        """生成梦境标题（仅使用梦境内容，20字限制在 prompt 中）"""
        result = await _title_chain.ainvoke(
            {"content": content, "target_language": target_language}
        )
        title = result.strip().strip('"\'《》「」')
        return title if title else "无题之梦"

    async def analyze_basic(self, dream_context: str, *, target_language: str) -> dict:
        """阶段1：基础分析（合并 snapshot + 情绪 + 触发因素 + 睡眠），低温精确。"""
        return await _basic_analysis_chain.ainvoke(
            {"dream_context": dream_context, "target_language": target_language}
        )

    def _format_triggers_for_insight(self, triggers: list) -> str:
        """将 triggers 列表格式化为供 INSIGHT 使用的可读文本。"""
        if not triggers:
            return "无"
        lines = [
            f"{i+1}. {t.get('name', '')}（置信度{t.get('confidence', '')}）：{t.get('reasoning', '')}"
            for i, t in enumerate(triggers)
        ]
        return "\n".join(lines)

    async def generate_insight(
        self,
        dream_context: str,
        basic_analysis: dict,
        *,
        target_language: str,
    ) -> dict:
        """阶段2：生成深度洞察（依赖阶段1结果），中高温共情。"""
        basic = basic_analysis or {}
        triggers_text = self._format_triggers_for_insight(basic.get("triggers") or [])
        return await _insight_chain.ainvoke(
            {
                "dream_context": dream_context,
                "snapshot": basic.get("snapshot") or "无",
                "emotional_summary": basic.get("emotional_summary") or "无",
                "emotion_interpretation": basic.get("emotion_interpretation") or "无",
                "triggers": triggers_text,
                "sleep_analysis_text": basic.get("sleep_analysis_text") or "无",
                "target_language": target_language,
            }
        )

    async def generate_dream_image(
        self,
        dream_content: str,
        dream_title: str | None = None,
        user_id: str | UUID | None = None,
        dream_id: str | UUID | None = None,
    ) -> str:
        """使用配置的图像生成模型，根据梦境内容生成一张梦境图像。"""
        if not OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY 未配置")

        title_section = f"Dream title: {dream_title}\n\n" if dream_title else ""
        base_prompt = IMAGE_GENERATION_PROMPT.format(
            title_section=title_section,
            dream_content=dream_content,
        )

        image_bytes: bytes | None = None
        mime_type = "image/png"
        last_response: dict | None = None

        # 重试应对模型偶发只返回文本不返回图像的问题
        for attempt in range(1, 4):
            prompt = (
                f"{base_prompt}\n\n"
                "IMPORTANT: Return an image output in this response. "
                "Do not return text-only answer."
            )
            image_bytes, mime_type, last_response = await self._generate_image_once(prompt)
            if image_bytes is not None:
                break

            logger.warning("第 %s 次图像生成未返回图像，准备重试", attempt)
            await asyncio.sleep(1.2 * attempt)

        if image_bytes is None:
            logger.error(f"图像生成响应完整内容: {last_response}")
            raise RuntimeError("图像生成失败：模型未返回可用图像，请稍后重试")

        # 上传至阿里云 OSS（public bucket）
        if user_id and dream_id:
            try:
                from app.services.oss_service import get_oss_service

                oss = get_oss_service()
                uploaded = await oss.upload_public_ai_image(
                    dream_id=dream_id,
                    content=image_bytes,
                    content_type=mime_type,
                )
                url = await oss.get_public_access_url(uploaded.object_key)
                logger.info(f"AI 图像已上传至 OSS: {uploaded.object_key}")
                return url
            except Exception as oss_err:
                logger.warning(f"OSS 上传失败，降级返回 base64: {oss_err}")

        # 降级：返回 base64 data URI
        b64 = base64.b64encode(image_bytes).decode()
        return f"data:{mime_type};base64,{b64}"

    async def _generate_image_once(self, prompt: str) -> tuple[bytes | None, str, dict | None]:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODELS["image_generation"],
                    "messages": [{"role": "user", "content": prompt}],
                    "modalities": ["image", "text"],
                    "image_config": {"aspect_ratio": "16:9"},
                },
            )

        if response.status_code != 200:
            logger.error(f"图像生成 API 错误: {response.status_code} - {response.text}")
            raise RuntimeError(f"图像生成失败: HTTP {response.status_code}, {response.text[:300]}")

        data = response.json()
        logger.debug(f"图像生成响应结构: {list(data.keys())}")

        choices = data.get("choices", [])
        if not choices:
            return None, "image/png", data

        message = choices[0].get("message", {})
        image_bytes, mime_type = self._extract_image_from_message(message)
        return image_bytes, mime_type, data

    def _extract_image_from_message(self, message: dict) -> tuple[bytes | None, str]:
        """从 OpenRouter 响应消息中提取图像 bytes 和 MIME 类型。

        OpenRouter 图像生成规范响应格式：图像在 message.images 数组中。
        兼容旧格式：content 为列表时图像可能嵌入在 content[].image_url 中。
        """
        # 标准格式：message.images[]
        images = message.get("images", [])
        if images:
            return self._url_to_bytes(images[0].get("image_url", {}))

        # 兼容格式：message.content 为列表
        content = message.get("content", "")
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and part.get("type") == "image_url":
                    img_bytes, mime = self._url_to_bytes(part.get("image_url", {}))
                    if img_bytes:
                        return img_bytes, mime

        return None, "image/png"

    def _url_to_bytes(self, image_url_obj: dict | str) -> tuple[bytes | None, str]:
        """将 image_url 对象（或 data URI 字符串）转换为 bytes + mime type。"""
        url = image_url_obj.get("url", "") if isinstance(image_url_obj, dict) else str(image_url_obj)
        if not url:
            return None, "image/png"

        if url.startswith("data:"):
            # data:image/png;base64,<data>
            try:
                header, b64_data = url.split(",", 1)
                mime_type = header.split(";")[0].replace("data:", "") or "image/png"
                return base64.b64decode(b64_data), mime_type
            except Exception:
                return None, "image/png"

        return None, "image/png"

    async def generate_embedding(self, text: str) -> list[float]:
        """生成文本的 embedding 向量（用于相似度搜索）"""
        try:
            embeddings = OpenAIEmbeddings(
                model=MODELS["embedding"],
                openai_api_base=OPENROUTER_BASE_URL,
                openai_api_key=OPENROUTER_API_KEY,
                dimensions=EMBEDDING_DIMENSIONS,
            )
            result = await embeddings.aembed_query(text)
            return result
        except Exception as e:
            logger.error(f"生成 embedding 失败: {e}")
            raise


# 单例
ai_service = AIService()

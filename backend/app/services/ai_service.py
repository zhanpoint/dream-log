"""
AI 分析服务
基于 LangChain LCEL，统一通过 OpenRouter 调用多种 AI 模型
"""

import asyncio
import base64
import logging
import os
from pathlib import Path
from typing import AsyncIterator, Awaitable, Callable
from uuid import UUID

import httpx
from langchain_core.messages import AIMessageChunk

# 在首次使用 OpenAIEmbeddings 前设置 tiktoken 缓存目录，避免每次请求去拉取
# openaipublic.blob.core.windows.net（国内/受限网络易 SSL 超时）
if "TIKTOKEN_CACHE_DIR" not in os.environ:
    _cache_dir = Path(__file__).resolve().parent.parent.parent / ".tiktoken_cache"
    _cache_dir.mkdir(parents=True, exist_ok=True)
    os.environ["TIKTOKEN_CACHE_DIR"] = str(_cache_dir)

from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import OpenAIEmbeddings
from langchain_openrouter import ChatOpenRouter

from app.config.ai_models import (
    EMBEDDING_DIMENSIONS,
    MAX_TOKENS_BASIC,
    MAX_TOKENS_CONTENT_ASSIST,
    MAX_TOKENS_INSIGHT,
    MAX_TOKENS_TITLE,
    MODELS,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    TEMPERATURE_BASIC,
    TEMPERATURE_CONTENT_ASSIST_DEFAULT,
    TEMPERATURE_INSIGHT,
    TEMPERATURE_TITLE,
)
from app.core.config import settings
from app.prompts.dream_analysis import (
    BASIC_ANALYSIS_PROMPT,
    IMAGE_GENERATION_PROMPT,
    INSIGHT_PROMPT,
    TITLE_GENERATION_PROMPT,
)
from app.prompts.dream_content_assist import (
    DREAM_CONTENT_ASSIST_PROMPT,
    OPTIMIZE_INSTRUCTION_PROMPT,
    get_content_assist_task_detail,
)
from app.services.openrouter_sdk import get_openrouter_sdk_client

logger = logging.getLogger(__name__)


def get_target_language_from_locale(locale: str | None) -> str:
    """
    将前端传来的语言代码/首选语言映射为提示词中使用的 {target_language} 描述。

    约定：
    - cn / zh 开头: 中文
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


def _get_proxy_url() -> str | None:
    """获取 AI 请求代理地址（仅使用 AI_PROXY_URL）。"""
    return settings.ai_proxy_url


def _create_llm(
    model_key: str,
    *,
    temperature: float,
    max_tokens: int,
    streaming: bool = False,
) -> ChatOpenRouter:
    """创建指定任务的 ChatOpenRouter 实例（多阶段认知管道）"""
    return ChatOpenRouter(
        model=MODELS[model_key],
        api_key=OPENROUTER_API_KEY,
        client=get_openrouter_sdk_client(max_retries=2),
        temperature=temperature,
        max_tokens=max_tokens,
        streaming=streaming,
        max_retries=2,
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
        logger.info("AI_PROXY_URL configured: %s", bool(settings.ai_proxy_url))

    def _content_assist_temperature(self, action: str) -> float:
        return {
            "imagery_completion": 0.74,
            "literary_polish": 0.62,
            "smart_continue": 0.72,
        }.get(action, TEMPERATURE_CONTENT_ASSIST_DEFAULT)

    def _log_proxy_usage(self, action: str) -> None:
        logger.info("AI proxy usage (%s): %s", action, bool(_get_proxy_url()))

    # ========== 公开方法 ==========

    async def generate_title(self, content: str, *, target_language: str) -> str:
        """生成梦境标题（仅使用梦境内容，20字限制在 prompt 中）"""
        self._log_proxy_usage("generate_title")
        result = await _title_chain.ainvoke(
            {"content": content, "target_language": target_language}
        )
        title = result.strip().strip('"\'《》「」')
        return title if title else "无题之梦"

    def _build_content_assist_chain(self, picked_action: str):
        temp = self._content_assist_temperature(picked_action)
        return (
            ChatPromptTemplate.from_messages([("human", DREAM_CONTENT_ASSIST_PROMPT)])
            | _create_llm(
                "content_assist",
                temperature=temp,
                max_tokens=MAX_TOKENS_CONTENT_ASSIST,
            )
            | StrOutputParser()
        )

    async def assist_dream_content(
        self,
        content: str,
        action: str | None,
        *,
        target_language: str,
        instruction: str,
    ) -> str:
        """梦境正文：意象补完 / 文学润色 / 智能续写。"""
        self._log_proxy_usage("assist_dream_content")
        picked_action = self._pick_content_assist_action(content, instruction, action)
        task_detail = get_content_assist_task_detail(picked_action)
        if action is None:
            task_detail = f"（未选择模式，已自动判定）{task_detail}"
        chain = self._build_content_assist_chain(picked_action)
        text = await chain.ainvoke(
            {
                "content": content if content is not None else "",
                "target_language": target_language,
                "task_detail": task_detail,
                "instruction": instruction.strip(),
            }
        )
        out = text.strip()
        return out if out else (content or "")

    def assist_dream_content_stream(
        self,
        content: str,
        action: str | None,
        *,
        target_language: str,
        instruction: str,
    ) -> tuple[str, AsyncIterator[str]]:
        """流式返回梦境正文增量文本。"""
        self._log_proxy_usage("assist_dream_content_stream")
        picked_action = self._pick_content_assist_action(content, instruction, action)
        task_detail = get_content_assist_task_detail(picked_action)
        if action is None:
            task_detail = f"（未选择模式，已自动判定）{task_detail}"
        temp = self._content_assist_temperature(picked_action)
        chain = (
            ChatPromptTemplate.from_messages([("human", DREAM_CONTENT_ASSIST_PROMPT)])
            | _create_llm(
                "content_assist",
                temperature=temp,
                max_tokens=MAX_TOKENS_CONTENT_ASSIST,
            )
        )
        payload = {
            "content": content if content is not None else "",
            "target_language": target_language,
            "task_detail": task_detail,
            "instruction": instruction.strip(),
        }

        async def _gen() -> AsyncIterator[str]:
            async for chunk in chain.astream(payload):
                # Best practice: 流式路径直接消费 AIMessageChunk，避免 parser 层聚合导致“看似无增量”。
                piece = ""
                if isinstance(chunk, AIMessageChunk):
                    piece = chunk.text or ""
                elif isinstance(chunk, str):
                    piece = chunk
                if piece:
                    yield piece

        return picked_action, _gen()

    def _pick_content_assist_action(
        self, content: str, instruction: str, action: str | None
    ) -> str:
        """
        当用户未选择模式（action 为 None）时，做一个温和的自动判定。
        规则目标：不强行锁定风格，只在“续写意图明显/文本长度足够”时选择对应模式。
        """
        if action in ("imagery_completion", "literary_polish", "smart_continue"):
            return action
        ins = (instruction or "").strip()
        txt = (content or "").strip()
        if ins:
            lower = ins.lower()
            if any(k in ins for k in ("续写", "接着", "继续", "后续", "然后", "往后")) or any(
                k in lower for k in ("continue", "next", "keep going")
            ):
                return "smart_continue" if len(txt) >= 5 else "imagery_completion"
        return "literary_polish" if len(txt) >= 80 else "imagery_completion"

    async def optimize_instruction(self, text: str, *, target_language: str) -> str:
        """润色补充说明短文本，便于后续梦境正文 AI 理解。"""
        self._log_proxy_usage("optimize_instruction")
        chain = (
            ChatPromptTemplate.from_messages([("human", OPTIMIZE_INSTRUCTION_PROMPT)])
            | _create_llm("content_assist", temperature=0.35, max_tokens=400)
            | StrOutputParser()
        )
        out = await chain.ainvoke({"text": text.strip(), "target_language": target_language})
        result = out.strip()
        return result if result else text.strip()

    async def analyze_basic(self, dream_context: str, *, target_language: str) -> dict:
        """阶段1：基础分析（合并 snapshot + 情绪 + 触发因素 + 睡眠），低温精确。"""
        self._log_proxy_usage("analyze_basic")
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
        self._log_proxy_usage("generate_insight")
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
        *,
        cancelled: Callable[[], Awaitable[bool]] | None = None,
    ) -> str:
        """使用配置的图像生成模型，根据梦境内容生成一张梦境图像。"""
        if not OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY 未配置")
        self._log_proxy_usage("generate_dream_image")

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
            if cancelled and await cancelled():
                raise RuntimeError("图像生成已取消")
            prompt = (
                f"{base_prompt}\n\n"
                "IMPORTANT: Return an image output in this response. "
                "Do not return text-only answer."
            )
            image_bytes, mime_type, last_response = await self._generate_image_once(
                prompt,
                cancelled=cancelled,
            )
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

    async def _generate_image_once(
        self,
        prompt: str,
        *,
        cancelled: Callable[[], Awaitable[bool]] | None = None,
    ) -> tuple[bytes | None, str, dict | None]:
        # 不读取 HTTP(S)_PROXY 等环境变量，避免容器误走代理导致连接异常
        proxy_url = _get_proxy_url()
        client_kwargs: dict = {"timeout": 120.0, "trust_env": False}
        if proxy_url:
            client_kwargs["proxy"] = proxy_url

        async with httpx.AsyncClient(**client_kwargs) as client:
            req_task = asyncio.create_task(
                client.post(
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
            )

            cancel_task: asyncio.Task[None] | None = None
            if cancelled:
                async def _wait_cancel() -> None:
                    # 轻量轮询：取消按钮点击后应尽快响应
                    while True:
                        if await cancelled():
                            return
                        await asyncio.sleep(0.35)
                cancel_task = asyncio.create_task(_wait_cancel())

            done, _pending = await asyncio.wait(
                {req_task, cancel_task} if cancel_task else {req_task},
                return_when=asyncio.FIRST_COMPLETED,
            )

            if cancel_task and cancel_task in done and cancelled and await cancelled():
                req_task.cancel()
                try:
                    await req_task
                except BaseException:
                    pass
                raise RuntimeError("图像生成已取消")

            if cancel_task:
                cancel_task.cancel()
                try:
                    await cancel_task
                except BaseException:
                    pass

            response = await req_task

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
            self._log_proxy_usage("generate_embedding")
            proxy_url = _get_proxy_url()
            http_async_client = None
            if proxy_url:
                http_async_client = httpx.AsyncClient(
                    proxy=proxy_url,
                    timeout=120.0,
                    trust_env=False,
                    follow_redirects=True,
                )

            embeddings = OpenAIEmbeddings(
                model=MODELS["embedding"],
                openai_api_base=OPENROUTER_BASE_URL,
                openai_api_key=OPENROUTER_API_KEY,
                dimensions=EMBEDDING_DIMENSIONS,
                http_async_client=http_async_client,
            )
            try:
                return await embeddings.aembed_query(text)
            finally:
                if http_async_client is not None:
                    await http_async_client.aclose()
        except Exception as e:
            logger.error(f"生成 embedding 失败: {e}")
            raise


# 单例
ai_service = AIService()

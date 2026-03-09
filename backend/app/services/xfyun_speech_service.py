"""
讯飞星火实时语音转写大模型服务
基于 WebSocket 协议，接收 PCM 16kHz 16bit 音频流，实时返回转录文本
文档: https://www.xfyun.cn/doc/spark/asr_llm/rtasr_llm.html
"""

import asyncio
import base64
import datetime
import hashlib
import hmac
import json
import logging
import urllib.parse
import uuid
from collections.abc import AsyncIterator

import websockets

from app.core.config import settings

logger = logging.getLogger(__name__)

# 讯飞 API 常量
XFYUN_WS_URL = "wss://office-api-ast-dx.iflyaisol.com/ast/communicate/v1"
AUDIO_FRAME_SIZE = 1280  # 每帧 1280 字节（16kHz 16bit 40ms）
FRAME_INTERVAL = 0.04     # 40ms


def _generate_xfyun_url() -> str:
    """生成讯飞鉴权 WebSocket URL"""
    app_id = (settings.xfyun_app_id or "").strip()
    access_key_id = (settings.xfyun_access_key_id or "").strip()
    access_key_secret = (settings.xfyun_access_key_secret or "").strip()

    if not app_id or not access_key_id or not access_key_secret:
        raise RuntimeError(
            "讯飞鉴权参数缺失：请配置 XFYUN_APP_ID / XFYUN_ACCESS_KEY_ID / "
            "XFYUN_ACCESS_KEY_SECRET（accessKeyId 对应控制台的 APIKey）"
        )

    # UTC 时间（北京时区）
    beijing_tz = datetime.timezone(datetime.timedelta(hours=8))
    utc_str = datetime.datetime.now(beijing_tz).strftime("%Y-%m-%dT%H:%M:%S%z")

    params = {
        "accessKeyId": access_key_id,
        "appId": app_id,
        "audio_encode": "pcm_s16le",
        "lang": "autodialect",
        "samplerate": "16000",
        "utc": utc_str,
        "uuid": uuid.uuid4().hex,
    }

    # 按字典序排序拼接 baseString
    sorted_items = sorted(params.items())
    base_str = "&".join(
        f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}"
        for k, v in sorted_items
    )

    # HMAC-SHA1 签名
    signature = hmac.new(
        access_key_secret.encode(), base_str.encode(), hashlib.sha1
    ).digest()
    params["signature"] = base64.b64encode(signature).decode()

    return f"{XFYUN_WS_URL}?{urllib.parse.urlencode(params)}"


def _parse_xfyun_result(msg: dict) -> str | None:
    """
    从讯飞返回的 JSON 中提取转录文本
    
    仅返回确定性结果（type=0），忽略中间结果（type=1）
    """
    if msg.get("msg_type") != "result" or msg.get("res_type") != "asr":
        return None

    data = msg.get("data", {})
    cn = data.get("cn", {})
    st = cn.get("st", {})
    
    # 只返回确定性结果（type="0"），忽略中间结果（type="1"）
    if st.get("type") != "0":
        return None
    
    rt_list = st.get("rt", [])

    # 拼接所有词
    words: list[str] = []
    for rt in rt_list:
        for ws in rt.get("ws", []):
            for cw in ws.get("cw", []):
                w = cw.get("w", "")
                wp = cw.get("wp", "n")
                # n=普通词, s=顺滑词, p=标点, g=分段标识
                if wp in ("n", "p"):
                    words.append(w)

    text = "".join(words).strip()
    return text if text else None


class XfyunSpeechService:
    """讯飞星火实时语音转写"""

    def __init__(self) -> None:
        if not settings.xfyun_app_id:
            logger.warning("XFYUN_APP_ID 未配置，讯飞语音转录将不可用")

    async def streaming_transcribe(
        self,
        audio_stream: AsyncIterator[bytes],
        *,
        language_code: str = "zh-CN",
        sample_rate: int = 16000,
    ) -> AsyncIterator[str]:
        """
        流式转录音频

        Args:
            audio_stream: 异步音频数据流（16-bit PCM 16kHz）
            language_code: 语言代码（讯飞自动识别，此参数保持接口一致）
            sample_rate: 采样率

        Yields:
            转录文本片段（仅返回确定性结果）
        """
        url = _generate_xfyun_url()
        logger.info("连接讯飞实时转写服务...")

        try:
            ws_ctx = websockets.connect(
                url,
                ping_interval=20,
                ping_timeout=10,
                open_timeout=30,  # 延长握手超时，缓解网络延迟/跨境访问
            )
        except Exception as e:
            raise RuntimeError(f"讯飞连接初始化失败: {e}") from e

        try:
            async with ws_ctx as ws:
                logger.info("讯飞 WebSocket 已连接")

                # 用于存储 session_id
                session_id: str | None = None

                # 接收结果的任务
                result_queue: asyncio.Queue[str | None] = asyncio.Queue()

                async def receive_results() -> None:
                    nonlocal session_id
                    try:
                        async for message in ws:
                            if isinstance(message, str):
                                try:
                                    msg = json.loads(message)

                                    # 握手成功，提取 sessionId (msg_type="started")
                                    if msg.get("msg_type") == "started":
                                        session_id = msg.get("sid")
                                        logger.info("讯飞握手成功，sessionId: %s", session_id)

                                    # 提取转录文本（仅确定性结果 type=0）
                                    text = _parse_xfyun_result(msg)
                                    if text:
                                        await result_queue.put(text)

                                    # 检查错误
                                    if msg.get("msg_type") == "error":
                                        error_msg = msg.get("message", "未知错误")
                                        logger.error("讯飞转录错误: %s", error_msg)

                                except json.JSONDecodeError:
                                    pass
                    except websockets.exceptions.ConnectionClosed:
                        logger.info("讯飞 WebSocket 连接已关闭")
                    finally:
                        await result_queue.put(None)

                # 发送音频的任务
                async def send_audio() -> None:
                    try:
                        buffer = bytearray()
                        async for chunk in audio_stream:
                            buffer.extend(chunk)

                            # 按讯飞要求每 1280 字节一帧发送
                            while len(buffer) >= AUDIO_FRAME_SIZE:
                                frame = bytes(buffer[:AUDIO_FRAME_SIZE])
                                await ws.send(frame)
                                buffer = buffer[AUDIO_FRAME_SIZE:]
                                await asyncio.sleep(FRAME_INTERVAL)

                        # 发送剩余不足一帧的数据
                        if buffer:
                            await ws.send(bytes(buffer))

                        # 发送结束标记（必须包含 sessionId）
                        end_msg = {"end": True}
                        if session_id:
                            end_msg["sessionId"] = session_id
                            logger.info("发送结束标记，sessionId: %s", session_id)
                        else:
                            logger.warning("发送结束标记，但 sessionId 未获取")
                        await ws.send(json.dumps(end_msg, ensure_ascii=False))
                        logger.info("讯飞音频发送完成")
                    except websockets.exceptions.ConnectionClosed:
                        logger.info("讯飞连接已关闭，停止发送")

                # 并发运行发送和接收
                recv_task = asyncio.create_task(receive_results())
                send_task = asyncio.create_task(send_audio())

                try:
                    # 逐条 yield 转录结果
                    while True:
                        text = await result_queue.get()
                        if text is None:
                            break
                        yield text
                finally:
                    send_task.cancel()
                    recv_task.cancel()
                    try:
                        await send_task
                    except (asyncio.CancelledError, Exception):
                        pass
                    try:
                        await recv_task
                    except (asyncio.CancelledError, Exception):
                        pass
        except TimeoutError as e:
            raise RuntimeError(
                "讯飞语音服务连接超时。请检查网络连接或稍后重试；"
                "若在海外环境，讯飞 API 可能无法访问。"
            ) from e
        except websockets.exceptions.InvalidMessage as e:
            message = str(e)
            if "35010" in message:
                raise RuntimeError(
                    "讯飞鉴权失败：accessKeyId 不存在，请确认 "
                    "XFYUN_ACCESS_KEY_ID=控制台 APIKey"
                ) from e
            raise RuntimeError(f"讯飞握手失败: {message}") from e

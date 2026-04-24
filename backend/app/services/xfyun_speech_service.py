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


def _is_started_message(msg: dict) -> bool:
    """官方文档中握手成功可能返回 action=started 或 msg_type=started。"""
    return msg.get("action") == "started" or msg.get("msg_type") == "started"


def _extract_session_id(msg: dict) -> str | None:
    """兼容 sid / sessionId 两种字段名。"""
    sid = msg.get("sid") or msg.get("sessionId")
    return sid if isinstance(sid, str) and sid else None


def _extract_error_message(msg: dict) -> str | None:
    """兼容官方文档中的多种错误载荷格式。"""
    if msg.get("action") == "error" or msg.get("msg_type") == "error":
        return str(msg.get("desc") or msg.get("message") or "未知错误")

    if msg.get("msg_type") == "result" and msg.get("res_type") == "frc":
        data = msg.get("data")
        if isinstance(data, dict):
            return str(data.get("desc") or "功能异常")

    code = str(msg.get("code") or "")
    if code and code != "0":
        return str(msg.get("desc") or msg.get("message") or f"错误码 {code}")

    return None


class XfyunSpeechService:
    """讯飞星火实时语音转写"""

    def __init__(self) -> None:
        if not settings.xfyun_app_id:
            logger.warning("XFYUN_APP_ID 未配置，讯飞语音转录将不可用")

    async def streaming_transcribe(
        self,
        audio_stream: AsyncIterator[bytes],
        *,
        language_code: str = "cn",
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

                session_id: str | None = None
                session_started = asyncio.Event()
                service_error: Exception | None = None
                result_queue: asyncio.Queue[str | None] = asyncio.Queue()
                sent_audio = False

                async def close_ws() -> None:
                    try:
                        await ws.close()
                    except Exception:
                        pass

                async def receive_results() -> None:
                    nonlocal session_id, service_error
                    try:
                        async for message in ws:
                            if isinstance(message, str):
                                try:
                                    msg = json.loads(message)

                                    if _is_started_message(msg):
                                        session_id = _extract_session_id(msg)
                                        logger.info("讯飞握手成功，sessionId: %s", session_id)
                                        session_started.set()
                                        continue

                                    error_msg = _extract_error_message(msg)
                                    if error_msg:
                                        service_error = RuntimeError(f"讯飞转录错误: {error_msg}")
                                        logger.error("讯飞转录错误: %s", error_msg)
                                        await close_ws()
                                        break

                                    text = _parse_xfyun_result(msg)
                                    if text:
                                        await result_queue.put(text)
                                except json.JSONDecodeError:
                                    pass
                    except websockets.exceptions.ConnectionClosed:
                        logger.info("讯飞 WebSocket 连接已关闭")
                    finally:
                        session_started.set()
                        await result_queue.put(None)

                async def send_audio() -> None:
                    nonlocal service_error, sent_audio
                    try:
                        buffer = bytearray()
                        async for chunk in audio_stream:
                            buffer.extend(chunk)

                            while len(buffer) >= AUDIO_FRAME_SIZE:
                                frame = bytes(buffer[:AUDIO_FRAME_SIZE])
                                await ws.send(frame)
                                sent_audio = True
                                buffer = buffer[AUDIO_FRAME_SIZE:]
                                await asyncio.sleep(FRAME_INTERVAL)

                        if buffer:
                            await ws.send(bytes(buffer))
                            sent_audio = True

                        if not sent_audio:
                            logger.info("未发送任何音频帧，直接结束讯飞会话")
                            await close_ws()
                            return

                        await asyncio.wait_for(session_started.wait(), timeout=5)
                        if service_error is not None:
                            raise service_error
                        if not session_id:
                            raise RuntimeError("讯飞未返回 started/sid，无法正常结束会话")

                        end_msg = {"end": True, "sessionId": session_id}
                        logger.info("发送结束标记，sessionId: %s", session_id)
                        await ws.send(json.dumps(end_msg, ensure_ascii=False))
                        logger.info("讯飞音频发送完成")
                    except websockets.exceptions.ConnectionClosed:
                        logger.info("讯飞连接已关闭，停止发送")
                    except TimeoutError as e:
                        service_error = RuntimeError("讯飞会话建立超时，未收到 started/sessionId")
                        logger.error("讯飞会话建立超时", exc_info=True)
                        await close_ws()
                        raise service_error from e
                    except Exception as e:
                        service_error = e
                        await close_ws()
                        raise

                recv_task = asyncio.create_task(receive_results())
                send_task = asyncio.create_task(send_audio())

                try:
                    while True:
                        text = await result_queue.get()
                        if text is None:
                            break
                        yield text
                    if service_error is not None:
                        raise service_error
                    await send_task
                finally:
                    if not send_task.done():
                        send_task.cancel()
                    if not recv_task.done():
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

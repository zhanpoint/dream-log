"""
实时语音转录 WebSocket 端点
支持 Google Cloud Speech-to-Text / 讯飞星火实时语音转写
通过 VOICE_TRANSCRIBE_PROVIDER 环境变量切换
"""

import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.speech_service import speech_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/voice/transcribe")
async def transcribe_voice_stream(websocket: WebSocket) -> None:
    """
    实时语音转录 WebSocket

    前端发送: 16-bit PCM 音频二进制数据（16kHz mono）
    前端发送: {"type": "stop"} 停止转录
    后端返回: {"type": "transcription", "text": "...", "is_final": true/false}
    """
    await websocket.accept()
    logger.info("语音转录 WebSocket 已连接")

    # 音频数据队列（前端 → Speech-to-Text）
    audio_queue: asyncio.Queue[bytes | None] = asyncio.Queue()

    async def audio_stream():
        """从队列中读取音频数据，作为异步迭代器提供给 Speech-to-Text"""
        while True:
            chunk = await audio_queue.get()
            if chunk is None:
                break
            yield chunk

    async def receive_audio():
        """从 WebSocket 接收音频数据，放入队列"""
        try:
            while True:
                message = await websocket.receive()

                if message.get("type") == "websocket.disconnect":
                    break

                # 二进制数据 = 音频块
                if "bytes" in message and message["bytes"]:
                    await audio_queue.put(message["bytes"])

                # JSON 文本 = 控制消息
                elif "text" in message:
                    import json
                    try:
                        data = json.loads(message["text"])
                        if data.get("type") == "stop":
                            logger.info("收到停止信号")
                            break
                    except json.JSONDecodeError:
                        pass

        except WebSocketDisconnect:
            logger.info("WebSocket 断开")
        except RuntimeError:
            logger.info("WebSocket 已关闭")
        finally:
            # 发送 None 通知 audio_stream 结束
            await audio_queue.put(None)

    async def send_transcriptions():
        """从 Speech-to-Text 读取转录结果，发送给前端"""
        try:
            async for transcript in speech_service.streaming_transcribe(
                audio_stream(), sample_rate=16000, language_code="cn"
            ):
                try:
                    await websocket.send_json({
                        "type": "transcription",
                        "text": transcript["text"],
                        "is_final": transcript.get("is_final", True),
                    })
                    logger.info(
                        "转录(%s): %s",
                        "final" if transcript.get("is_final", True) else "interim",
                        str(transcript["text"])[:50],
                    )
                except WebSocketDisconnect:
                    logger.info("WebSocket 断开，停止发送转录")
                    break
                except RuntimeError:
                    logger.info("WebSocket 已关闭，停止发送转录")
                    break
        except WebSocketDisconnect:
            logger.info("WebSocket 断开")
        except RuntimeError:
            logger.info("WebSocket 已关闭")
        except Exception as e:
            logger.error("转录错误: %s", e, exc_info=True)
            try:
                await websocket.send_json({
                    "type": "error",
                    "message": str(e),
                })
            except Exception:
                pass

    # 并发：接收音频 + 发送转录
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(receive_audio())
            tg.create_task(send_transcriptions())
    except Exception as e:
        logger.error("WebSocket 错误: %s", e, exc_info=True)
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
        logger.info("语音转录 WebSocket 已关闭")

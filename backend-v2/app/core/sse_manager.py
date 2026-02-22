"""
SSE 连接管理器 - 管理所有活跃的 SSE 连接

跨进程推送：Worker 通过 Redis 发布事件，API 进程订阅后转发给已连接的客户端。
"""

import asyncio
import json
import logging
import uuid
from collections import defaultdict
from typing import Any

from fastapi import Request

logger = logging.getLogger(__name__)

# Worker 发布、API 订阅，用于跨进程 SSE 推送
SSE_REDIS_CHANNEL = "sse:user_events"


class SSEConnectionManager:
    """SSE 连接管理器 - 单例模式"""

    def __init__(self):
        # user_id -> set of queues
        self.connections: dict[uuid.UUID, set[asyncio.Queue]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: uuid.UUID) -> asyncio.Queue:
        """
        为用户创建新的 SSE 连接队列

        Args:
            user_id: 用户 ID

        Returns:
            asyncio.Queue: 该连接的消息队列
        """
        queue: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            self.connections[user_id].add(queue)
            logger.info(f"SSE 连接建立: user_id={user_id}, 当前连接数={len(self.connections[user_id])}")
        return queue

    async def disconnect(self, user_id: uuid.UUID, queue: asyncio.Queue) -> None:
        """
        断开 SSE 连接

        Args:
            user_id: 用户 ID
            queue: 要断开的队列
        """
        async with self._lock:
            if user_id in self.connections:
                self.connections[user_id].discard(queue)
                if not self.connections[user_id]:
                    del self.connections[user_id]
                logger.info(f"SSE 连接断开: user_id={user_id}, 剩余连接数={len(self.connections.get(user_id, []))}")

    async def send_to_user(self, user_id: uuid.UUID, event: str, data: Any) -> int:
        """
        向指定用户的所有连接发送消息

        Args:
            user_id: 用户 ID
            event: 事件类型
            data: 消息数据

        Returns:
            int: 成功发送的连接数
        """
        if user_id not in self.connections:
            logger.debug(f"用户 {user_id} 没有活跃的 SSE 连接")
            return 0

        message = {"event": event, "data": data}
        sent_count = 0

        async with self._lock:
            queues = list(self.connections[user_id])

        for queue in queues:
            try:
                await asyncio.wait_for(queue.put(message), timeout=1.0)
                sent_count += 1
            except asyncio.TimeoutError:
                logger.warning(f"向用户 {user_id} 发送消息超时，跳过该连接")
            except Exception as e:
                logger.error(f"向用户 {user_id} 发送消息失败: {e}")

        logger.debug(f"SSE 消息推送: user_id={user_id}, event={event}, 成功={sent_count}/{len(queues)}")
        return sent_count

    async def broadcast(self, event: str, data: Any) -> int:
        """
        向所有在线用户广播消息（慎用）

        Args:
            event: 事件类型
            data: 消息数据

        Returns:
            int: 成功发送的连接数
        """
        total_sent = 0
        async with self._lock:
            user_ids = list(self.connections.keys())

        for user_id in user_ids:
            sent = await self.send_to_user(user_id, event, data)
            total_sent += sent

        return total_sent

    def get_connection_count(self, user_id: uuid.UUID | None = None) -> int:
        """
        获取连接数

        Args:
            user_id: 指定用户 ID，如果为 None 则返回总连接数

        Returns:
            int: 连接数
        """
        if user_id:
            return len(self.connections.get(user_id, set()))
        return sum(len(queues) for queues in self.connections.values())


# 全局单例
sse_manager = SSEConnectionManager()


async def sse_event_generator(
    request: Request, user_id: uuid.UUID, queue: asyncio.Queue
):
    """
    SSE 事件生成器

    Args:
        request: FastAPI Request 对象
        user_id: 用户 ID
        queue: 消息队列

    Yields:
        bytes: SSE 格式的消息
    """
    try:
        # 发送初始连接成功消息
        yield format_sse_message("connected", {"message": "SSE 连接已建立"})

        last_heartbeat = asyncio.get_event_loop().time()

        while True:
            # 检查客户端是否断开
            if await request.is_disconnected():
                logger.info(f"客户端断开连接: user_id={user_id}")
                break

            try:
                # 等待消息，30 秒超时
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield format_sse_message(message["event"], message["data"])
                except asyncio.TimeoutError:
                    # 超时，发送心跳
                    current_time = asyncio.get_event_loop().time()
                    if current_time - last_heartbeat >= 30:
                        yield format_sse_message("heartbeat", {"timestamp": current_time})
                        last_heartbeat = current_time

            except asyncio.CancelledError:
                logger.info(f"SSE 连接被取消: user_id={user_id}")
                break
            except Exception as e:
                logger.error(f"SSE 事件生成器错误: {e}", exc_info=True)
                break

    finally:
        await sse_manager.disconnect(user_id, queue)
        logger.info(f"SSE 事件生成器结束: user_id={user_id}")


def format_sse_message(event: str, data: Any) -> bytes:
    """
    格式化 SSE 消息

    Args:
        event: 事件类型
        data: 数据

    Returns:
        bytes: SSE 格式的字节串
    """
    message = f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
    return message.encode("utf-8")


async def publish_sse_event(redis, user_id: uuid.UUID, event: str, data: Any) -> None:
    """
    由 Worker 等其它进程调用：向 Redis 发布 SSE 事件。
    API 进程内的订阅协程会收到后通过 sse_manager 推送给对应用户的连接。
    """
    payload = {"user_id": str(user_id), "event": event, "data": data}
    await redis.publish(SSE_REDIS_CHANNEL, json.dumps(payload, ensure_ascii=False))
    logger.debug("SSE 事件已发布: user_id=%s event=%s", user_id, event)


async def run_redis_sse_subscriber(get_redis_fn) -> None:
    """
    在 API 进程内运行：订阅 Redis 通道，将收到的消息转发给 sse_manager。
    应在 lifespan 中作为后台任务启动，关闭时 cancel。
    """
    redis = get_redis_fn()
    pubsub = redis.pubsub()
    await pubsub.subscribe(SSE_REDIS_CHANNEL)
    logger.info("SSE Redis 订阅已启动: %s", SSE_REDIS_CHANNEL)
    try:
        while True:
            msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if msg is None:
                continue
            if msg.get("type") != "message":
                continue
            try:
                raw = msg.get("data")
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8")
                payload = json.loads(raw)
                user_id = uuid.UUID(payload["user_id"])
                await sse_manager.send_to_user(
                    user_id, payload["event"], payload["data"]
                )
            except Exception as e:
                logger.exception("SSE Redis 消息处理失败: %s", e)
    except asyncio.CancelledError:
        logger.info("SSE Redis 订阅已停止")
    finally:
        await pubsub.unsubscribe(SSE_REDIS_CHANNEL)
        await pubsub.close()

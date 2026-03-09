"""私聊 WebSocket 连接管理（单进程内存版）"""

import asyncio
import logging
import uuid
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class DmWsManager:
    def __init__(self) -> None:
        self._connections: dict[uuid.UUID, dict[uuid.UUID, set[WebSocket]]] = defaultdict(
            lambda: defaultdict(set)
        )
        self._lock = asyncio.Lock()

    async def connect(self, conversation_id: uuid.UUID, user_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[conversation_id][user_id].add(websocket)

    async def disconnect(self, conversation_id: uuid.UUID, user_id: uuid.UUID, websocket: WebSocket) -> None:
        async with self._lock:
            conv_users = self._connections.get(conversation_id)
            if not conv_users:
                return
            user_sockets = conv_users.get(user_id)
            if not user_sockets:
                return

            user_sockets.discard(websocket)
            if not user_sockets:
                conv_users.pop(user_id, None)
            if not conv_users:
                self._connections.pop(conversation_id, None)

    async def broadcast(self, conversation_id: uuid.UUID, payload: dict[str, Any]) -> None:
        async with self._lock:
            conv_users = self._connections.get(conversation_id)
            if not conv_users:
                return
            sockets = [ws for user_sockets in conv_users.values() for ws in user_sockets]

        dead_sockets: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead_sockets.append(ws)

        if dead_sockets:
            logger.debug("清理失效私聊 WS 连接数量: %s", len(dead_sockets))
            for ws in dead_sockets:
                await self._disconnect_socket(conversation_id, ws)

    async def _disconnect_socket(self, conversation_id: uuid.UUID, websocket: WebSocket) -> None:
        async with self._lock:
            conv_users = self._connections.get(conversation_id)
            if not conv_users:
                return

            remove_user_ids: list[uuid.UUID] = []
            for user_id, sockets in conv_users.items():
                if websocket in sockets:
                    sockets.discard(websocket)
                if not sockets:
                    remove_user_ids.append(user_id)

            for user_id in remove_user_ids:
                conv_users.pop(user_id, None)

            if not conv_users:
                self._connections.pop(conversation_id, None)


manager = DmWsManager()

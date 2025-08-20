"""
梦境分析WebSocket消费者
支持实时推送分析进度和结果
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class DreamAnalysisConsumer(AsyncWebsocketConsumer):
    """梦境分析WebSocket消费者"""
    
    async def connect(self):
        """WebSocket连接处理"""
        try:
            # 获取用户信息
            self.user = self.scope["user"]
            
            # 验证用户身份
            if not self.user.is_authenticated:
                logger.warning("Unauthenticated user tried to connect to dream analysis WebSocket")
                await self.close()
                return
            
            # 为每个用户创建独立的房间组
            self.room_name = f"dream_analysis_{self.user.id}"
            self.room_group_name = f"dream_analysis_group_{self.user.id}"
            
            # 将连接加入用户专属的房间组
            await self.channel_layer.group_add(
                self.room_group_name,  # 用户专属房间
                self.channel_name  # Django Channels 框架自动为每个 WebSocket 连接分配一个唯一的随机字符串，作为连接的唯一标识
            )
            
            await self.accept()
            
            # 发送连接成功消息
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': '已连接到梦境分析服务',
                'user_id': self.user.id,
                'room_name': self.room_name,
                'room_group_name': self.room_group_name
            }))
            
            logger.info(f"User {self.user.id} connected to dream analysis WebSocket")
            
        except Exception as e:
            logger.error(f"Error in WebSocket connect: {e}", exc_info=True)
            await self.close()
    
    async def disconnect(self, close_code):
        """WebSocket断开连接处理"""
        try:
            if hasattr(self, 'room_group_name'):
                # 离开房间组
                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )
                
                logger.info(f"User {getattr(self.user, 'id', 'unknown')} disconnected from dream analysis WebSocket")
                
        except Exception as e:
            logger.error(f"Error in WebSocket disconnect: {e}", exc_info=True)
    
    async def receive(self, text_data):
        """接收WebSocket消息"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                # 心跳检测
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received from user {self.user.id}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': '无效的消息格式'
            }))
            
        except Exception as e:
            logger.error(f"Error in WebSocket receive: {e}", exc_info=True)
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': '处理消息时发生错误'
            }))
    
    async def dream_analysis_update(self, event):
        """处理梦境分析更新消息（由Celery任务调用）"""
        try:
            # event就是完整的消息，直接发送
            await self.send(text_data=json.dumps(event))
            
        except Exception as e:
            logger.error(f"Error sending dream analysis update: {e}", exc_info=True)


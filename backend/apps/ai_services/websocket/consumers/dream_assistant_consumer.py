"""
梦境助手 WebSocket 消费者
支持实时对话和流式响应
"""
import json
import logging
import asyncio
from typing import Dict, Any, List
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from ...models import Chat, Message, AIConfig
from ...graph import DreamAssistantGraph
from ...services.generate_conversation_title import get_conversation_title_service
from ...config import RAG_ENABLED

logger = logging.getLogger(__name__)


class DreamAssistantConsumer(AsyncWebsocketConsumer):
    """梦境助手 WebSocket 消费者"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.dream_assistant = None
        self.current_chat = None
        self.user_config = None
    
    async def connect(self):
        """WebSocket 连接处理"""
        try:
            # 获取用户信息
            self.user = self.scope["user"]
            
            # 验证用户身份
            if not self.user.is_authenticated:
                logger.warning("Unauthenticated user tried to connect to dream assistant WebSocket")
                await self.close()
                return
            
            # 初始化服务
            self.dream_assistant = DreamAssistantGraph()
            
            # 获取或创建用户配置
            self.user_config = await self._get_or_create_user_config()
            
            # 为每个用户创建独立的房间组
            self.room_name = f"dream_assistant_{self.user.id}"
            self.room_group_name = f"dream_assistant_group_{self.user.id}"
            
            # 加入房间组
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
            
            # 自动初始化对话 - 检查用户是否有历史对话
            await self._auto_initialize_chat()
            
            # 发送连接成功消息
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': '已连接到梦境助手服务',
                'user_id': self.user.id,
                'config': await self._serialize_user_config(self.user_config)
            }))
            
            logger.info(f"User {self.user.id} connected to dream assistant WebSocket")
            
        except Exception as e:
            logger.error(f"Error in WebSocket connect: {e}", exc_info=True)
            await self.close()
    
    async def disconnect(self, close_code):
        """WebSocket 断开连接处理"""
        try:
            # 简化属性检查
            if getattr(self, 'room_group_name', None):
                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )
            
            user_id = getattr(self.user, 'id', 'unknown') if hasattr(self, 'user') else 'unknown'
            logger.info(f"User {user_id} disconnected from dream assistant WebSocket")
            
        except Exception as e:
            logger.error(f"Error in WebSocket disconnect: {e}", exc_info=True)
    
    async def receive(self, text_data):
        """接收 WebSocket 消息"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            # 消息类型路由表
            message_handlers = {
                'message': self._handle_message,
                'create_chat': self._handle_create_chat,
                'load_chat': self._handle_load_chat,
                'get_chat_list': self._handle_get_chat_list,
                'rename_chat': self._handle_rename_chat,
                'delete_chat': self._handle_delete_chat,
                'delete_all_chats': self._handle_delete_all_chats,
                'save_memory': self._handle_save_memory,
                'ping': self._handle_ping
            }
            
            if message_type in message_handlers:
                await message_handlers[message_type](data)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                await self._send_error_response(f'未知的消息类型: {message_type}')
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received from user {self.user.id}")
            await self._send_error_response('无效的消息格式')
        except Exception as e:
            await self._handle_method_error(e, "Error in WebSocket receive", '处理消息时发生错误')
    
    async def _handle_message(self, data: Dict[str, Any]):
        """处理用户消息"""
        try:
            # 提取消息内容
            content = data.get('content', '')
            images = data.get('images', [])
            
            # 创建用户消息记录
            user_message = await self._create_message(
                chat=self.current_chat,
                role='user',
                content=content,
                images=images
            )
            
            # 发送用户消息确认
            await self.send(text_data=json.dumps({
                'type': 'message_received',
                'message_id': str(user_message.id),
                'timestamp': user_message.created_at.isoformat()
            }))
            
            # 发送思考中状态
            await self.send(text_data=json.dumps({
                'type': 'thinking',
                'message': '正在思考...'
            }))
            
            # 获取历史消息
            messages = await self._get_chat_messages_langchain(self.current_chat.id)
            
            # 使用流式处理消息（LangGraph自动管理记忆）
            await self._handle_streaming_response(
                user_input=content,
                chat_id=str(self.current_chat.id),
                user_id=str(self.user.id),
                message_id=str(user_message.id),
                user_images=images,
                user_preferences=await self._serialize_user_config(self.user_config),
                existing_messages=messages
            )
                
        except Exception as e:
            await self._handle_method_error(e, "Error handling message", '处理消息时发生错误')
    
    async def _handle_create_chat(self, data: Dict[str, Any]):
        """创建新对话"""
        try:
            title = data.get('title', '新对话')
            
            # 创建新对话
            self.current_chat = await database_sync_to_async(Chat.objects.create)(
                user=self.user,
                title=title
            )
            

            
            await self.send(text_data=json.dumps({
                'type': 'chat_created',
                'chat_id': str(self.current_chat.id),
                'title': self.current_chat.title,
                'created_at': self.current_chat.created_at.isoformat()
            }))
            
            logger.info(f"Created new chat {self.current_chat.id} for user {self.user.id}")
            
        except Exception as e:
            await self._handle_method_error(e, "Error creating chat", '创建对话失败')
    
    async def _handle_load_chat(self, data: Dict[str, Any]):
        """加载已有对话"""
        try:
            chat_id = data.get('chat_id')
            if not chat_id:
                raise ValueError("chat_id is required")
            
            # 获取对话
            self.current_chat = await database_sync_to_async(
                Chat.objects.get
            )(id=chat_id, user=self.user)
            
            # 获取对话历史（包含图片等多模态数据）
            db_messages = await self._get_chat_messages_db(chat_id, limit=50)
            
            await self.send(text_data=json.dumps({
                'type': 'chat_loaded',
                'chat_id': str(self.current_chat.id),
                'title': self.current_chat.title,
                'messages': await self._serialize_db_messages(db_messages)
            }))
            
            logger.info(f"Loaded chat {chat_id} for user {self.user.id}")
            
        except Chat.DoesNotExist:
            await self._send_error_response('对话不存在或无权限访问')
        except Exception as e:
            await self._handle_method_error(e, "Error loading chat", '加载对话失败')
    
    async def _handle_get_chat_list(self, data: Dict[str, Any]):
        """获取用户的对话列表"""
        try:
            limit = data.get('limit', 20)  # 默认返回20个对话
            
            # 获取用户的对话列表
            chats = await self._get_user_chat_list(limit)
            
            await self.send(text_data=json.dumps({
                'type': 'chat_list',
                'chats': await self._serialize_chat_list(chats)
            }))
            
            logger.info(f"Sent chat list to user {self.user.id} ({len(chats)} chats)")
            
        except Exception as e:
            await self._handle_method_error(e, "Error getting chat list", '获取对话列表失败')
    
    async def _handle_save_memory(self, data: Dict[str, Any]):
        """保存用户记忆"""
        try:
            content = data.get('content', '')
            memory_type = data.get('memory_type', 'other')
            context = data.get('context', '')
            
            if not content:
                raise ValueError("记忆内容不能为空")
            
            # 保存记忆
            memory = await database_sync_to_async(self.memory_manager.save_user_memory)(
                user_id=str(self.user.id),
                content=content,
                memory_type=memory_type,
                context=context
            )
            
            await self.send(text_data=json.dumps({
                'type': 'memory_saved',
                'memory_id': str(memory.id),
                'message': '记忆已保存'
            }))
            
            logger.info(f"Saved memory for user {self.user.id}: {content[:50]}...")
            
        except Exception as e:
            await self._handle_method_error(e, "Error saving memory", '保存记忆失败')
    
    async def _handle_ping(self, data: Dict[str, Any]):
        """处理心跳检测"""
        await self.send(text_data=json.dumps({
            'type': 'pong',
            'timestamp': data.get('timestamp')
        }))
    
    async def _handle_rename_chat(self, data: Dict[str, Any]):
        """重命名对话"""
        try:
            chat_id = data.get('chat_id')
            new_title = data.get('new_title', '').strip()
            
            if not chat_id:
                raise ValueError("chat_id is required")
            if not new_title:
                raise ValueError("new_title is required")
            if len(new_title) > 100:
                raise ValueError("标题长度不能超过100字符")
                
            # 获取并验证对话权限
            chat = await database_sync_to_async(
                Chat.objects.get
            )(id=chat_id, user=self.user)
            
            # 更新标题
            chat.title = new_title
            await database_sync_to_async(chat.save)()
            
            # 发送成功响应
            await self.send(text_data=json.dumps({
                'type': 'chat_renamed',
                'chat_id': str(chat.id),
                'new_title': new_title,
                'message': '对话已重命名'
            }))
            
            # 重命名后不需要重新发送对话列表，前端会自行更新
            
            logger.info(f"Chat {chat_id} renamed to '{new_title}' by user {self.user.id}")
            
        except Chat.DoesNotExist:
            await self._send_error_response('对话不存在或无权限访问')
        except ValueError as e:
            await self._send_error_response(str(e))
        except Exception as e:
            await self._handle_method_error(e, "Error renaming chat", '重命名对话失败')
    
    async def _handle_delete_chat(self, data: Dict[str, Any]):
        """删除对话"""
        try:
            chat_id = data.get('chat_id')
            
            if not chat_id:
                raise ValueError("chat_id is required")
                
            # 获取并验证对话权限
            chat = await database_sync_to_async(
                Chat.objects.get
            )(id=chat_id, user=self.user)
            
            # 硬删除（完全删除对话及其消息）
            await database_sync_to_async(chat.delete)()
            
            # 如果删除的是当前对话，清空当前对话状态
            if self.current_chat and str(self.current_chat.id) == str(chat_id):
                self.current_chat = None
                # 发送对话已关闭的消息
                await self.send(text_data=json.dumps({
                    'type': 'chat_closed',
                    'message': '当前对话已删除'
                }))
            
            # 发送删除成功响应
            await self.send(text_data=json.dumps({
                'type': 'chat_deleted',
                'chat_id': str(chat_id),
                'message': '对话已删除'
            }))
            
            # 删除后不需要重新发送对话列表，前端会自行更新
            
            logger.info(f"Chat {chat_id} deleted by user {self.user.id}")
            
        except Chat.DoesNotExist:
            await self._send_error_response('对话不存在或无权限访问')
        except Exception as e:
            await self._handle_method_error(e, "Error deleting chat", '删除对话失败')
    
    async def _handle_delete_all_chats(self, data: Dict[str, Any]):
        """删除所有对话"""
        try:
            # 获取用户所有对话数量
            chat_count = await database_sync_to_async(
                Chat.objects.filter(user=self.user).count
            )()
            
            if chat_count == 0:
                await self._send_error_response('没有对话可删除')
                return
            
            # 批量删除用户的所有对话（硬删除，会自动删除关联的消息）
            deleted_count = await database_sync_to_async(
                Chat.objects.filter(user=self.user).delete
            )()
            
            # 清空当前对话状态
            self.current_chat = None
            
            # 发送对话已关闭的消息
            await self.send(text_data=json.dumps({
                'type': 'chat_closed',
                'message': '所有对话已删除'
            }))
            
            # 发送删除成功响应
            await self.send(text_data=json.dumps({
                'type': 'all_chats_deleted',
                'deleted_count': deleted_count[0] if deleted_count else 0,
                'message': f'已删除 {deleted_count[0] if deleted_count else 0} 个对话'
            }))
            
            logger.info(f"All chats deleted for user {self.user.id}, count: {deleted_count[0] if deleted_count else 0}")

            # 删除完成后，自动初始化一个新的对话，避免前端处于 0 会话状态导致轮询
            await self._auto_initialize_chat()
            
        except Exception as e:
            await self._handle_method_error(e, "Error deleting all chats", '删除所有对话失败')
    
    async def _handle_streaming_response(self, 
                                       user_input: str,
                                       chat_id: str,
                                       user_id: str,
                                       message_id: str,
                                       user_images: list,
                                       user_preferences: dict,
                                       existing_messages: list):
        """处理流式响应 - 简化版逐字传输"""
        try:
            assistant_message = None
            last_content = ""
            
            # 使用 LangGraph 的流式处理
            async for event in self.dream_assistant.astream_message(
                user_input=user_input,
                chat_id=chat_id,
                user_id=user_id,
                message_id=message_id,
                user_images=user_images,
                user_preferences=user_preferences,
                existing_messages=existing_messages
            ):
                # 检查错误
                if event.get('error'):
                    await self._send_error_response(event.get('final_response', '处理消息时发生错误'), event.get('error'))
                    return
                
                # 根据流模式处理不同类型的事件
                stream_mode = event.get('stream_mode', '')
                
                if stream_mode == 'custom':
                    # 处理自定义流数据
                    event_type = event.get('type', '')
                    
                    if event_type == 'interpretation_chunk':
                        # 处理梦境解读的流式内容
                        chunk_content = event.get('content', '')
                        
                        if not assistant_message:
                            assistant_message = await self._create_message(
                                chat=self.current_chat,
                                role='assistant',
                                content=chunk_content
                            )
                            await self.send(text_data=json.dumps({
                                'type': 'response_start',
                                'message_id': str(assistant_message.id),
                                'content': chunk_content
                            }))
                        else:
                            assistant_message.content += chunk_content
                            await self.send(text_data=json.dumps({
                                'type': 'response_chunk',
                                'message_id': str(assistant_message.id),
                                'content': chunk_content
                            }))
                    
                    elif event_type == 'interpretation_complete':
                        # 解读完成，保存完整结果
                        interpretation_dict = event.get('interpretation', {})
                        if assistant_message:
                            # 修复JSON序列化问题：使用字典而不是对象
                            assistant_message.metadata = {'interpretation': interpretation_dict}
                            await database_sync_to_async(assistant_message.save)()
                    
                    elif event_type == 'knowledge_chunk':
                        # 处理知识问答的流式内容
                        chunk_content = event.get('content', '')
                        
                        if not assistant_message:
                            assistant_message = await self._create_message(
                                chat=self.current_chat,
                                role='assistant',
                                content=chunk_content
                            )
                            await self.send(text_data=json.dumps({
                                'type': 'response_start',
                                'message_id': str(assistant_message.id),
                                'content': chunk_content
                            }))
                        else:
                            assistant_message.content += chunk_content
                            await self.send(text_data=json.dumps({
                                'type': 'response_chunk',
                                'message_id': str(assistant_message.id),
                                'content': chunk_content
                            }))
                    
                    elif event_type == 'knowledge_complete':
                        # 知识问答完成
                        if assistant_message:
                            assistant_message.metadata = {'knowledge_answer': event.get('answer', '')}
                            await database_sync_to_async(assistant_message.save)()
                            
                            # 发送完成消息
                            await self.send(text_data=json.dumps({
                                'type': 'response_complete',
                                'message_id': str(assistant_message.id),
                                'content': assistant_message.content,
                                'image_url': event.get('generated_image_url')
                            }))
                            
                            await self._check_and_generate_title()
                            break
                
                elif stream_mode == 'values':
                    # 处理图状态更新
                    # 处理节点状态更新
                    if event.get('next_node'):
                        current_node = event.get('next_node')
                        # 当 RAG 关闭时，跳过 scholar 节点的状态消息
                        if current_node == 'scholar' and not bool(RAG_ENABLED):
                            pass
                        elif current_node != 'end':
                            await self.send(text_data=json.dumps({
                                'type': 'processing_node',
                                'node': current_node,
                                'message': self._get_node_message(current_node)
                            }))
                    
                    # 处理最终响应（当没有流式数据时）
                    if event.get('final_response') and not assistant_message:
                        final_content = event['final_response']
                        image_url = event.get('generated_image_url')
                        
                        assistant_message = await self._create_message(
                            chat=self.current_chat,
                            role='assistant',
                            content=final_content,
                            images=[image_url] if image_url else [],
                            metadata={ 'generated_image_url': image_url } if image_url else {}
                        )
                        
                        # 对于最终响应，可以直接发送完整内容
                        await self.send(text_data=json.dumps({
                            'type': 'response_complete',
                            'message_id': str(assistant_message.id),
                            'content': final_content,
                            'image_url': image_url
                        }))
                        
                        await self._check_and_generate_title()
                        break
                    
        except Exception as e:
            logger.error(f"流式响应处理错误: {e}", exc_info=True)
            await self._send_error_response('处理流式响应时发生错误')
    
    async def _send_error_response(self, message: str, error: str = None):
        """发送错误响应"""
        error_data = {
            'type': 'error',
            'message': message
        }
        if error:
            error_data['error'] = error
        await self.send(text_data=json.dumps(error_data))
    
    async def _handle_method_error(self, exception: Exception, log_message: str, user_message: str):
        """通用方法错误处理"""
        logger.error(f"{log_message}: {exception}", exc_info=True)
        await self._send_error_response(user_message)
    

    
    def _extract_response_metadata(self, event: dict) -> dict:
        """提取响应元数据"""
        return {
            'interpretation': event.get('dream_interpretation'),
            'image_url': event.get('generated_image_url'),
            'metadata': event.get('response_metadata', {})
        }
    
    def _format_interpretation_text(self, interpretation) -> str:
        """格式化解读文本用于流式输出"""
        if hasattr(interpretation, '__dict__'):
            # 如果是 DreamInterpretation 对象
            sections = []
            
            if interpretation.summary:
                sections.append(f"**梦境解读总结**\n{interpretation.summary}")
            
            if interpretation.psychological:
                sections.append(f"🧠 **心理学视角**\n{interpretation.psychological}")
            
            if interpretation.symbolic:
                sections.append(f"🔮 **象征学解读**\n{interpretation.symbolic}")
            
            if interpretation.biological:
                sections.append(f"🧬 **生物医学角度**\n{interpretation.biological}")
            
            if interpretation.spiritual:
                sections.append(f"✨ **灵性维度**\n{interpretation.spiritual}")
            
            if interpretation.personal_growth:
                sections.append(f"🌱 **个人成长启示**\n{interpretation.personal_growth}")
            
            if interpretation.follow_up_questions:
                question_text = "\n".join([f"{i+1}. {q}" for i, q in enumerate(interpretation.follow_up_questions)])
                sections.append(f"💭 **引导性追问**\n{question_text}")
            
            return "\n\n".join(sections)
        else:
            # 如果是字符串或其他类型
            return str(interpretation)
    
    def _get_node_message(self, node: str) -> str:
        """获取节点处理消息"""
        messages = {
            'orchestrator': '正在分析您的需求...',
            'interpreter': '正在深度解读梦境...',
            'scholar': '正在查找知识库...',
            'visualizer': '正在生成梦境图像...',
            'response_generator': '正在整理回答...'
        }
        return messages.get(node, '正在处理...')
    
    
    @database_sync_to_async
    def _get_or_create_user_config(self) -> AIConfig:
        """获取或创建用户 AI 配置"""
        config, created = AIConfig.objects.get_or_create(user=self.user)
        if created:
            logger.info(f"Created default AI config for user {self.user.id}")
        return config
    
    @database_sync_to_async
    def _create_message(self, chat: Chat, role: str, content: str, 
                       images: list = None, metadata: dict = None) -> Message:
        """创建消息记录"""
        return Message.objects.create(
            chat=chat,
            role=role,
            content=content,
            images=images or [],
            metadata=metadata or {}
        )
    
    async def _get_chat_messages_db(self, chat_id: str, limit: int = 50) -> list:
        """获取对话历史原始消息（包含图片/元数据）"""
        return await database_sync_to_async(
            lambda: list(Message.objects.filter(chat_id=chat_id).order_by('created_at')[:limit])
        )()

    async def _get_chat_messages_langchain(self, chat_id: str, limit: int = 20) -> list:
        """获取对话历史消息并转换为 LangChain 消息格式（供 LLM 上下文使用）"""
        messages = await database_sync_to_async(
            lambda: list(Message.objects.filter(chat_id=chat_id).order_by('-created_at')[:limit])
        )()
       
        langchain_messages = []
        for msg in reversed(messages):
            if msg.role == 'user':
                langchain_messages.append(HumanMessage(content=msg.content))
            elif msg.role == 'assistant':
                langchain_messages.append(AIMessage(content=msg.content))
            elif msg.role == 'system':
                langchain_messages.append(SystemMessage(content=msg.content))
        return langchain_messages
    
    async def _serialize_user_config(self, config: AIConfig) -> Dict[str, Any]:
        """序列化用户配置"""
        return {
            'assistant_name': config.assistant_name,
            'personality_traits': config.personality_traits,
            'interpretation_style': config.interpretation_style,
            'preferred_dimensions': config.preferred_dimensions,
            'response_length': config.response_length,
            'enable_auto_image_generation': config.enable_auto_image_generation,
            'enable_follow_up_questions': config.enable_follow_up_questions,
            'enable_pattern_analysis': config.enable_pattern_analysis
        }
    
    async def _serialize_messages(self, messages: list) -> list:
        """序列化消息列表"""
        # 消息类型映射
        message_type_map = {
            SystemMessage: 'system',
            HumanMessage: 'user'
        }
        
        return [{
            'role': message_type_map.get(type(msg), 'assistant'),
            'content': msg.content
        } for msg in messages]

    async def _serialize_db_messages(self, messages: list) -> list:
        """序列化数据库消息（包含图片和元数据），用于前端重载时完整还原"""
        serialized = []
        for msg in messages:
            item = {
                'id': str(msg.id),
                'role': msg.role,
                'content': msg.content,
                'timestamp': msg.created_at.isoformat(),
            }
            # 如果助手消息带有图片，优先从 images 或 metadata 中取出 image_url
            image_url = None
            if isinstance(msg.images, list) and len(msg.images) > 0:
                image_url = msg.images[0]
            elif isinstance(msg.metadata, dict):
                image_url = (msg.metadata or {}).get('generated_image_url') or (msg.metadata or {}).get('image_url')
            if image_url:
                item['image_url'] = image_url
            serialized.append(item)
        return serialized
    

    
    async def _auto_initialize_chat(self):
        """自动初始化对话 - 为用户加载最新对话或创建新对话"""
        try:
            # 检查用户是否有现有的对话
            latest_chat = await self._get_latest_user_chat()
            
            if latest_chat:
                # 如果有现有对话，加载最新的对话
                self.current_chat = latest_chat
                
                # 获取对话历史（包含图片等多模态数据）
                db_messages = await self._get_chat_messages_db(str(latest_chat.id), limit=50)
                
                # 发送对话已加载的消息
                await self.send(text_data=json.dumps({
                    'type': 'chat_loaded',
                    'chat_id': str(self.current_chat.id),
                    'title': self.current_chat.title,
                    'messages': await self._serialize_db_messages(db_messages),
                    'auto_loaded': True  # 标记这是自动加载的
                }))
                
                logger.info(f"Auto-loaded latest chat {latest_chat.id} for user {self.user.id}")
                
            else:
                # 如果没有现有对话，自动创建一个新对话
                try:
                    self.current_chat = await database_sync_to_async(Chat.objects.create)(
                        user=self.user,
                        title='新对话'
                    )

                    
                    # 发送对话已创建的消息
                    await self.send(text_data=json.dumps({
                        'type': 'chat_created',
                        'chat_id': str(self.current_chat.id),
                        'title': self.current_chat.title,
                        'created_at': self.current_chat.created_at.isoformat(),
                        'auto_created': True
                    }))
                    
                    logger.info(f"Auto-created new chat {self.current_chat.id} for user {self.user.id}")
                    
                except Exception as create_error:
                    # 自动创建对话失败，仅发送错误信息
                    logger.error(f"Failed to auto-create chat for user {self.user.id}: {create_error}", exc_info=True)
                    await self._send_error_response('自动创建对话失败')
                    return  # 不继续执行后续操作
            
            # 在完成对话初始化后，发送对话列表
            await self._send_chat_list()
                
        except Exception as e:
            logger.error(f"Error in auto-initializing chat for user {self.user.id}: {e}", exc_info=True)
            await self._send_error_response('系统初始化失败')

    async def _send_chat_list(self):
        """发送对话列表"""
        try:
            chats = await self._get_user_chat_list(20)
            await self.send(text_data=json.dumps({
                'type': 'chat_list',
                'chats': await self._serialize_chat_list(chats)
            }))
        except Exception as e:
            logger.error(f"Error sending chat list to user {self.user.id}: {e}")

    @database_sync_to_async
    def _get_latest_user_chat(self):
        """获取用户最新的对话"""
        try:
            return Chat.objects.filter(
                user=self.user,
                is_active=True
            ).order_by('-updated_at').first()
        except Exception as e:
            logger.error(f"Error getting latest chat for user {self.user.id}: {e}")
            return None

    @database_sync_to_async
    def _get_user_chat_list(self, limit: int = 20):
        """获取用户的对话列表"""
        try:
            return list(Chat.objects.filter(
                user=self.user,
                is_active=True
            ).order_by('-updated_at')[:limit].select_related('user'))
        except Exception as e:
            logger.error(f"Error getting chat list for user {self.user.id}: {e}")
            return []

    async def _serialize_chat_list(self, chats: list) -> list:
        """序列化对话列表"""
        serialized_chats = []
        
        for chat in chats:
            # 获取最后一条消息
            try:
                last_message = await database_sync_to_async(
                    lambda: chat.messages.exclude(role='system').order_by('-created_at').first()
                )()
                
                last_message_preview = None
                if last_message:
                    content = last_message.content[:50] + '...' if len(last_message.content) > 50 else last_message.content
                    last_message_preview = {
                        'role': last_message.role,
                        'content': content,
                        'created_at': last_message.created_at.isoformat()
                    }
                
                serialized_chats.append({
                    'id': str(chat.id),
                    'title': chat.title,
                    'created_at': chat.created_at.isoformat(),
                    'updated_at': chat.updated_at.isoformat(),
                    'last_message': last_message_preview
                })
                
            except Exception as e:
                logger.error(f"Error serializing chat {chat.id}: {e}")
                # 如果获取最后一条消息失败，仍然包含对话基本信息
                serialized_chats.append({
                    'id': str(chat.id),
                    'title': chat.title,
                    'created_at': chat.created_at.isoformat(),
                    'updated_at': chat.updated_at.isoformat(),
                    'last_message': None
                })
        
        return serialized_chats
    
    async def _check_and_generate_title(self):
        """检查并生成对话标题（仅在首轮对话完成后）"""
        try:
            if not self.current_chat:
                return
            
            # 检查是否为首轮对话（只有2条消息：用户消息+助手回复）
            message_count = await database_sync_to_async(
                lambda: self.current_chat.messages.exclude(role='system').count()
            )()
            
            # 如果消息数量为2（一问一答），且当前标题为默认标题，则生成新标题
            if message_count == 2 and self.current_chat.title == '新对话':
                # 获取用户的第一条消息和助手的回复
                messages = await database_sync_to_async(
                    lambda: list(self.current_chat.messages.exclude(role='system').order_by('created_at')[:2])
                )()
                
                if len(messages) == 2:
                    user_message = messages[0]
                    assistant_message = messages[1]
                    
                    # 构建对话内容用于标题生成
                    conversation_content = f"用户提问：{user_message.content}\n助手回复：{assistant_message.content[:200]}"
                    
                    # 异步生成标题
                    await self._generate_and_update_title(conversation_content)
                    
        except Exception as e:
            logger.error(f"Error in title generation check: {e}", exc_info=True)
    
    async def _generate_and_update_title(self, conversation_content: str):
        """生成并更新对话标题"""
        try:
            # 获取对话标题生成服务
            conversation_title_service = get_conversation_title_service()
            
            # 在线程池中运行标题生成（因为它是同步的）
            def generate_title():
                return conversation_title_service.generate_conversation_title(conversation_content)
            
            result = await asyncio.get_event_loop().run_in_executor(
                None, generate_title
            )
            
            if result.get('success'):
                new_title = result.get('title')
                
                # 更新数据库中的标题
                self.current_chat.title = new_title
                await database_sync_to_async(self.current_chat.save)()
                
                # 发送标题更新消息到前端
                await self.send(text_data=json.dumps({
                    'type': 'title_generated',
                    'chat_id': str(self.current_chat.id),
                    'new_title': new_title,
                    'message': '对话标题已自动生成'
                }))
                
                logger.info(f"Auto-generated title for chat {self.current_chat.id}: '{new_title}'")
            else:
                logger.warning(f"Failed to generate title for chat {self.current_chat.id}: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"Error generating conversation title: {e}", exc_info=True)
"""
梦境助手HTTP API视图
==================
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from langchain_core.messages import HumanMessage, AIMessage

from ..models import Chat, Message
from ..langgraph.graph import get_dream_assistant_graph
from ..langgraph.graph.state import create_initial_state, generate_thread_id, generate_session_id
from apps.ai_services.services.generate_conversation_title import get_conversation_title_service

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_message(request):
    """
    请求格式: {"message": "用户消息", "chat_id": "对话ID"}
    响应格式: {"success": true, "data": {"user_message": {...}, "assistant_message": {...}, "chat": {...}}}
    """
    try:
        # 获取请求数据
        user_input = request.data.get('message')
        chat_id = request.data.get('chat_id')
        
        # 获取对话
        chat = Chat.objects.get(id=chat_id, user=request.user)
        
        # 使用LangGraph处理消息
        assistant_response = response_user_input(user_input, request.user.id, chat)
        
        # 保存用户消息
        user_message = Message.objects.create(
            chat=chat,
            role='user',
            content=user_input
        )
        
        # 保存AI回复
        assistant_message = Message.objects.create(
            chat=chat,
            role='assistant',
            content=assistant_response
        )
        
        # 检查是否需要生成标题
        _check_and_generate_title(chat, user_input)
        
        # 返回简化响应
        return Response({
            'success': True,
            'data': {
                'user_message': {
                    'id': str(user_message.id),
                    'role': 'user',
                    'content': user_input
                },
                'assistant_message': {
                    'id': str(assistant_message.id),
                    'role': 'assistant',
                    'content': assistant_response
                },
                'chat': {
                    'id': str(chat.id),
                    'title': chat.title
                }
            }
        })
        
    except Exception as e:
        logger.error(f"处理消息失败: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': '服务器内部错误'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def response_user_input(user_input: str, user_id: str, chat: Chat) -> str:
    """
    使用LangGraph Agent处理用户输入
    
    优化策略：
    1. 依赖Checkpointer自动管理对话历史，消除重复加载
    2. 只在首次对话时从MySQL迁移历史到Checkpointer
    3. Checkpointer成为对话状态的唯一真实来源
    
    Args:
        user_input: 用户输入
        user_id: 用户ID
        chat: 当前对话实例
        
    Returns:
        str: AI回复内容
    """
    try:
        graph = get_dream_assistant_graph()
        
        # 获取或生成thread_id
        if not chat.thread_id:
            chat.thread_id = generate_thread_id()
            chat.save()
            
            # 首次对话：从MySQL迁移历史到Checkpointer
            logger.info(f"首次对话，迁移历史消息到Checkpointer for chat {chat.id}")
            session_id = generate_session_id()
            initial_state = create_initial_state(
                user_id=str(user_id),
                session_id=session_id,
                thread_id=chat.thread_id
            )
            
            # 只在首次对话时加载MySQL历史
            history_messages = _load_chat_history(chat)
            current_message = [HumanMessage(content=user_input)]
            initial_state["messages"] = history_messages + current_message
        else:
            # 后续对话：直接使用Checkpointer中的历史，无需重复加载
            logger.info(f"继续对话，使用Checkpointer历史 for thread {chat.thread_id}")
            initial_state = {
                "messages": [HumanMessage(content=user_input)]
            }
        
        # 配置LangGraph执行选项
        config = {
            "configurable": {
                "thread_id": chat.thread_id
            }
        }
        
        # 同步执行图并获取最终状态
        final_state = graph.invoke(initial_state, config=config)
        
        # 提取AI回复
        messages = final_state.get("messages", [])
        for message in reversed(messages):
            if hasattr(message, 'content') and message.content.strip():
                return message.content
        
        return "抱歉，我暂时无法理解您的问题，请稍后再试。"
        
    except Exception as e:
        logger.error(f"LangGraph处理失败: {e}", exc_info=True)
        return "AI处理失败，请稍后重试。"


def _check_and_generate_title(chat: Chat, user_input: str):
    """
    检查并生成对话标题
    
    Args:
        chat: 对话实例
        user_input: 用户输入消息
    """
    try:
        if chat.title == "新聊天":
            # 生成标题
            title_service = get_conversation_title_service()
            result = title_service.generate_conversation_title(user_input)
            
            if result.get('success') and result.get('title'):
                chat.title = result['title']
                chat.save()
                
    except Exception as e:
        logger.error(f"生成标题失败: {e}", exc_info=True)


def _load_chat_history(chat: Chat, limit: int = 20):
    """
    加载对话历史消息
    
    Args:
        chat: 对话实例
        limit: 最大加载消息数量（默认20条，防止上下文过长）
        
    Returns:
        List[BaseMessage]: LangChain消息对象列表
    """
    try:
        # 获取最近的消息（按时间倒序，然后反转得到正序）
        messages = Message.objects.filter(chat=chat).order_by('created_at')[:limit]
        
        # 转换为LangChain消息格式
        langchain_messages = []
        for msg in messages:
            if msg.role == 'user':
                langchain_messages.append(HumanMessage(content=msg.content))
            elif msg.role == 'assistant':
                langchain_messages.append(AIMessage(content=msg.content))
        
        logger.info(f"加载了 {len(langchain_messages)} 条历史消息 for chat {chat.id}")
        return langchain_messages
        
    except Exception as e:
        logger.error(f"加载历史消息失败: {e}", exc_info=True)
        return []

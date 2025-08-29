"""
梦境助手相关视图（清理版本）
记忆管理完全由LangGraph Store接管
"""
import logging
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count

from ..models import Chat, Message, AIConfig
from ..serializers import (
    ChatSerializer, MessageSerializer, AIConfigSerializer
)

logger = logging.getLogger(__name__)


class ChatViewSet(viewsets.ModelViewSet):
    """对话管理视图集"""
    serializer_class = ChatSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """只返回当前用户的对话"""
        queryset = Chat.objects.filter(
            user=self.request.user,
            is_active=True
        ).annotate(
            message_count=Count('messages')
        ).order_by('-updated_at')
        
        return queryset

    def perform_create(self, serializer):
        """创建对话时自动关联当前用户"""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """获取指定对话的消息列表"""
        try:
            chat = self.get_object()
            messages = Message.objects.filter(
                chat=chat
            ).order_by('created_at')[:50]  # 限制数量
            
            serializer = MessageSerializer(messages, many=True)
            return Response({
                'messages': serializer.data,
                'total_count': messages.count()
            })
        except Exception as e:
            logger.error(f"Error getting chat messages: {e}")
            return Response(
                {'error': '获取消息失败'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def rename(self, request, pk=None):
        """重命名对话"""
        try:
            chat = self.get_object()
            new_title = request.data.get('title', '').strip()
            
            if not new_title:
                return Response(
                    {'error': '标题不能为空'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            chat.title = new_title
            chat.save()
            
            return Response({
                'success': True,
                'title': chat.title,
                'message': '对话标题已更新'
            })
        except Exception as e:
            logger.error(f"Error renaming chat: {e}")
            return Response(
                {'error': '重命名失败'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """获取最近的对话"""
        recent_chats = self.get_queryset()[:10]
        serializer = self.get_serializer(recent_chats, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def search(self, request):
        """搜索对话"""
        query = request.data.get('query', '').strip()
        if not query:
            return Response(
                {'error': '搜索关键词不能为空'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            chats = self.get_queryset().filter(
                Q(title__icontains=query) |
                Q(messages__content__icontains=query)
            ).distinct()[:20]
            
            serializer = self.get_serializer(chats, many=True)
            return Response({
                'results': serializer.data,
                'total_found': chats.count()
            })
        except Exception as e:
            logger.error(f"Chat search failed: {e}")
            return Response(
                {'error': '搜索失败'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def dream_connections(self, request, pk=None):
        """获取对话中的梦境关联"""
        try:
            chat = self.get_object()
            
            # 查找与梦境相关的消息
            dream_messages = Message.objects.filter(
                chat=chat,
                related_dream__isnull=False
            ).select_related('related_dream')[:10]
            
            connections = []
            for message in dream_messages:
                connections.append({
                    'dream_id': str(message.related_dream.id),
                    'dream_title': message.related_dream.title,
                    'message_content': message.content[:100],
                    'created_at': message.created_at
                })
            
            return Response({
                'connections': connections,
                'total_connected_dreams': len(connections)
            })
            
        except Exception as e:
            logger.error(f"Error getting dream connections: {e}")
            return Response(
                {'error': '获取梦境关联失败'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AIConfigView(generics.RetrieveUpdateAPIView):
    """
    用户 AI 配置视图
    支持 GET (retrieve) 和 PUT/PATCH (update)
    """
    serializer_class = AIConfigSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        """获取或创建当前用户的配置"""
        config, _ = AIConfig.objects.get_or_create(user=self.request.user)
        return config

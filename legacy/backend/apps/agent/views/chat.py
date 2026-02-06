"""
对话管理视图
=================
"""
from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import Chat, Message
from ..serializers import ChatSerializer, MessageSerializer


class ChatViewSet(viewsets.ModelViewSet):
    """对话管理视图集"""
    serializer_class = ChatSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """获取当前用户的对话列表"""
        return Chat.objects.filter(
            user=self.request.user
        ).annotate(
            message_count=Count('messages')
        ).order_by('-updated_at')

    def perform_create(self, serializer):
        """创建对话时自动关联当前用户"""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """获取对话的消息列表"""
        chat = self.get_object()
        messages = chat.messages.order_by('created_at')
        
        page = self.paginate_queryset(messages)
        if page is not None:
            serializer = MessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def rename(self, request, pk=None):
        """重命名对话"""
        chat = self.get_object()
        chat.title = request.data.get('title', '').strip()
        chat.save()
        return Response({"title": chat.title})

    @action(detail=False, methods=['post'])
    def search(self, request):
        """搜索对话"""
        query = request.data.get('query', '').strip()
        chats = self.get_queryset().filter(
            Q(title__icontains=query) | 
            Q(messages__content__icontains=query)
        ).distinct()
        
        page = self.paginate_queryset(chats)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(chats, many=True)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """删除对话（硬删除）"""
        self.get_object().delete()
        return Response(status=204)
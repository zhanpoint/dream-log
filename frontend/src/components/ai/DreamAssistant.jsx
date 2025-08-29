import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect, startTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useI18nContext } from '@/contexts/I18nContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
    Send,
    Plus,
    Edit,
    Settings,
    Loader2,
    Image as ImageIcon,
    Mic,
    Bot,
    User,
    Search,
    ArrowDown,
    Trash2,
    Database,
    Palette,
    Shield,
    HelpCircle,
    Download
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import ChatList from './ChatList';
import AIConfigPanel from './AIConfigPanel';
import MessageBubble from './MessageBubble';
import { useWebSocket } from '@/hooks/useWebSocket';
import notification from '@/utils/notification';

const DreamAssistant = () => {
    const { user } = useAuth();
    const { t } = useI18nContext();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [currentChat, setCurrentChat] = useState(null);
    const [chatList, setChatList] = useState([]);
    const [aiConfig, setAiConfig] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [inputHeight, setInputHeight] = useState(40); // 动态输入框高度
    const [hasRequestedChatList, setHasRequestedChatList] = useState(false); // 避免重复请求对话列表
    const [renameDialogOpen, setRenameDialogOpen] = useState(false); // 重命名对话框状态
    const [renamingChatId, setRenamingChatId] = useState(null); // 当前重命名的对话ID
    const [newChatTitle, setNewChatTitle] = useState(''); // 新的对话标题
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false); // 删除确认对话框状态
    const [deletingChatId, setDeletingChatId] = useState(null); // 当前删除的对话ID
    const [deletingChatTitle, setDeletingChatTitle] = useState(''); // 当前删除的对话标题
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false); // 设置对话框状态
    const [activeSettingTab, setActiveSettingTab] = useState('data'); // 当前活跃的设置标签

    const fileInputRef = useRef(null);
    const recognitionRef = useRef(null);
    const textareaRef = useRef(null);
    const chatListRef = useRef([]); // 保持chatList的最新引用

    // 自动滚动hook
    const {
        scrollRef,
        isAtBottom,
        scrollToBottom,
        disableAutoScroll
    } = useAutoScroll({
        smooth: true,
        content: messages
    });

    // WebSocket URL 构建（统一使用梦境分析的方式）
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/dream/assistant/`;

    // WebSocket 连接
    const {
        sendMessage,
        connectionState,
        lastMessage
    } = useWebSocket(wsUrl);

    // 处理 WebSocket 消息
    useEffect(() => {
        if (!lastMessage) return;

        const data = JSON.parse(lastMessage.data);

        switch (data.type) {
            case 'connection_established':
                setAiConfig(data.config);
                // 连接建立后主动请求对话列表
                if (!hasRequestedChatList) {
                    sendMessage(JSON.stringify({
                        type: 'get_chat_list'
                    }));
                    setHasRequestedChatList(true);
                }
                break;

            case 'chat_created':
                setCurrentChat({
                    id: data.chat_id,
                    title: data.title,
                    created_at: data.created_at
                });
                setChatList(prev => [{
                    id: data.chat_id,
                    title: data.title,
                    last_message: null,
                    updated_at: data.created_at
                }, ...prev]);

                // 如果是自动创建的对话，不显示通知（静默创建）
                // 移除所有创建对话的通知消息
                // if (!data.auto_created) {
                //     notification.success('新对话已创建');
                // }
                break;

            case 'chat_loaded':
                setCurrentChat({
                    id: data.chat_id,
                    title: data.title
                });
                setMessages(data.messages || []);

                // 如果是自动加载的对话，静默处理；如果是手动加载，可以显示通知
                // 移除所有加载对话的通知消息
                // if (!data.auto_loaded && data.messages && data.messages.length > 0) {
                //     notification.success('对话已加载');
                // }
                break;

            case 'message_received':
                break;

            case 'thinking':
                setIsTyping(true);
                break;

            case 'processing_node':
                setIsTyping(true);
                setMessages(prev => {
                    const newMessages = [...prev];
                    const statusIndex = newMessages.findIndex(m => m.isStatusMessage);
                    const statusMessage = {
                        id: 'status_' + Date.now(),
                        role: 'system',
                        content: data.message,
                        timestamp: new Date().toISOString(),
                        isStatusMessage: true
                    };

                    if (statusIndex >= 0) {
                        newMessages[statusIndex] = statusMessage;
                    } else {
                        newMessages.push(statusMessage);
                    }
                    return newMessages;
                });
                break;

            case 'response_start':
                setIsTyping(false);
                setMessages(prev => {
                    const newMessages = prev.filter(m => !m.isStatusMessage);
                    newMessages.push({
                        id: data.message_id,
                        role: 'assistant',
                        content: data.content,
                        timestamp: new Date().toISOString(),
                        isStreaming: true
                    });
                    return newMessages;
                });
                break;

            case 'response_chunk':
                setMessages(prev => {
                    const newMessages = [...prev];
                    const message = newMessages.find(m => m.id === data.message_id);
                    if (message) {
                        message.content += data.content;
                    }
                    return newMessages;
                });
                break;

            case 'response_complete':
                setIsTyping(false);
                setMessages(prev => {
                    const newMessages = prev.filter(m => !m.isStatusMessage);
                    const message = newMessages.find(m => m.id === data.message_id);
                    if (message) {
                        message.content = data.content;
                        message.isStreaming = false;
                        if (data.image_url) {
                            message.image_url = data.image_url;
                        }
                        if (data.interpretation) {
                            message.interpretation = data.interpretation;
                        }
                        if (data.metadata) {
                            message.metadata = data.metadata;
                        }
                    } else {
                        newMessages.push({
                            id: data.message_id,
                            role: 'assistant',
                            content: data.content,
                            timestamp: new Date().toISOString(),
                            image_url: data.image_url,
                            interpretation: data.interpretation,
                            metadata: data.metadata
                        });
                    }
                    return newMessages;
                });
                break;

            case 'error':
                notification.error(data.message);
                setIsTyping(false);
                break;

            case 'memory_saved':
                notification.success(t('assistant.memorySaved', '记忆已保存'));
                break;

            case 'chat_list':
                setChatList(data.chats || []);
                // 注意：不要在收到空列表时重置请求标志，避免在 0 会话时反复请求导致循环
                // 这里保持 hasRequestedChatList 的状态不变，由连接建立或显式操作触发请求
                break;

            case 'title_generated':
                // 更新当前对话标题
                setCurrentChat(prev => {
                    if (prev && prev.id === data.chat_id) {
                        return {
                            ...prev,
                            title: data.new_title
                        };
                    }
                    return prev;
                });

                // 更新聊天列表中的对话标题
                setChatList(prev => prev.map(chat =>
                    chat.id === data.chat_id
                        ? { ...chat, title: data.new_title }
                        : chat
                ));

                // 可选：显示标题生成成功的提示
                // notification.success('对话标题已自动生成');
                break;

            case 'chat_renamed':
                // 更新当前对话标题（如果是当前对话）
                setCurrentChat(prev =>
                    prev && prev.id === data.chat_id
                        ? { ...prev, title: data.new_title }
                        : prev
                );

                // 更新聊天列表中的对话标题
                setChatList(prev => prev.map(chat =>
                    chat.id === data.chat_id
                        ? { ...chat, title: data.new_title }
                        : chat
                ));

                notification.success(t('assistant.chatRenamed', '对话已重命名'));
                setRenameDialogOpen(false);
                break;

            case 'chat_deleted':
                // 从聊天列表中移除已删除的对话
                setChatList(prev => prev.filter(chat => chat.id !== data.chat_id));
                notification.success(t('common.success.deleted', '对话已删除'));
                break;

            case 'chat_closed':
                // 当前对话被删除，清空消息
                setMessages([]);
                setCurrentChat(null);
                break;

            case 'all_chats_deleted':
                // 所有对话被删除，清空所有状态
                setChatList([]);
                setMessages([]);
                setCurrentChat(null);
                notification.success(data.message);
                break;
        }
    }, [lastMessage]); // 移除currentChat依赖，避免无限循环

    // 同步chatListRef以避免依赖项问题
    useEffect(() => {
        chatListRef.current = chatList;
    }, [chatList]);

    // 监听连接状态变化，确保重连后也能加载对话列表
    useEffect(() => {
        if (connectionState === 'Connected' && chatList.length === 0 && !hasRequestedChatList) {
            // 连接建立且对话列表为空且未请求过时，请求对话列表
            sendMessage(JSON.stringify({
                type: 'get_chat_list'
            }));
            setHasRequestedChatList(true);
        }
    }, [connectionState, chatList.length, hasRequestedChatList, sendMessage]);

    // 创建新对话
    const createNewChat = useCallback(() => {
        sendMessage(JSON.stringify({
            type: 'create_chat',
            title: t('assistant.newChatTitle', '新对话')
        }));
        setMessages([]);
    }, [sendMessage, t]);

    // 加载对话 - 使用useCallback优化性能
    const loadChat = useCallback((chatId) => {
        sendMessage(JSON.stringify({
            type: 'load_chat',
            chat_id: chatId
        }));
    }, [sendMessage]);

    // 重命名对话 - 打开重命名对话框
    const handleRenameChat = useCallback((chatId) => {
        // 说明：从下拉菜单中直接打开模态在部分环境下会与焦点/可交互性产生冲突
        // 这里延迟到下一个事件循环再打开，以确保下拉菜单先完整关闭（React 19 推荐的避免焦点竞争方式）
        const chat = chatListRef.current.find(c => c.id === chatId);
        if (!chat) return;

        setRenamingChatId(chatId);
        setNewChatTitle(chat.title || "");

        // 延迟到下一个 tick 再打开对话框，避免与 Dropdown 的焦点管理冲突导致整页不可交互
        setTimeout(() => setRenameDialogOpen(true), 0);
    }, []); // 使用ref避免重渲染

    // 确认重命名
    const confirmRename = useCallback(() => {
        if (!renamingChatId || !newChatTitle.trim()) {
            notification.error(t('assistant.error.invalidTitle', '请输入有效的对话标题'));
            return;
        }

        if (newChatTitle.length > 100) {
            notification.error(t('assistant.error.titleTooLong', '对话标题不能超过100个字符'));
            return;
        }

        sendMessage(JSON.stringify({
            type: 'rename_chat',
            chat_id: renamingChatId,
            new_title: newChatTitle.trim()
        }));
    }, [renamingChatId, newChatTitle, sendMessage]);

    // 删除对话 - 打开删除确认对话框
    const handleDeleteChat = useCallback((chatId) => {
        const chat = chatListRef.current.find(c => c.id === chatId);
        if (chat) {
            setDeletingChatId(chatId);
            setDeletingChatTitle(chat.title);
            setDeleteDialogOpen(true);
        }
    }, []); // 移除chatList依赖，使用ref避免重渲染

    // 确认删除单个对话
    const confirmDeleteChat = useCallback(() => {
        if (deletingChatId) {
            sendMessage(JSON.stringify({
                type: 'delete_chat',
                chat_id: deletingChatId
            }));
            setDeleteDialogOpen(false);
        }
    }, [deletingChatId, sendMessage]);

    // 删除全部对话
    const handleDeleteAllChats = useCallback(() => {
        sendMessage(JSON.stringify({
            type: 'delete_all_chats'
        }));
        setSettingsDialogOpen(false);
    }, [sendMessage]);

    // 发送消息 - 使用useCallback优化性能
    const handleSendMessage = useCallback(() => {
        if (!inputMessage.trim() && selectedImages.length === 0) {
            notification.error(t('assistant.error.emptyMessage', '消息内容不能为空，请输入文字或选择图片'));
            return;
        }

        // 检查WebSocket连接状态
        if (connectionState !== 'Connected') {
            notification.error(t('assistant.error.connectionLost', '网络连接中断，请稍后重试'));
            return;
        }

        // 检查是否有当前对话
        if (!currentChat) {
            notification.error(t('assistant.error.chatStateError', '对话状态异常，请刷新页面重试'));
            return;
        }

        const userMessage = {
            id: `temp_${Date.now()}`,
            role: 'user',
            content: inputMessage,
            images: selectedImages,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);

        sendMessage(JSON.stringify({
            type: 'message',
            content: inputMessage,
            images: selectedImages
        }));

        setInputMessage('');
        setSelectedImages([]);
    }, [inputMessage, selectedImages, currentChat, sendMessage, connectionState]);

    // 语音输入 - 使用useCallback优化性能
    const startVoiceInput = useCallback(() => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            notification.error(t('assistant.error.voiceNotSupported', '您的浏览器不支持语音输入'));
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!recognitionRef.current) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.lang = 'zh-CN';
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                setInputMessage(transcript);
            };

            recognitionRef.current.onerror = (event) => {
                notification.error(t('assistant.error.voiceRecognitionError', '语音识别错误: ') + event.error);
                setIsRecording(false);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        }

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            recognitionRef.current.start();
            setIsRecording(true);
        }
    }, [isRecording]);

    // 图片选择 - 使用useCallback优化性能
    const handleImageSelect = useCallback((e) => {
        const files = Array.from(e.target.files);
        const imageUrls = files.map(file => URL.createObjectURL(file));
        setSelectedImages(prev => [...prev, ...imageUrls]);
    }, []);

    // 动态调整输入框高度
    const adjustTextareaHeight = useCallback(() => {
        if (textareaRef.current) {
            const textarea = textareaRef.current;
            // 重置高度以获取正确的scrollHeight
            textarea.style.height = '40px';

            // 计算新高度，最小40px，最大300px（约15行）
            const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 300);
            setInputHeight(newHeight);
            textarea.style.height = `${newHeight}px`;
        }
    }, []);

    // 监听输入内容变化调整高度
    useLayoutEffect(() => {
        adjustTextareaHeight();
    }, [inputMessage, adjustTextareaHeight]);

    // 过滤聊天列表 - 使用useMemo优化性能
    const filteredChats = useMemo(() => {
        if (!searchQuery.trim()) return chatList;
        return chatList.filter(chat =>
            chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [chatList, searchQuery]);

    // 检查当前对话是否有非系统消息历史
    const hasMessageHistory = useMemo(() =>
        messages.some(msg => msg.role !== 'system'),
        [messages]
    );

    return (
        <div className="fixed top-[60px] left-0 right-0 bottom-0 flex bg-background overflow-hidden">
            {/* 左侧边栏 - 对话列表 */}
            <div className="w-72 border-r flex flex-col bg-muted/30 relative">
                {/* 固定头部 */}
                <div className="p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="grid grid-cols-1 gap-2">
                        {/* 搜索框 */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                            <Input
                                placeholder={t('assistant.search.placeholder', '搜索对话...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 bg-muted/30 border border-muted-foreground/15 rounded-lg placeholder:text-muted-foreground/60 focus:border-muted-foreground/30 focus:ring-1 focus:ring-muted-foreground/20 transition-all duration-200"
                            />
                        </div>

                        {/* 新建对话按钮 - 始终统一为卡片样式 */}
                        <Button
                            onClick={createNewChat}
                            disabled={!hasMessageHistory}
                            variant="outline"
                            className={`w-full h-10 justify-center rounded-lg border-dashed ${!hasMessageHistory ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-sm'}`}
                            title={hasMessageHistory ? t('assistant.button.newChat', '发起新对话') : t('assistant.button.sendFirstMessage', '请先发送消息后再创建新对话')}
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            {t('assistant.button.newChat', '发起新对话')}
                        </Button>
                    </div>
                </div>

                {/* 可滚动的聊天历史 */}
                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-2">
                            <ChatList
                                chats={filteredChats}
                                currentChatId={currentChat?.id}
                                onSelectChat={loadChat}
                                onRenameChat={handleRenameChat}
                                onDeleteChat={handleDeleteChat}
                            />
                        </div>
                    </ScrollArea>
                </div>

                {/* 底部设置和状态区域 */}
                <div className="border-t p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    {/* 连接状态 */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${connectionState === 'Connected'
                                ? 'bg-green-500'
                                : connectionState === 'Connecting'
                                    ? 'bg-yellow-500 animate-pulse'
                                    : 'bg-red-500'
                                }`} />
                            <span className="text-xs text-muted-foreground">
                                {connectionState === 'Connected'
                                    ? t('assistant.connection.connected', '已连接')
                                    : connectionState === 'Connecting'
                                        ? t('assistant.connection.connecting', '连接中')
                                        : t('assistant.connection.failed', '连接失败')
                                }
                            </span>
                        </div>

                        {/* 设置按钮 */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-white/10"
                            onClick={() => {
                                setActiveSettingTab('data'); // 打开即进入数据管理
                                setSettingsDialogOpen(true);
                            }}
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* 主聊天区域 */}
            <div className="flex-1 flex flex-col min-w-0 relative">


                {/* 消息区域 - 居中显示，与边界保持距离 */}
                <div className="flex-1 relative">
                    <div
                        ref={scrollRef}
                        className="absolute inset-0 overflow-y-auto will-change-scroll"
                        style={{ containIntrinsicSize: 'none' }}
                        onWheel={disableAutoScroll}
                        onTouchMove={disableAutoScroll}
                    >
                        <div className="max-w-5xl mx-auto px-6 py-4">
                            {messages.length === 0 ? (
                                <div className="flex items-center justify-center h-[calc(100vh-200px)] text-muted-foreground">
                                    <div className="text-center">
                                        <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p className="text-lg font-medium">{t('assistant.welcome.title', '开始您的梦境探索之旅')}</p>
                                        <p className="text-sm mt-2">{t('assistant.welcome.subtitle', '描述您的梦境，或询问梦境相关知识')}</p>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="space-y-6"
                                    style={{
                                        paddingBottom: `${Math.max(inputHeight + 120, 180)}px`
                                    }}
                                >
                                    {messages.map((message, index) => (
                                        <MessageBubble
                                            key={message.id || `message-${index}`}
                                            message={message}
                                            isUser={message.role === 'user'}
                                        />
                                    ))}
                                    {isTyping && (
                                        <div className="flex items-center gap-2 text-muted-foreground ml-12">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>{t('assistant.thinking', '正在思考...')}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 滚动到底部按钮 */}
                    {!isAtBottom && (
                        <Button
                            onClick={scrollToBottom}
                            size="icon"
                            variant="outline"
                            className="absolute left-1/2 transform -translate-x-1/2 rounded-full shadow-md z-10 bg-background/90 backdrop-blur"
                            style={{
                                bottom: `${Math.max(inputHeight + 80, 140)}px`
                            }}
                            aria-label="滚动到底部"
                        >
                            <ArrowDown className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* 悬浮输入区域 - 相对右侧区域居中 */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-4xl z-20">
                    {/* 图片预览区域 */}
                    {selectedImages.length > 0 && (
                        <div className="mb-3">
                            <Card className="p-3 bg-background/90 backdrop-blur border rounded-xl">
                                <div className="flex gap-2 flex-wrap">
                                    {selectedImages.map((url, index) => (
                                        <div key={index} className="relative">
                                            <img
                                                src={url}
                                                alt={t('assistant.image.selectedAlt', 'Selected {index}').replace('{index}', index + 1)}
                                                className="h-14 w-14 object-cover rounded-lg border"
                                            />
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="absolute -top-1 -right-1 h-4 w-4 p-0 rounded-full text-xs"
                                                onClick={() => {
                                                    setSelectedImages(prev => prev.filter((_, i) => i !== index));
                                                }}
                                            >
                                                ×
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    )}

                    <Card className="shadow-2xl border border-muted-foreground/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 rounded-2xl overflow-hidden">
                        {/* 文本输入区域 */}
                        <div className="px-4 py-2 bg-inherit dark:bg-inherit">
                            <Textarea
                                ref={textareaRef}
                                value={inputMessage}
                                onChange={(e) => {
                                    setInputMessage(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={t('assistant.input.placeholder', '请向梦境助手提问吧...')}
                                className="w-full border-0 resize-none bg-transparent dark:bg-transparent focus-visible:ring-0 shadow-none p-0 text-base leading-relaxed placeholder:text-base md:text-base"
                                style={{
                                    height: `${inputHeight}px`,
                                    minHeight: '40px',
                                    maxHeight: '300px',
                                    overflowY: inputHeight >= 300 ? 'auto' : 'hidden'
                                }}
                            />
                        </div>

                        {/* 功能按钮区域 */}
                        <div className="bg-muted/10 px-1 py-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-9 w-9 p-0 rounded-full hover:bg-accent transition-colors"
                                        title={t('assistant.button.uploadImage', '上传图片')}
                                    >
                                        <ImageIcon className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={startVoiceInput}
                                        className={`h-9 w-9 p-0 rounded-full transition-colors ${isRecording ? 'text-red-500 bg-red-100 dark:bg-red-900/20' : 'hover:bg-accent'
                                            }`}
                                        title={t('assistant.button.voiceInput', '语音输入')}
                                    >
                                        <Mic className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* 发送按钮 - 位于功能工具栏右下角 */}
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={
                                        (!inputMessage.trim() && selectedImages.length === 0) ||
                                        connectionState !== 'Connected'
                                    }
                                    size="sm"
                                    className={`h-10 w-10 p-0 rounded-full transition-all duration-200 ${(!inputMessage.trim() && selectedImages.length === 0) ||
                                        connectionState !== 'Connected'
                                        ? 'opacity-40 cursor-not-allowed'
                                        : 'hover:scale-105 shadow-lg hover:shadow-xl'
                                        }`}
                                    title={t('assistant.button.sendMessage', '发送消息')}
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageSelect}
                    />
                </div>
            </div>

            {/* 重命名对话框 */}
            <Dialog
                open={renameDialogOpen}
                onOpenChange={(open) => {
                    // 关闭时清理状态，避免残留导致界面不可交互
                    if (!open) {
                        setTimeout(() => {
                            setRenamingChatId(null);
                            setNewChatTitle('');
                        }, 0);
                    }
                    setRenameDialogOpen(open);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('assistant.rename.dialogTitle', '重命名对话')}</DialogTitle>
                        <DialogDescription>
                            {t('assistant.rename.title', '为对话输入一个新的标题')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            value={newChatTitle}
                            onChange={(e) => setNewChatTitle(e.target.value)}
                            placeholder={t('assistant.rename.placeholder', '输入对话标题')}
                            maxLength={100}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    confirmRename();
                                }
                            }}
                        />
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setRenameDialogOpen(false)}
                            >
                                {t('common.cancel', '取消')}
                            </Button>
                            <Button
                                onClick={confirmRename}
                                disabled={!newChatTitle.trim()}
                            >
                                {t('common.confirm', '确定')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 删除确认对话框 */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('assistant.delete.dialogTitle', '删除对话')}</DialogTitle>
                        <DialogDescription>
                            {t('assistant.delete.confirmation', '确定要删除这个对话吗？此操作无法撤销。')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium">"{deletingChatTitle}"</p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteDialogOpen(false)}
                            >
                                {t('common.cancel', '取消')}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDeleteChat}
                            >
                                {t('common.delete', '删除')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 设置模态框 */}
            <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] p-0">
                    <DialogHeader className="sr-only">
                        <DialogTitle>{t('common.settings', '设置')}</DialogTitle>
                        <DialogDescription>
                            {t('assistant.settings.description', '配置AI助手设置')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex h-[75vh]">
                        {/* 左侧导航菜单 */}
                        <div className="w-64 border-r bg-muted/30 flex flex-col">
                            <div className="p-6 border-b">
                                <DialogTitle className="flex items-center gap-2 text-lg">
                                    <Settings className="h-5 w-5" />
                                    {t('common.settings', '设置')}
                                </DialogTitle>
                            </div>

                            <nav className="flex-1 p-4">
                                <div className="space-y-1">
                                    {[
                                        { id: 'personalize', label: t('assistant.settings.personalizeTab', '个性化'), icon: Palette },
                                        { id: 'data', label: t('assistant.settings.dataTab', '数据管理'), icon: Database },
                                        { id: 'security', label: t('assistant.settings.securityTab', '安全'), icon: Shield },
                                        { id: 'help', label: t('assistant.settings.helpTab', '帮助'), icon: HelpCircle }
                                    ].map(({ id, label, icon: Icon }) => (
                                        <button
                                            key={id}
                                            onClick={() => setActiveSettingTab(id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left ${activeSettingTab === id
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'hover:bg-accent text-muted-foreground hover:text-accent-foreground'
                                                }`}
                                        >
                                            <Icon className="h-4 w-4 flex-shrink-0" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </nav>
                        </div>

                        {/* 右侧内容区域 */}
                        <div className="flex-1 flex flex-col">
                            {/* 内容标题栏 */}
                            <div className="p-6 border-b">
                                <h3 className="text-lg font-medium">
                                    {activeSettingTab === 'personalize' && t('assistant.settings.personalizeTab', '个性化')}
                                    {activeSettingTab === 'data' && t('assistant.settings.dataTab', '数据管理')}
                                    {activeSettingTab === 'security' && t('assistant.settings.securityTab', '安全')}
                                    {activeSettingTab === 'help' && t('assistant.settings.helpTab', '帮助')}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {activeSettingTab === 'personalize' && t('assistant.settings.personalize', '自定义AI助手的行为和偏好')}
                                    {activeSettingTab === 'data' && t('assistant.settings.data', '管理您的对话数据和导出选项')}
                                    {activeSettingTab === 'security' && t('assistant.settings.security', '隐私和安全相关设置')}
                                    {activeSettingTab === 'help' && t('assistant.settings.help', '获取帮助和支持信息')}
                                </p>
                            </div>

                            {/* 内容区域 */}
                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-6">
                                    {activeSettingTab === 'personalize' && (
                                        <div className="space-y-6">
                                            <AIConfigPanel
                                                config={aiConfig}
                                                onUpdate={(newConfig) => {
                                                    setAiConfig(newConfig);
                                                    notification.success(t('common.success.settingsUpdated', '设置已更新'));
                                                }}
                                            />
                                        </div>
                                    )}

                                    {activeSettingTab === 'data' && (
                                        <div className="space-y-4">
                                            {/* 删除所有对话 */}
                                            <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 dark:border-red-800">
                                                <div className="flex items-center gap-3">
                                                    <Trash2 className="h-5 w-5 text-red-600" />
                                                    <div>
                                                        <p className="font-medium">{t('assistant.deleteAll.title', '删除所有对话')}</p>
                                                        <p className="text-sm text-muted-foreground">{t('assistant.deleteAll.description', '清空所有聊天记录，无法恢复')}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 border-red-300 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20"
                                                    onClick={() => {
                                                        if (chatList.length === 0) {
                                                            notification.info(t('assistant.deleteAll.noChats', '没有对话可删除'));
                                                            return;
                                                        }
                                                        const confirmed = window.confirm(
                                                            t('assistant.deleteAll.confirmation', '确定要删除所有 {count} 个对话吗？此操作无法撤销！', { count: chatList.length })
                                                        );
                                                        if (confirmed) {
                                                            handleDeleteAllChats();
                                                        }
                                                    }}
                                                    disabled={chatList.length === 0}
                                                >
                                                    {t('assistant.deleteAll.button', '全部删除')}
                                                </Button>
                                            </div>

                                            {/* 导出数据 */}
                                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Download className="h-5 w-5 text-green-600" />
                                                    <div>
                                                        <p className="font-medium">{t('assistant.settings.dataExport', '导出数据')}</p>
                                                        <p className="text-sm text-muted-foreground">{t('assistant.settings.dataExportDescription', '导出您的对话记录')}</p>
                                                    </div>
                                                </div>
                                                <Button variant="outline" size="sm" disabled={chatList.length === 0}>{t('common.export', '导出')}</Button>
                                            </div>
                                        </div>
                                    )}

                                    {activeSettingTab === 'security' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Shield className="h-5 w-5 text-purple-600" />
                                                    <div>
                                                        <p className="font-medium">{t('assistant.settings.privacyTitle', '隐私与安全')}</p>
                                                        <p className="text-sm text-muted-foreground">{t('assistant.settings.privacy', '管理数据隐私设置')}</p>
                                                    </div>
                                                </div>
                                                <Button variant="outline" size="sm">{t('common.manage', '管理')}</Button>
                                            </div>
                                        </div>
                                    )}

                                    {activeSettingTab === 'help' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <HelpCircle className="h-5 w-5 text-orange-600" />
                                                    <div>
                                                        <p className="font-medium">{t('assistant.settings.helpAndSupport', '帮助与支持')}</p>
                                                        <p className="text-sm text-muted-foreground">{t('assistant.settings.helpAndSupportDescription', '查看使用指南和常见问题')}</p>
                                                    </div>
                                                </div>
                                                <Button variant="outline" size="sm">{t('common.viewDetails', '查看')}</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            {/* 底部按钮 */}
                            <div className="p-6 border-t">
                                <div className="flex justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={() => setSettingsDialogOpen(false)}
                                    >
                                        {t('common.close', '关闭')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DreamAssistant;
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, MoreVertical } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ChatList = ({ chats, currentChatId, onSelectChat, onDeleteChat, onRenameChat }) => {
    if (chats.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无对话</p>
                <p className="text-xs mt-1">创建新对话开始聊天</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {chats.map((chat) => (
                <div
                    key={chat.id}
                    className={`
                        group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer
                        transition-all duration-200 hover:bg-accent/80
                        ${currentChatId === chat.id ? 'bg-accent border border-border' : 'hover:border-transparent'}
                    `}
                    onClick={() => onSelectChat(chat.id)}
                >
                    <MessageCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />

                    <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate leading-tight">
                            {chat.title}
                        </h4>
                    </div>

                    {(onDeleteChat || onRenameChat) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="bottom">
                                {onRenameChat && (
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRenameChat(chat.id);
                                        }}
                                    >
                                        重命名
                                    </DropdownMenuItem>
                                )}
                                {onDeleteChat && (
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteChat(chat.id);
                                        }}
                                    >
                                        删除
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ChatList;

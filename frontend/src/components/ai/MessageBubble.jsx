import React, { useState, memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, User, Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

const MessageBubble = ({ message, isUser }) => {
    const [copied, setCopied] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // 处理系统状态消息
    if (message.isStatusMessage) {
        return (
            <div className="flex justify-center my-2">
                <div className="bg-muted px-3 py-1 rounded-full text-sm text-muted-foreground flex items-center gap-2">
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                    {message.content}
                </div>
            </div>
        );
    }

    // 用户消息：显示在泡泡框中
    if (isUser) {
        return (
            <div className="group flex gap-3 max-w-4xl flex-row-reverse ml-auto">
                <Avatar className="flex-shrink-0 h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                        <User className="h-4 w-4" />
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 text-right">
                    <div className="inline-block max-w-[85%] p-3 rounded-2xl relative bg-primary text-primary-foreground ml-auto">
                        {/* 消息内容 */}
                        <div className="prose prose-sm max-w-none prose-invert">
                            <ReactMarkdown
                                components={{
                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                    em: ({ children }) => <em className="italic">{children}</em>,
                                    code: ({ children, ...props }) => (
                                        <span className="px-1.5 py-0.5 rounded text-sm font-mono bg-primary-foreground/20" {...props}>
                                            {children}
                                        </span>
                                    ),
                                    pre: ({ children }) => (
                                        <div className="p-3 rounded-lg text-sm font-mono overflow-x-auto bg-primary-foreground/20">
                                            {children}
                                        </div>
                                    ),
                                    h1: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2 first:mt-0">{children}</h2>,
                                    h2: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-2 first:mt-0">{children}</h3>,
                                    h3: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h4>,
                                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                                    li: ({ children }) => <li className="text-sm">{children}</li>,
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 pl-4 py-2 italic border-primary-foreground/30">
                                            {children}
                                        </blockquote>
                                    ),
                                }}
                                allowedElements={[
                                    'p', 'br', 'strong', 'em', 'u', 'del',
                                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                                    'ul', 'ol', 'li', 'blockquote',
                                    'code', 'pre'
                                ]}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>

                        {/* 图片展示 */}
                        {message.images && message.images.length > 0 && (
                            <div className="mt-3 flex gap-2 flex-wrap">
                                {message.images.map((url, index) => (
                                    <img
                                        key={index}
                                        src={url}
                                        alt={`Attachment ${index + 1}`}
                                        className="max-w-[200px] max-h-[200px] rounded-lg cursor-pointer hover:opacity-90"
                                        onClick={() => window.open(url, '_blank')}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // AI消息：直接展示，不用泡泡框
    return (
        <div className="group flex gap-3 max-w-4xl mr-auto">
            <Avatar className="flex-shrink-0 h-8 w-8">
                <AvatarImage src="/logo.svg" />
                <AvatarFallback className="bg-green-600 text-white">
                    <Bot className="h-4 w-4" />
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="relative">
                    {/* 流式状态指示器 */}
                    {message.isStreaming && (
                        <div className="absolute -top-1 -left-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                    )}

                    {/* 消息内容 - 直接展示，无背景框 */}
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown
                            components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                code: ({ children, ...props }) => (
                                    <span className="px-1.5 py-0.5 rounded text-sm font-mono bg-muted-foreground/20" {...props}>
                                        {children}
                                    </span>
                                ),
                                pre: ({ children }) => (
                                    <div className="p-3 rounded-lg text-sm font-mono overflow-x-auto bg-muted-foreground/20">
                                        {children}
                                    </div>
                                ),
                                h1: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2 first:mt-0">{children}</h2>,
                                h2: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-2 first:mt-0">{children}</h3>,
                                h3: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h4>,
                                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                                li: ({ children }) => <li className="text-sm">{children}</li>,
                                blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 pl-4 py-2 italic border-muted-foreground/30">
                                        {children}
                                    </blockquote>
                                ),
                            }}
                            allowedElements={[
                                'p', 'br', 'strong', 'em', 'u', 'del',
                                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                                'ul', 'ol', 'li', 'blockquote',
                                'code', 'pre'
                            ]}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>

                    {/* AI 生成的图像 */}
                    {message.image_url && (
                        <div className="mt-3 relative group will-change-transform">
                            {/* 占位符 */}
                            {!imageLoaded && (
                                <div
                                    className="w-full h-48 rounded-lg animate-pulse bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60"
                                />
                            )}
                            {(() => {
                                const normalized = (typeof message.image_url === 'string' && message.image_url.startsWith('data:image'))
                                    ? message.image_url.replace(/\s/g, '')
                                    : message.image_url;
                                return (
                                    <>
                                        <img
                                            src={normalized}
                                            alt="Generated dream image"
                                            className={`max-w-full rounded-lg cursor-pointer hover:opacity-95 will-change-transform ${imageLoaded ? '' : 'hidden'}`}
                                            onLoad={() => setImageLoaded(true)}
                                            onClick={() => window.open(normalized, '_blank')}
                                            loading="lazy"
                                            decoding="async"
                                        />
                                        {imageLoaded && (
                                            <a
                                                href={normalized}
                                                download="dream_image.png"
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity will-change-transform"
                                                aria-label="下载图片"
                                            >
                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white shadow-md hover:bg-black/70">
                                                    <Download className="h-4 w-4" />
                                                </span>
                                            </a>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* 梦境解读展示 */}
                    {message.interpretation && (
                        <div className="mt-4 space-y-3">
                            {message.interpretation.psychological && (
                                <div>
                                    <h4 className="font-semibold text-sm mb-1">🧠 心理学视角</h4>
                                    <p className="text-sm">{message.interpretation.psychological}</p>
                                </div>
                            )}
                            {message.interpretation.symbolic && (
                                <div>
                                    <h4 className="font-semibold text-sm mb-1">🔮 象征学解读</h4>
                                    <p className="text-sm">{message.interpretation.symbolic}</p>
                                </div>
                            )}
                            {message.interpretation.key_elements && message.interpretation.key_elements.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-sm mb-1">🔑 关键元素</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        {message.interpretation.key_elements.map((element, index) => (
                                            <span
                                                key={index}
                                                className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
                                            >
                                                {element}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 操作按钮 */}
                {!message.isStreaming && (
                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={copyToClipboard}
                            className="h-7 px-2 text-xs"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-3 w-3 mr-1" />
                                    已复制
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3 w-3 mr-1" />
                                    复制
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(MessageBubble);

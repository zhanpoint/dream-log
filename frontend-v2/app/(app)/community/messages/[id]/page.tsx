"use client";

import { type ChangeEvent, type ClipboardEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DreamerLevelBadge } from "@/components/community/dreamer-level-badge";
import { UserAvatar } from "@/components/user-avatar";
import { dmAPI, type DmConversationOut, type DmMessageOut } from "@/lib/dm-api";
import { AuthUser } from "@/lib/auth-api";
import { ArrowLeft, Copy, Download, Image as ImageIcon, MoreHorizontal, Send, X } from "lucide-react";
import { differenceInMinutes, format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function MessageBubble({
  msg,
  isOwn,
  showTime,
  selfAvatar,
  otherAvatar,
  selfName,
  otherName,
  selfUserId,
  otherUserId,
  onImageClick,
  onImageError,
  onImageCopy,
  onImageDownload,
}: {
  msg: DmMessageOut;
  isOwn: boolean;
  showTime: boolean;
  selfAvatar?: string | null;
  otherAvatar?: string | null;
  selfName?: string | null;
  otherName?: string | null;
  selfUserId?: string;
  otherUserId?: string;
  onImageClick?: (msg: DmMessageOut) => void;
  onImageError?: (msg: DmMessageOut) => void;
  onImageCopy?: (msg: DmMessageOut) => void;
  onImageDownload?: (msg: DmMessageOut) => void;
}) {
  const createdAt = new Date(msg.created_at);
  const time = isToday(createdAt)
    ? format(createdAt, "HH:mm")
    : isYesterday(createdAt)
      ? `昨天 ${format(createdAt, "HH:mm")}`
      : format(createdAt, "M月d日 HH:mm");

  return (
    <div className={cn("space-y-1", showTime ? "pt-1" : "pt-0")}>
      {showTime && (
        <div className="flex justify-center mb-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400/80">{time}</span>
        </div>
      )}
      <div className={cn("flex gap-2 items-start", isOwn && "flex-row-reverse")}>
        <Link
          href={isOwn ? (selfUserId ? `/community/users/${selfUserId}` : "/community/messages") : (otherUserId ? `/community/users/${otherUserId}` : "/community/messages")}
          className="flex-shrink-0"
          aria-label={isOwn ? "查看我的资料" : "查看对方资料"}
        >
          <UserAvatar
            userId={isOwn ? "self" : "other"}
            avatar={isOwn ? selfAvatar : otherAvatar}
            username={isOwn ? selfName : otherName}
            size="sm"
            className="transition-transform duration-200 hover:scale-105"
          />
        </Link>
        <div className={cn("max-w-[75%]", isOwn && "items-end flex flex-col")}>
          <div
            className={cn(
              "rounded-lg text-sm leading-5 break-words",
              msg.content_type === "image" ? "bg-transparent p-0" : "px-3 py-1",
              msg.content_type === "image"
                ? "text-inherit"
                : isOwn
                  ? "bg-blue-500 text-white"
                  : "bg-slate-200 text-slate-900 dark:bg-[#3a3f4d] dark:text-slate-100"
            )}
          >
            {msg.content_type === "image" && msg.media_url ? (
              <div className="space-y-1">
                <div className="group relative inline-block rounded-xl overflow-hidden ring-1 ring-black/5 bg-black/5">
                  <button
                    type="button"
                    onClick={() => onImageClick?.(msg)}
                    className="block"
                    aria-label="查看图片"
                  >
                    <img
                      src={msg.media_url}
                      alt={msg.content || "私聊图片"}
                      className="max-w-[min(58vw,320px)] h-auto max-h-[380px] object-contain"
                      onError={() => onImageError?.(msg)}
                    />
                  </button>

                  <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="h-7 w-7 rounded-md bg-black/60 text-white flex items-center justify-center hover:bg-black/75"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageDownload?.(msg);
                      }}
                      title="下载"
                      aria-label="下载图片"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="h-7 w-7 rounded-md bg-black/60 text-white flex items-center justify-center hover:bg-black/75"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageCopy?.(msg);
                      }}
                      title="复制"
                      aria-label="复制图片"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {msg.content && msg.content !== "[图片]" ? <p className="text-xs opacity-90">{msg.content}</p> : null}
              </div>
            ) : (
              msg.content
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DmDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof AuthUser.get>>(null);
  const [conv, setConv] = useState<DmConversationOut | null>(null);
  const [messages, setMessages] = useState<DmMessageOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<Array<{ id: string; file: File; previewUrl: string }>>([]);
  const [previewImage, setPreviewImage] = useState<DmMessageOut | null>(null);
  const outgoingQueueRef = useRef<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [convList, msgData] = await Promise.all([dmAPI.getConversations(), dmAPI.getMessages(id)]);
      const found = convList.find((c) => c.id === id) ?? null;
      setConv(found);
      setMessages(msgData.items);
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setMounted(true);
    setCurrentUser(AuthUser.get());
  }, []);

  useEffect(() => {
    if (!mounted || !currentUser) {
      setLoading(false);
      return;
    }
    loadData();
  }, [mounted, currentUser, loadData]);

  useEffect(() => {
    if (!mounted || !currentUser || !id) return;

    let isActive = true;

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const closeSocket = () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };

    const connect = () => {
      clearReconnect();
      closeSocket();

      const ws = dmAPI.connectConversationWs(id, {
        onOpen: () => {
          reconnectAttemptRef.current = 0;
        },
        onClose: () => {
          if (!isActive) return;
          const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, 10000);
          reconnectAttemptRef.current += 1;
          reconnectTimerRef.current = setTimeout(connect, delay);
        },
        onError: () => {
          // rely on onClose reconnect
        },
        onEvent: (event) => {
          if (event.type !== "message:new" || event.conversation_id !== id) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === event.message.id)) return prev;

            const isOwnEvent = !!currentUser && event.message.sender_id === currentUser.id;
            if (isOwnEvent && outgoingQueueRef.current.length > 0) {
              const optimisticId = outgoingQueueRef.current.shift();
              if (optimisticId) {
                const idx = prev.findIndex((m) => m.id === optimisticId);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = event.message;
                  return next;
                }
              }
            }

            return [...prev, event.message];
          });
        },
      });

      wsRef.current = ws;
    };

    connect();

    return () => {
      isActive = false;
      clearReconnect();
      closeSocket();
    };
  }, [id, mounted, currentUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      pendingImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [pendingImages]);

  const handleRefreshImageUrl = useCallback(async (message: DmMessageOut) => {
    if (!message.id) return;
    try {
      const refreshed = await dmAPI.refreshImageUrl(id, message.id);
      setMessages((prev) =>
        prev.map((item) => (item.id === message.id ? { ...item, media_url: refreshed.media_url } : item))
      );
      setPreviewImage((prev) => (prev?.id === message.id ? { ...prev, media_url: refreshed.media_url } : prev));
    } catch {
      toast.error("图片链接已过期，请稍后重试");
    }
  }, [id]);

  const validateImageFile = (file: File): boolean => {
    const allowTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowTypes.includes(file.type)) {
      toast.error("仅支持 jpg/png/webp/gif 图片");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("图片大小不能超过 10MB");
      return false;
    }
    return true;
  };

  const addPendingImage = (file: File) => {
    if (!validateImageFile(file)) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const previewUrl = URL.createObjectURL(file);
    setPendingImages((prev) => [...prev, { id, file, previewUrl }]);
  };

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const found = prev.find((item) => item.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearPendingImages = () => {
    setPendingImages((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  };

  const uploadAndSendImage = useCallback(async (file: File, imageCaption: string) => {
    const upload = await dmAPI.uploadImage(id, file);
    await dmAPI.sendMessage(id, {
      content: imageCaption,
      content_type: "image",
      media_url: upload.object_key,
    });
  }, [id]);

  const handleSend = async () => {
    if (sending || uploadingImage || !currentUser) return;
    const text = input.trim();
    const hasImages = pendingImages.length > 0;

    if (!text && !hasImages) return;

    const now = new Date().toISOString();
    const createdOptimisticIds: string[] = [];

    const buildOptimisticMessage = (payload: {
      content: string;
      content_type: "text" | "image";
      media_url?: string;
    }): DmMessageOut => {
      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      createdOptimisticIds.push(optimisticId);
      outgoingQueueRef.current.push(optimisticId);

      return {
        id: optimisticId,
        conversation_id: id,
        sender_id: currentUser.id,
        content: payload.content,
        content_type: payload.content_type,
        media_url: payload.media_url,
        created_at: now,
      };
    };

    const optimisticMessages: DmMessageOut[] = [];
    for (const item of pendingImages) {
      optimisticMessages.push(
        buildOptimisticMessage({
          content: "[图片]",
          content_type: "image",
          media_url: item.previewUrl,
        })
      );
    }
    if (text) {
      optimisticMessages.push(buildOptimisticMessage({ content: text, content_type: "text" }));
    }

    if (optimisticMessages.length) {
      setMessages((prev) => [...prev, ...optimisticMessages]);
    }

    setInput("");
    clearPendingImages();
    inputRef.current?.focus();

    setSending(true);
    setUploadingImage(hasImages);
    try {
      for (const item of pendingImages) {
        await uploadAndSendImage(item.file, "");
      }

      if (text) {
        await dmAPI.sendMessage(id, { content: text });
      }
    } catch (err: unknown) {
      const failedSet = new Set(createdOptimisticIds);
      outgoingQueueRef.current = outgoingQueueRef.current.filter((msgId) => !failedSet.has(msgId));
      setMessages((prev) => prev.filter((m) => !failedSet.has(m.id)));

      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "发送失败");
    } finally {
      setSending(false);
      setUploadingImage(false);
    }
  };

  const handlePickImage = () => {
    imageInputRef.current?.click();
  };

  const handleSelectImage = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.currentTarget.value = "";
    if (!files.length || sending || uploadingImage) return;
    files.forEach(addPendingImage);
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItems = Array.from(e.clipboardData.items).filter((item) => item.type.startsWith("image/"));
    if (!imageItems.length || sending || uploadingImage) return;

    e.preventDefault();
    imageItems.forEach((item) => {
      const file = item.getAsFile();
      if (file) addPendingImage(file);
    });
  };

  const fetchImageBlobWithRefresh = useCallback(async (message: DmMessageOut): Promise<{ blob: Blob; url: string } | null> => {
    const tryFetch = async (url: string) => {
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (!blob.size) throw new Error("empty blob");
      return blob;
    };

    if (message.media_url) {
      try {
        const blob = await tryFetch(message.media_url);
        return { blob, url: message.media_url };
      } catch {
        // ignore, then refresh signed url
      }
    }

    try {
      const refreshed = await dmAPI.refreshImageUrl(id, message.id);
      setMessages((prev) =>
        prev.map((item) => (item.id === message.id ? { ...item, media_url: refreshed.media_url } : item))
      );
      setPreviewImage((prev) => (prev?.id === message.id ? { ...prev, media_url: refreshed.media_url } : prev));
      const blob = await tryFetch(refreshed.media_url);
      return { blob, url: refreshed.media_url };
    } catch {
      return null;
    }
  }, [id]);

  const handleImageDownload = async (message: DmMessageOut) => {
    const result = await fetchImageBlobWithRefresh(message);
    if (!result) return;

    try {
      const ext = result.blob.type.includes("png") ? "png" : result.blob.type.includes("webp") ? "webp" : result.blob.type.includes("gif") ? "gif" : "jpg";
      const objectUrl = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `dm-image-${message.id ?? Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // silent by request
    }
  };

  const handleImageCopy = async (message: DmMessageOut) => {
    const result = await fetchImageBlobWithRefresh(message);
    if (!result) return;

    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ [result.blob.type || "image/png"]: result.blob })]);
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.url);
      }
    } catch {
      // silent by request
    }
  };

  const handleBlock = async () => {
    if (!confirm("确认屏蔽此用户？屏蔽后对方将无法再向你发送消息。")) return;
    try {
      await dmAPI.blockConversation(id);
      toast.success("已屏蔽");
      router.push("/community/messages");
    } catch {
      toast.error("操作失败");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn("flex gap-2", i % 2 === 0 && "flex-row-reverse")}>
              <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
              <Skeleton className={cn("h-10 rounded-2xl", i % 2 === 0 ? "w-48" : "w-36")} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    router.push("/auth");
    return null;
  }

  const other = conv?.other_user;
  const otherId = other?.id ?? conv?.other_user_id ?? conv?.recipient_id;
  const otherUsername = other?.username ?? conv?.other_username ?? "未知用户";
  const otherAvatar = other?.avatar ?? conv?.other_avatar ?? null;
  const canSend = conv?.status !== "blocked";

  return (
    <div className="max-w-3xl w-full mx-auto flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      <div className="flex items-center gap-3 pl-2 pr-4 py-3 border-b border-border flex-shrink-0">
        <Link href="/community/messages">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-foreground/70 hover:text-foreground hover:bg-accent/70 dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        {loading ? (
          <Skeleton className="h-5 w-32" />
        ) : (
          <>
            <UserAvatar userId={otherId ?? "unknown"} avatar={otherAvatar} username={otherUsername} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  href={otherId ? `/community/users/${otherId}` : "/community/messages"}
                  className="text-sm font-semibold hover:text-primary transition-colors truncate"
                >
                  {otherUsername}
                </Link>
                {other?.dreamer_level && <DreamerLevelBadge level={other.dreamer_level} size="xs" />}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-foreground/70 hover:text-foreground hover:bg-accent/70 dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleBlock}>
                  屏蔽此用户
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn("flex gap-2", i % 2 === 0 && "flex-row-reverse")}>
                <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                <Skeleton className={cn("h-10 rounded-2xl", i % 2 === 0 ? "w-48" : "w-36")} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <span className="text-4xl mb-3">💌</span>
            <p className="text-sm">暂无消息</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const currTime = new Date(msg.created_at);
              const prevTime = prev ? new Date(prev.created_at) : null;
              const sameSender = prev ? prev.sender_id === msg.sender_id : false;
              const withinThreshold = prevTime ? differenceInMinutes(currTime, prevTime) < 5 : false;

              const showTime = !prev || !sameSender || !withinThreshold;
              const gapClass = showTime ? "mt-4" : "mt-3";

              return (
                <div key={msg.id} className={gapClass}>
                  <MessageBubble
                    msg={msg}
                    isOwn={msg.sender_id === currentUser.id}
                    showTime={showTime}
                    selfAvatar={currentUser.avatar}
                    otherAvatar={otherAvatar}
                    selfName={currentUser.username}
                    otherName={otherUsername}
                    selfUserId={currentUser.id}
                    otherUserId={otherId}
                    onImageClick={setPreviewImage}
                    onImageError={handleRefreshImageUrl}
                    onImageCopy={handleImageCopy}
                    onImageDownload={handleImageDownload}
                  />
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {previewImage?.media_url ? (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <button
            type="button"
            className="group absolute right-4 top-4 h-10 w-10 rounded-xl bg-black/55 text-white flex items-center justify-center transition-all duration-200 hover:bg-black/80 hover:scale-105 hover:-translate-y-0.5 active:scale-95"
            aria-label="关闭预览"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImage(null);
            }}
          >
            <X className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
          </button>
          <img
            src={previewImage.media_url}
            alt={previewImage.content || "私聊图片"}
            className="max-w-[92vw] max-h-[88vh] h-auto w-auto object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={() => handleRefreshImageUrl(previewImage)}
          />
        </div>
      ) : null}

      {pendingImages.length > 0 ? (
        <div className="px-4 pt-2 flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            {pendingImages.map((item) => (
              <div key={item.id} className="relative inline-block rounded-xl ring-1 ring-black/10 bg-black/5 p-1">
                <img src={item.previewUrl} alt="待发送图片" className="max-w-[130px] max-h-[130px] h-auto w-auto rounded-lg object-contain" />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center transition-all duration-200 hover:bg-black/90 hover:scale-105 active:scale-95 z-10"
                  onClick={() => removePendingImage(item.id)}
                  aria-label="移除待发送图片"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {conv?.status === "blocked" ? (
        <div className="px-4 py-3 border-t border-border bg-card flex-shrink-0 text-center">
          <p className="text-xs text-muted-foreground">此会话已被屏蔽</p>
        </div>
      ) : (
        <div className="flex items-end gap-2 px-4 py-2 mb-8 pb-2 flex-shrink-0">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleSelectImage}
          />
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="输入消息..."
            disabled={!canSend || sending || uploadingImage}
            maxLength={2000}
            rows={1}
            className={cn(
              "flex-1 text-sm bg-background border border-slate-400 dark:border-slate-500/80 rounded-xl px-3 py-2 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.22)] dark:shadow-none",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/55",
              "disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 resize-none overflow-hidden hover:border-slate-500 dark:hover:border-blue-400",
              "min-h-[32px]"
            )}
            style={{ height: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handlePickImage}
            disabled={!canSend || sending || uploadingImage}
            className="h-9 w-9 p-0 rounded-xl flex-shrink-0 border-slate-400 bg-background text-slate-700 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-500 dark:border-slate-500 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105"
            title="发送图片"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSend}
            disabled={!canSend || (!input.trim() && pendingImages.length === 0) || sending || uploadingImage}
            className="h-9 w-9 p-0 rounded-xl flex-shrink-0 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 hover:border-primary/60 dark:border-slate-500 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function DmDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn("flex gap-2", i % 2 === 0 && "flex-row-reverse")}>
                <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                <Skeleton className={cn("h-10 rounded-2xl", i % 2 === 0 ? "w-48" : "w-36")} />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <DmDetailContent />
    </Suspense>
  );
}

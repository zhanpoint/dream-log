"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DreamerLevelBadge } from "@/components/community/dreamer-level-badge";
import { UserAvatar } from "@/components/user-avatar";
import { dmAPI, type DmConversationOut, type SendKnockRequest } from "@/lib/dm-api";
import { AuthUser } from "@/lib/auth-api";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Locale } from "date-fns";
import { enUS, ja, zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


function ConversationSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-full max-w-[200px]" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

function getConversationPeerId(conv: DmConversationOut, currentUserId: string): string {
  if (conv.other_user?.id) return conv.other_user.id;
  if (conv.other_user_id) return conv.other_user_id;
  return conv.initiator_id === currentUserId ? conv.recipient_id : conv.initiator_id;
}

const relativeTimeLocales: Record<string, Locale> = {
  en: enUS,
  "en-US": enUS,
  ja,
  "zh-CN": zhCN,
};

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const knockRecipientId = searchParams.get("knock");
  const { t, i18n } = useTranslation();
  const relativeLocale = relativeTimeLocales[i18n.language] ?? zhCN;

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof AuthUser.get>>(null);
  const [conversations, setConversations] = useState<DmConversationOut[]>([]);
  const [loading, setLoading] = useState(true);

  // Knock dialog state
  const [knockOpen, setKnockOpen] = useState(false);
  const [knockContent, setKnockContent] = useState("");
  const [knockSending, setKnockSending] = useState(false);
  const knockRef = useRef<HTMLTextAreaElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await dmAPI.getConversations();
      setConversations(data);
    } catch {
      toast.error(t("dm.errors.loadConversationsFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    setMounted(true);
    setCurrentUser(AuthUser.get());
  }, []);

  useEffect(() => {
    if (!mounted || !currentUser) {
      setLoading(false);
      return;
    }
    loadConversations();
  }, [mounted, currentUser, loadConversations]);

  // If conversation already exists, jump directly; otherwise open knock dialog.
  useEffect(() => {
    if (!mounted || !knockRecipientId || !currentUser || loading) return;

    const existingConversation = conversations.find(
      (conv) => getConversationPeerId(conv, currentUser.id) === knockRecipientId
    );

    if (existingConversation) {
      setKnockOpen(false);
      router.replace(`/community/messages/${existingConversation.id}`);
      return;
    }

    setKnockOpen(true);
  }, [mounted, knockRecipientId, currentUser, loading, conversations, router]);

  const handleSendKnock = async () => {
    if (!knockRecipientId || !knockContent.trim()) return;
    setKnockSending(true);
    try {
      const conv = await dmAPI.sendKnock(knockRecipientId, {
        content: knockContent.trim(),
      } as SendKnockRequest);
      setKnockOpen(false);
      setKnockContent("");
      router.push(`/community/messages/${conv.id}`);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? t("dm.errors.sendFailed"));
    } finally {
      setKnockSending(false);
    }
  };

  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ConversationSkeleton />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">🔐</p>
        <p className="text-muted-foreground mb-4">
          {t("dm.loginRequired.description")}
        </p>
        <Link href="/auth">
          <Button>{t("dm.loginRequired.loginButton")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/community"
          aria-label={t("dm.header.backToCommunity")}
        >
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-foreground/90 hover:text-foreground dark:text-slate-200 dark:hover:text-white hover:bg-accent/70 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("dm.header.backToCommunity")}
          </Button>
        </Link>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          {t("dm.header.title")}
        </h1>
      </div>

      {/* Knock Dialog */}
      <Dialog open={knockOpen} onOpenChange={setKnockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {t("dm.knockDialog.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="relative">
              <textarea
                ref={knockRef}
                value={knockContent}
                onChange={(e) => setKnockContent(e.target.value)}
                placeholder={t("dm.knockDialog.placeholder")}
                maxLength={500}
                rows={4}
                className={cn(
                  "w-full text-sm bg-transparent border border-slate-300/90 dark:border-slate-500/80 rounded-xl px-3 py-2.5 pr-14 pb-7",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/60",
                  "resize-none transition-all"
                )}
              />
              <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-muted-foreground">
                {knockContent.length}/500
              </span>
            </div>
            <div className="flex items-center justify-end">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setKnockOpen(false)}
                  className="text-foreground hover:text-foreground dark:text-slate-200 dark:hover:text-white hover:bg-accent/70 dark:hover:bg-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02]"
                >
                  {t("dm.knockDialog.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendKnock}
                  disabled={knockSending || !knockContent.trim()}
                  className="gap-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02]"
                >
                  <Send className="h-3.5 w-3.5" />
                  {knockSending
                    ? t("dm.knockDialog.sending")
                    : t("dm.knockDialog.send")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conversation list */}
      {loading ? (
        <ConversationSkeleton />
      ) : conversations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">💬</p>
        <h3 className="text-base font-semibold mb-1">
          {t("dm.empty.title")}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t("dm.empty.description")}
        </p>
          <Link href="/community">
            <Button
              variant="outline"
              className="text-foreground hover:text-foreground dark:text-slate-200 dark:hover:text-white hover:bg-accent/70 dark:hover:bg-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02]"
            >
              {t("dm.empty.button")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {conversations.map((conv, idx) => {
            const other = conv.other_user;
            const otherId = other?.id ?? conv.other_user_id ?? conv.recipient_id;
            const otherUsername =
              other?.username ?? conv.other_username ?? t("dm.list.unknownUser");
            const otherAvatar = other?.avatar ?? conv.other_avatar ?? null;
            const otherLevel = other?.dreamer_level;
            const isInitiator = conv.initiator_id === currentUser.id;
            const timeAgo = conv.last_message_at
              ? formatDistanceToNow(new Date(conv.last_message_at), {
                  addSuffix: true,
                  locale: relativeLocale,
                }).replace(/^大约\s*/, "")
              : "";

            return (
              <Link
                key={conv.id}
                href={`/community/messages/${conv.id}`}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-primary/[0.05]",
                  idx !== conversations.length - 1 && "border-b border-white/10 dark:border-white/10"
                )}
              >
                {/* Avatar */}
                <UserAvatar
                  userId={otherId}
                  avatar={otherAvatar}
                  username={otherUsername}
                  size="md"
                  className="flex-shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">
                      {otherUsername}
                    </span>
                    {otherLevel && (
                      <DreamerLevelBadge level={otherLevel} size="xs" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.last_message?.content ??
                      (isInitiator
                        ? t("dm.list.youKnocked")
                        : t("dm.list.receivedKnock"))}
                  </p>
                  {conv.source_dream && (
                    <p className="text-[10px] text-primary/70 mt-0.5 flex items-center gap-1">
                      🌙 {t("dm.list.sourceDreamPrefix")}
                      {conv.source_dream.title ??
                        conv.source_dream.content_preview.slice(0, 20)}
                    </p>
                  )}
                </div>

                {/* Time */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {timeAgo && (
                    <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<ConversationSkeleton />}>
      <MessagesContent />
    </Suspense>
  );
}

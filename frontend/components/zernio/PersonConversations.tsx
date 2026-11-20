import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  ArrowLeft,
  ArrowUp,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../src/i18n";
import { LinkifiedText } from "../LinkifiedText";
import {
  getZernioPlatformLabel,
  ZernioPlatformIcon,
} from "./platforms";
import {
  listZernioConversations,
  listZernioMessages,
  markZernioConversationRead,
  notifyZernioError,
  sendZernioMessage,
  type ZernioConversation,
  type ZernioMessage,
} from "../../lib/zernio";

const MESSAGES_PAGE_SIZE = 200;
const OLDER_PAGE_SIZE = 100;

const parseDate = (value?: string | null) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const relativeTime = (value?: string | null) => {
  if (!value) return "";
  const timestamp = parseDate(value);
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return format(new Date(timestamp), "MMM d");
};

const messageGroups = (messages: ZernioMessage[]) => {
  const groups: { label: string; timestamp: number; items: ZernioMessage[] }[] =
    [];

  messages.forEach((message) => {
    const timestamp = parseDate(message.sent_at || message.created_at);
    const date = new Date(timestamp);
    let label = format(date, "MMM d, yyyy");
    if (isToday(date)) label = "Today";
    else if (isYesterday(date)) label = "Yesterday";

    const existing = groups.find((group) => group.label === label);
    if (existing) existing.items.push(message);
    else groups.push({ label, timestamp, items: [message] });
  });

  groups.sort((a, b) => a.timestamp - b.timestamp);
  groups.forEach((group) =>
    group.items.sort(
      (a, b) =>
        parseDate(a.sent_at || a.created_at) -
        parseDate(b.sent_at || b.created_at),
    ),
  );
  return groups;
};

export const PersonConversations = ({
  personId,
  personName,
  canReply = false,
  initialConversationId,
  variant = "page",
}: {
  personId: string;
  personName?: string;
  canReply?: boolean;
  initialConversationId?: string | null;
  variant?: "page" | "drawer";
}) => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<ZernioConversation[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversationId || null,
  );
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState<ZernioMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [olderOffset, setOlderOffset] = useState<number | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === selectedId) ||
      null,
    [conversations, selectedId],
  );
  const selectedConversationId = selectedConversation?.id || null;

  const visibleConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      [
        conversation.participant_name,
        conversation.participant_username,
        conversation.last_message_text,
        conversation.platform,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [conversations, search]);

  const loadThreads = useCallback(
    async (options: { keepSelection?: boolean } = {}) => {
      if (!personId) {
        setIsLoadingThreads(false);
        return;
      }
      setIsLoadingThreads(true);
      try {
        const rows = await listZernioConversations({
          person: personId,
          limit: 50,
        });
        setConversations(rows);
        setSelectedId((current) => {
          if (options.keepSelection && current) return current;
          if (initialConversationId) return initialConversationId;
          return variant === "page" ? rows[0]?.id || null : null;
        });
      } catch (err) {
        console.error("Failed to load conversations:", err);
        notifyZernioError(err, t("zernio.conversationsLoadFailed"));
      } finally {
        setIsLoadingThreads(false);
      }
    },
    [initialConversationId, personId, t, variant],
  );

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedId(initialConversationId);
    }
  }, [initialConversationId]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const currentRequest = requestId.current + 1;
      requestId.current = currentRequest;
      setIsLoadingMessages(true);
      try {
        const page = await listZernioMessages(conversationId, {
          limit: MESSAGES_PAGE_SIZE,
          refresh: true,
        });

        let results = page.results;
        let offset: number | null = null;

        // The endpoint paginates oldest-first. When a thread has more
        // messages than one page, fetch the latest window instead.
        if (page.count > results.length) {
          offset = Math.max(0, page.count - MESSAGES_PAGE_SIZE);
          const tail = await listZernioMessages(conversationId, {
            limit: MESSAGES_PAGE_SIZE,
            offset,
            refresh: false,
          });
          results = tail.results;
          offset = offset > 0 ? offset : null;
        }

        if (requestId.current !== currentRequest) return;
        setMessages(results);
        setOlderOffset(offset);

        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "auto" });
        }, 50);
      } catch (err) {
        if (requestId.current !== currentRequest) return;
        console.error("Failed to load messages:", err);
        notifyZernioError(err, t("zernio.messagesLoadFailed"));
        setMessages([]);
        setOlderOffset(null);
      } finally {
        if (requestId.current === currentRequest) setIsLoadingMessages(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setOlderOffset(null);
      return;
    }

    const conversation = conversations.find(
      (candidate) => candidate.id === selectedConversationId,
    );
    loadMessages(selectedConversationId);

    if (conversation && conversation.unread_count > 0) {
      markZernioConversationRead(selectedConversationId)
        .then(() => {
          setConversations((current) =>
            current.map((candidate) =>
              candidate.id === selectedConversationId
                ? { ...candidate, unread_count: 0 }
                : candidate,
            ),
          );
        })
        .catch(() => {
          // A failed read receipt should not block the thread.
        });
    }
    // Reading `conversations` here would reload the thread after every
    // unread-count update, so only react to the selected thread id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, loadMessages]);

  const handleLoadOlder = async () => {
    if (!selectedConversation || olderOffset === null) return;
    const nextOffset = Math.max(0, olderOffset - OLDER_PAGE_SIZE);
    setIsLoadingOlder(true);
    try {
      const page = await listZernioMessages(selectedConversation.id, {
        limit: OLDER_PAGE_SIZE,
        offset: nextOffset,
        refresh: false,
      });
      setMessages((current) => {
        const seen = new Set(current.map((message) => message.id));
        return [
          ...page.results.filter((message) => !seen.has(message.id)),
          ...current,
        ];
      });
      setOlderOffset(nextOffset > 0 ? nextOffset : null);
    } catch (err) {
      console.error("Failed to load older messages:", err);
      notifyZernioError(err, t("zernio.messagesLoadFailed"));
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !selectedConversation || isSending) return;

    setIsSending(true);
    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;

    try {
      const message = await sendZernioMessage(
        selectedConversation.id,
        text,
        idempotencyKey,
      );
      setMessages((current) => [...current, message]);
      setDraft("");
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                last_message_text: message.text,
                last_message_at: message.sent_at,
                last_message: message,
              }
            : conversation,
        ),
      );
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 30);
      toast.success(t("zernio.messageSent"));
    } catch (err) {
      console.error("Failed to send message:", err);
      notifyZernioError(err, t("zernio.messageFailed"));
    } finally {
      setIsSending(false);
    }
  };

  const groups = useMemo(() => messageGroups(messages), [messages]);
  const showThreadList = variant === "page" || !selectedId;

  return (
    <div
      className={cn(
        "flex min-h-0 overflow-hidden border border-border bg-record-bg",
        variant === "page"
          ? "h-[calc(100vh-210px)] min-h-[420px] rounded-xl"
          : "h-full rounded-lg",
      )}
    >
      <aside
        className={cn(
          "min-h-0 w-full shrink-0 flex-col border-border md:w-[280px]",
          variant === "page" && "border-r",
          showThreadList ? "flex" : "hidden",
          variant === "page" && "md:flex",
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex-1">
            <Search
              size={12}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-textSecondary"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("zernio.searchConversations")}
              className="w-full rounded-md border border-border bg-record-input py-1.5 pl-7 pr-2 text-[11px] text-textPrimary outline-none placeholder:text-textSecondary/60 focus:border-accent"
            />
          </div>
          <button
            type="button"
            onClick={() => loadThreads({ keepSelection: true })}
            disabled={isLoadingThreads}
            title={t("zernio.refresh")}
            className="rounded border border-border p-1.5 text-textSecondary transition-colors hover:text-textPrimary disabled:opacity-50"
          >
            <RefreshCw
              size={12}
              className={cn(isLoadingThreads && "animate-spin")}
            />
          </button>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          {isLoadingThreads && conversations.length === 0 && (
            <div className="space-y-2 p-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-lg bg-card-hover/40"
                />
              ))}
            </div>
          )}

          {!isLoadingThreads && conversations.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center text-textSecondary/60">
              <MessageSquare size={30} className="mb-2" />
              <p className="text-xs font-medium">{t("zernio.noConversations")}</p>
              <p className="mt-1 text-[10px] leading-relaxed">
                {t("zernio.noConversationsHint")}
              </p>
            </div>
          )}

          {visibleConversations.map((conversation) => {
            const name =
              conversation.participant_name ||
              conversation.participant_username ||
              conversation.conversation_id;
            const isActive = conversation.id === selectedId;

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedId(conversation.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 border-b border-border/40 px-3 py-2.5 text-left transition-colors last:border-b-0",
                  isActive ? "bg-accent/10" : "hover:bg-card-hover/50",
                )}
              >
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card-hover text-xs font-bold text-textPrimary">
                  {conversation.participant_avatar ? (
                    <img
                      src={conversation.participant_avatar}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    name.charAt(0).toUpperCase()
                  )}
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-record-bg ring-1 ring-border">
                    <ZernioPlatformIcon
                      platform={conversation.platform}
                      size={9}
                    />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-textPrimary">
                      {name}
                    </span>
                    <span className="shrink-0 text-[9px] text-textSecondary opacity-70">
                      {relativeTime(
                        conversation.last_message_at ||
                          conversation.last_message?.sent_at,
                      )}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-textSecondary">
                      {conversation.last_message_text ||
                        conversation.last_message?.text ||
                        t("zernio.noMessagesYet")}
                    </span>
                    {conversation.unread_count > 0 && (
                      <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section
        className={cn(
          "min-h-0 min-w-0 flex-1 flex-col",
          selectedId ? "flex" : "hidden",
          variant === "page" && "hidden md:flex",
        )}
      >
        {!selectedConversation ? (
          <div className="flex h-full flex-col items-center justify-center text-textSecondary/60">
            <MessageSquare size={32} className="mb-2" />
            <p className="text-xs">{t("zernio.selectConversation")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              {variant === "drawer" && (
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="rounded p-1 text-textSecondary hover:text-textPrimary md:hidden"
                >
                  <ArrowLeft size={15} />
                </button>
              )}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card-hover text-xs font-bold text-textPrimary">
                {selectedConversation.participant_avatar ? (
                  <img
                    src={selectedConversation.participant_avatar}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  (
                    selectedConversation.participant_name ||
                    selectedConversation.participant_username ||
                    "?"
                  )
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-textPrimary">
                  {selectedConversation.participant_name ||
                    selectedConversation.participant_username ||
                    selectedConversation.conversation_id}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-textSecondary">
                  <ZernioPlatformIcon
                    platform={selectedConversation.platform}
                    size={9}
                  />
                  {getZernioPlatformLabel(selectedConversation.platform)}
                  {selectedConversation.participant_username &&
                    !/^\d+$/.test(selectedConversation.participant_username) &&
                    ` · @${selectedConversation.participant_username}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadMessages(selectedConversation.id)}
                disabled={isLoadingMessages}
                title={t("zernio.refresh")}
                className="rounded border border-border p-1.5 text-textSecondary transition-colors hover:text-textPrimary disabled:opacity-50"
              >
                <RefreshCw
                  size={12}
                  className={cn(isLoadingMessages && "animate-spin")}
                />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4"
            >
              {olderOffset !== null && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadOlder}
                    disabled={isLoadingOlder}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-dropdown-bg px-3 py-1.5 text-[10px] text-textSecondary transition-colors hover:text-textPrimary disabled:opacity-60"
                  >
                    <ArrowUp size={10} />
                    {t("zernio.loadOlder")}
                  </button>
                </div>
              )}

              {isLoadingMessages && messages.length === 0 && (
                <div className="space-y-3 py-2">
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className={cn(
                        "h-12 animate-pulse rounded-xl bg-card-hover/40",
                        index % 2 === 0 ? "w-2/3" : "ml-auto w-1/2",
                      )}
                    />
                  ))}
                </div>
              )}

              {!isLoadingMessages && messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-textSecondary/60">
                  <MessageSquare size={30} className="mb-2" />
                  <p className="text-xs">{t("zernio.noMessagesYet")}</p>
                </div>
              )}

              {groups.map((group) => (
                <div key={group.label} className="space-y-3">
                  <div className="flex justify-center">
                    <span className="rounded-full border border-border/50 bg-card-hover px-2.5 py-0.5 text-[9px] font-bold uppercase text-textSecondary">
                      {group.label}
                    </span>
                  </div>

                  {group.items.map((message) => {
                    const isSent = message.direction === "outgoing";
                    const timestamp = parseDate(
                      message.sent_at || message.created_at,
                    );
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex w-full",
                          isSent ? "justify-end" : "justify-start",
                        )}
                      >
                        <div className="flex max-w-[85%] flex-col gap-1">
                          <div
                            dir="auto"
                            className={cn(
                              "rounded-2xl border px-3.5 py-2 text-sm",
                              isSent
                                ? "rounded-tr-sm border-accent/25 bg-accent/15 text-textPrimary"
                                : "rounded-tl-sm border-border bg-card-bg text-textPrimary",
                            )}
                          >
                            {message.text ? (
                              <LinkifiedText text={message.text} />
                            ) : (
                              <span className="text-xs italic text-textSecondary">
                                {t("zernio.attachmentOnly")}
                              </span>
                            )}
                            {Array.isArray(message.attachments) &&
                              message.attachments.length > 0 && (
                                <div className="mt-1 text-[10px] text-textSecondary">
                                  {t("zernio.attachments", {
                                    count: message.attachments.length,
                                  })}
                                </div>
                              )}
                          </div>
                          <div
                            className={cn(
                              "flex items-center gap-1.5 text-[9px] text-textSecondary",
                              isSent ? "justify-end" : "justify-start",
                            )}
                          >
                            <span>
                              {format(new Date(timestamp), "HH:mm")}
                            </span>
                            {message.status && (
                              <>
                                <span>·</span>
                                <span
                                  className={cn(
                                    "capitalize",
                                    message.status === "failed" && "text-red-500",
                                  )}
                                >
                                  {message.status}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {canReply ? (
              <div className="border-t border-border p-2.5">
                <div className="relative">
                  <textarea
                    dir="auto"
                    rows={2}
                    value={draft}
                    disabled={isSending}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={t("zernio.replyPlaceholder", {
                      name:
                        selectedConversation.participant_name ||
                        selectedConversation.participant_username ||
                        personName ||
                        "contact",
                    })}
                    className="min-h-[64px] w-full resize-none rounded-lg border border-border bg-record-input p-2.5 pr-11 text-sm text-textPrimary outline-none transition-colors placeholder:text-textSecondary/60 focus:border-accent disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!draft.trim() || isSending}
                    className="absolute bottom-2 right-2 rounded-md bg-accent p-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSending ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-border px-3 py-2 text-center text-[10px] text-textSecondary">
                {t("zernio.replyPermissionMissing")}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

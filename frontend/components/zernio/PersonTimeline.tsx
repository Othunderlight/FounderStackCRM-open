import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../src/i18n";
import { LinkifiedText } from "../LinkifiedText";
import { AddActivityDialog } from "./AddActivityDialog";
import {
  getZernioPlatform,
  getZernioPlatformLabel,
  ZernioPlatformIcon,
} from "./platforms";
import {
  getPersonTimeline,
  listZernioConversations,
  notifyZernioError,
  sendZernioMessage,
  type PersonTimelineItem,
  type ZernioConversation,
} from "../../lib/zernio";

type TimelineSource = "all" | "activities" | "messages";

const PAGE_SIZE = 50;

const activityIcon = (type?: string | null) => {
  const normalized = (type || "").toLowerCase();
  if (normalized.includes("email")) return Mail;
  if (normalized.includes("call")) return Phone;
  if (normalized.includes("meeting")) return Activity;
  if (normalized.includes("msg") || normalized.includes("message")) {
    return MessageSquare;
  }
  return Sparkles;
};

const parseDate = (value?: string | null) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const groupByDay = (items: PersonTimelineItem[]) => {
  const groups: {
    label: string;
    timestamp: number;
    items: PersonTimelineItem[];
  }[] = [];

  items.forEach((item) => {
    const timestamp = parseDate(item.date);
    const date = new Date(timestamp);
    let label = format(date, "MMM d, yyyy");
    if (isToday(date)) label = "Today";
    else if (isYesterday(date)) label = "Yesterday";

    const existing = groups.find((group) => group.label === label);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ label, timestamp, items: [item] });
    }
  });

  groups.sort((a, b) => a.timestamp - b.timestamp);
  groups.forEach((group) =>
    group.items.sort((a, b) => parseDate(a.date) - parseDate(b.date)),
  );
  return groups;
};

export const PersonTimeline = ({
  personId,
  personName,
  canWrite = false,
  canReply = false,
  variant = "page",
  onOpenConversation,
}: {
  personId: string;
  personName?: string;
  canWrite?: boolean;
  canReply?: boolean;
  variant?: "page" | "drawer";
  onOpenConversation?: (conversationId: string) => void;
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<PersonTimelineItem[]>([]);
  const [conversations, setConversations] = useState<ZernioConversation[]>([]);
  const [source, setSource] = useState<TimelineSource>("all");
  const [conversationFilter, setConversationFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);

  const requestId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const skipNextAutoScroll = useRef(false);

  const activeConversation = useMemo(() => {
    if (conversations.length === 0) return null;
    if (conversationFilter !== "all") {
      return (
        conversations.find(
          (conversation) => conversation.id === conversationFilter,
        ) || null
      );
    }
    return conversations.length === 1 ? conversations[0] : null;
  }, [conversationFilter, conversations]);

  const loadTimeline = useCallback(
    async (options: { offset?: number; append?: boolean } = {}) => {
      if (!personId) {
        setIsLoading(false);
        return;
      }
      const offset = options.offset ?? 0;
      const currentRequest = requestId.current + 1;
      requestId.current = currentRequest;

      if (options.append) setIsLoadingMore(true);
      else setIsLoading(true);

      try {
        const page = await getPersonTimeline(personId, {
          source,
          conversation:
            conversationFilter === "all" ? undefined : conversationFilter,
          limit: PAGE_SIZE,
          offset,
        });

        if (requestId.current !== currentRequest) return;

        setItems((current) =>
          options.append
            ? (() => {
                const seen = new Set(
                  current.map((item) => `${item.kind}:${item.id}`),
                );
                return [
                  ...current,
                  ...page.results.filter(
                    (item) => !seen.has(`${item.kind}:${item.id}`),
                  ),
                ];
              })()
            : page.results,
        );
        setNextOffset(page.next);
        setError(null);
      } catch (err) {
        if (requestId.current !== currentRequest) return;
        console.error("Failed to load person timeline:", err);
        setError(t("zernio.timelineLoadFailed"));
      } finally {
        if (requestId.current === currentRequest) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [conversationFilter, personId, source, t],
  );

  const loadConversations = useCallback(async () => {
    if (!canReply) return;
    try {
      const rows = await listZernioConversations({
        person: personId,
        limit: 50,
      });
      setConversations(rows);
    } catch (err) {
      console.error("Failed to load person conversations:", err);
    }
  }, [canReply, personId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    skipNextAutoScroll.current = false;
    loadTimeline({ offset: 0 });
  }, [loadTimeline]);

  useEffect(() => {
    if (isLoading || isLoadingMore) return;
    if (skipNextAutoScroll.current) {
      skipNextAutoScroll.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [items.length, isLoading, isLoadingMore]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => parseDate(a.date) - parseDate(b.date)),
    [items],
  );
  const groups = useMemo(() => groupByDay(sortedItems), [sortedItems]);

  const handleLoadOlder = async () => {
    if (nextOffset === null) return;
    const container = scrollRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    const previousTop = container?.scrollTop ?? 0;
    skipNextAutoScroll.current = true;

    await loadTimeline({ offset: nextOffset, append: true });

    requestAnimationFrame(() => {
      if (!container) return;
      container.scrollTop =
        previousTop + (container.scrollHeight - previousHeight);
    });
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !activeConversation || isSending) return;

    setIsSending(true);
    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;

    try {
      const message = await sendZernioMessage(
        activeConversation.id,
        text,
        idempotencyKey,
      );

      setDraft("");
      if (source === "activities") {
        loadTimeline({ offset: 0 });
      } else {
        setItems((current) => [
          ...current,
          {
            kind: "message",
            id: message.id,
            type: "msg",
            channel: activeConversation.platform,
            direction: "sent",
            title: null,
            content: message.text,
            date: message.sent_at || new Date().toISOString(),
            conversation: activeConversation.id,
            conversation_id: activeConversation.conversation_id,
            platform: activeConversation.platform,
            message_id: message.message_id,
            status: message.status,
            attachments: message.attachments || [],
          },
        ]);
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 30);
      }
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                last_message_text: message.text,
                last_message_at: message.sent_at,
                last_message: message,
              }
            : conversation,
        ),
      );
      toast.success(t("zernio.messageSent"));
    } catch (err) {
      console.error("Failed to send message:", err);
      notifyZernioError(err, t("zernio.messageFailed"));
    } finally {
      setIsSending(false);
    }
  };

  const sourceOptions: { id: TimelineSource; label: string }[] = [
    { id: "all", label: t("zernio.filterAll") },
    { id: "messages", label: t("zernio.filterMessages") },
    { id: "activities", label: t("zernio.filterActivities") },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-accent" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary">
            {t("zernio.activityAndMessages")}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {canWrite && (
            <button
              type="button"
              onClick={() => setIsAddActivityOpen(true)}
              className="flex items-center gap-1.5 rounded border border-accent/20 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
            >
              <Plus size={12} />
              {t("recordPage.addActivity")}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              loadTimeline({ offset: 0 });
              loadConversations();
            }}
            disabled={isLoading}
            title={t("zernio.refresh")}
            className="rounded border border-border p-1.5 text-textSecondary transition-colors hover:text-textPrimary disabled:opacity-50"
          >
            <RefreshCw size={12} className={cn(isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-record-bg p-0.5">
          {sourceOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSource(option.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                source === option.id
                  ? "bg-card-hover text-textPrimary"
                  : "text-textSecondary hover:text-textPrimary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {conversations.length > 0 && (
          <select
            value={conversationFilter}
            onChange={(event) => setConversationFilter(event.target.value)}
            className="max-w-[240px] cursor-pointer rounded-lg border border-border bg-record-bg px-2 py-1.5 text-[11px] text-textSecondary outline-none transition-colors hover:border-border/80 focus:border-accent"
          >
            <option value="all">{t("zernio.allThreads")}</option>
            {conversations.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>
                {getZernioPlatformLabel(conversation.platform)} ·{" "}
                {conversation.participant_name ||
                  conversation.participant_username ||
                  conversation.conversation_id}
              </option>
            ))}
          </select>
        )}
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "custom-scrollbar flex-1 space-y-5 overflow-y-auto pr-1",
          variant === "drawer" ? "min-h-[260px]" : "min-h-[320px]",
        )}
      >
        {nextOffset !== null && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() =>
                handleLoadOlder()
              }
              disabled={isLoadingMore}
              className="group flex items-center gap-2 rounded-full border border-border bg-dropdown-bg px-4 py-2 text-xs text-textSecondary shadow-lg transition-all hover:text-textPrimary disabled:opacity-60"
            >
              {isLoadingMore ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <ArrowDown
                  size={12}
                  className="transition-transform group-hover:translate-y-0.5"
                />
              )}
              {t("recordPage.loadOlderMessages")}
            </button>
          </div>
        )}

        {isLoading && items.length === 0 && (
          <div className="space-y-3 py-4">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={cn(
                  "h-14 animate-pulse rounded-xl border border-border/60 bg-card-hover/40",
                  index % 2 === 0 ? "w-2/3" : "ml-auto w-1/2",
                )}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-textSecondary">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => loadTimeline({ offset: 0 })}
              className="font-medium text-accent hover:underline"
            >
              {t("zernio.retry")}
            </button>
          </div>
        )}

        {!isLoading && !error && sortedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-textSecondary/50">
            <MessageSquare size={40} className="mb-3" />
            <p className="text-sm font-medium">{t("zernio.noTimeline")}</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label} className="space-y-4">
            <div className="sticky top-0 z-10 flex justify-center py-1">
              <span className="rounded-full border border-border/50 bg-card-hover px-3 py-0.5 text-[10px] font-bold uppercase text-textSecondary shadow-sm">
                {group.label}
              </span>
            </div>

            {group.items.map((item) => {
              const timestamp = parseDate(item.date);
              const timeStr = format(new Date(timestamp), "HH:mm");
              const platformMeta = getZernioPlatform(item.platform);

              if (item.kind === "message") {
                const isSent = item.direction === "sent";
                const text = item.text || t("zernio.attachmentOnly");
                return (
                  <div
                    key={`message-${item.id}`}
                    className={cn(
                      "group flex w-full",
                      isSent ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "flex max-w-[80%] gap-3",
                        isSent ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          isSent
                            ? "bg-accent text-white"
                            : "bg-card-hover text-textPrimary",
                        )}
                      >
                        {isSent ? "Y" : (personName || "?").charAt(0)}
                      </div>
                      <div className="flex min-w-0 flex-col gap-1">
                        <div
                          dir="auto"
                          className={cn(
                            "rounded-2xl border px-4 py-2.5 text-sm",
                            isSent
                              ? "rounded-tr-sm border-accent/25 bg-accent/15 text-textPrimary"
                              : "rounded-tl-sm border-border bg-record-bg text-textPrimary",
                          )}
                        >
                          <LinkifiedText text={text} />
                          {Array.isArray(item.attachments) &&
                            item.attachments.length > 0 && (
                              <div className="mt-1 text-[10px] text-textSecondary">
                                {t("zernio.attachments", {
                                  count: item.attachments.length,
                                })}
                              </div>
                            )}
                        </div>
                        <div
                          className={cn(
                            "flex items-center gap-1.5 text-[10px] text-textSecondary",
                            isSent ? "justify-end" : "justify-start",
                          )}
                        >
                          <ZernioPlatformIcon
                            platform={item.platform}
                            size={10}
                          />
                          <span>{platformMeta?.label || item.platform}</span>
                          <span>·</span>
                          <span>{timeStr}</span>
                          {item.status && (
                            <>
                              <span>·</span>
                              <span className="capitalize">{item.status}</span>
                            </>
                          )}
                          {onOpenConversation && item.conversation && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenConversation(item.conversation as string)
                              }
                              className="ml-1 hidden font-medium text-accent hover:underline group-hover:inline"
                            >
                              {t("zernio.openThread")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              const Icon = activityIcon(item.type);
              const isSystem =
                item.channel === "system" || !item.channel;

              if (isSystem) {
                return (
                  <div
                    key={`activity-${item.id}`}
                    className="my-2 flex justify-center"
                  >
                    <div className="flex items-center gap-2 rounded-full border border-border bg-dropdown-bg px-4 py-1 text-xs text-textSecondary">
                      <Activity size={12} />
                      <span dir="auto">
                        {item.title || item.content || item.type}
                      </span>
                      <span className="opacity-50">· {timeStr}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`activity-${item.id}`}
                  className="flex items-start gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-drawer-bg text-textSecondary">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-dropdown-bg p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-textPrimary">
                        {item.title || item.type}
                      </span>
                      <span className="rounded border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-textSecondary">
                        {item.channel}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] font-medium uppercase tracking-wide",
                          item.direction === "sent"
                            ? "text-emerald-500"
                            : "text-sky-500",
                        )}
                      >
                        {item.direction === "sent"
                          ? t("recordPage.sent")
                          : t("recordPage.received")}
                      </span>
                    </div>
                    {item.content && (
                      <p
                        dir="auto"
                        className="mt-1 line-clamp-3 text-sm leading-relaxed text-textSecondary"
                      >
                        <LinkifiedText text={item.content} />
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-textSecondary opacity-70">
                      <span>
                        {format(new Date(timestamp), "MMM d, yyyy")} · {timeStr}
                      </span>
                      {onOpenConversation && item.conversation && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenConversation(item.conversation as string)
                          }
                          className="font-medium text-accent opacity-100 hover:underline"
                        >
                          {t("zernio.openThread")}
                        </button>
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

      {canReply && (
        <div className="mt-3 border-t border-border pt-3">
          {conversations.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-center text-[11px] text-textSecondary">
              {t("zernio.noLinkedThreadsHint")}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-[10px] text-textSecondary">
                <span className="flex items-center gap-1.5">
                  {activeConversation ? (
                    <>
                      <ZernioPlatformIcon
                        platform={activeConversation.platform}
                        size={10}
                      />
                      {t("zernio.replyingOn", {
                        platform: getZernioPlatformLabel(
                          activeConversation.platform,
                        ),
                      })}
                    </>
                  ) : (
                    t("zernio.selectThreadToReply")
                  )}
                </span>
                {conversations.length > 1 && (
                  <select
                    value={conversationFilter}
                    onChange={(event) =>
                      setConversationFilter(event.target.value)
                    }
                    className="max-w-[180px] cursor-pointer rounded border border-border bg-record-bg px-1.5 py-0.5 text-[10px] outline-none"
                  >
                    <option value="all">{t("zernio.selectThread")}</option>
                    {conversations.map((conversation) => (
                      <option key={conversation.id} value={conversation.id}>
                        {getZernioPlatformLabel(conversation.platform)} ·{" "}
                        {conversation.participant_name ||
                          conversation.participant_username}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="relative">
                <textarea
                  dir="auto"
                  rows={2}
                  value={draft}
                  disabled={!activeConversation || isSending}
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
                  placeholder={
                    activeConversation
                      ? t("zernio.messagePlaceholder", {
                          name:
                            activeConversation.participant_name ||
                            activeConversation.participant_username ||
                            personName ||
                            "contact",
                          platform: getZernioPlatformLabel(
                            activeConversation.platform,
                          ),
                        })
                      : t("zernio.selectThreadFirst")
                  }
                  className="min-h-[70px] w-full resize-none rounded-lg border border-border bg-record-input p-3 pr-12 text-sm text-textPrimary outline-none transition-colors placeholder:text-textSecondary/60 focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim() || !activeConversation || isSending}
                  className="absolute bottom-2.5 right-2.5 rounded-md bg-accent p-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {canWrite && (
        <AddActivityDialog
          open={isAddActivityOpen}
          onOpenChange={setIsAddActivityOpen}
          personId={personId}
          personName={personName}
          onCreated={() => loadTimeline({ offset: 0 })}
        />
      )}
    </div>
  );
};

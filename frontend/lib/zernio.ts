import { apiFetch } from "./api";
import { toast } from "sonner";

const ZERNIO_BASE = "/api/integrations/zernio";

export type ZernioPaginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ZernioProfile = {
  id: number;
  organization: number;
  profile_id: string | null;
  name: string;
  external_id: string | null;
  is_default: boolean;
  status: string;
  accounts_count: number;
  conversations_count: number;
  last_analytics_sync_at: string | null;
  last_inbox_sync_at: string | null;
  last_synced_at: string | null;
  analytics_data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type ZernioAccount = {
  id: number;
  profile: number;
  profile_id: string | null;
  account_id: string;
  platform: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  status: string;
  can_post: boolean;
  token_valid: boolean;
  needs_reconnect: boolean;
  issues: string[];
  health: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  connected_at: string | null;
  disconnected_at: string | null;
  last_synced_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ZernioConnectUrl = {
  authUrl: string;
  state?: string;
};

export type ZernioMessage = {
  id: string;
  conversation: string;
  message_id: string | null;
  direction: "incoming" | "outgoing";
  text: string | null;
  sender: {
    id?: string;
    name?: string;
    username?: string;
  } | null;
  attachments: unknown[];
  status: string | null;
  error_message: string | null;
  idempotency_key: string | null;
  sent_at: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type ZernioConversation = {
  id: string;
  profile: number;
  account: ZernioAccount | null;
  person: string | null;
  identity: string | null;
  person_name: string | null;
  conversation_id: string;
  platform: string;
  participant_id: string | null;
  participant_name: string | null;
  participant_username: string | null;
  participant_avatar: string | null;
  status: string;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
  metadata?: Record<string, unknown>;
  last_synced_at: string | null;
  last_message: ZernioMessage | null;
  created_at?: string;
  updated_at?: string;
};

export type ZernioImportPeopleResult = {
  total: number;
  linked: number;
  already_linked: number;
  created_people: number;
  skipped: number;
  errors: { conversation_id: string; error: string }[];
  dry_run: boolean;
  finished_at?: string;
};

export type PersonTimelineItem = {
  kind: "activity" | "message";
  id: string;
  type: string;
  channel: string | null;
  direction: "sent" | "received" | "system";
  title: string | null;
  content: string | null;
  date: string;
  conversation: string | null;
  conversation_id: string | null;
  platform: string | null;
  message_id: string | null;
  status: string | null;
  attachments: unknown[];
};

export type PersonTimelinePage = {
  count: number;
  offset: number;
  limit: number;
  next: number | null;
  previous: number | null;
  results: PersonTimelineItem[];
};

export class ZernioError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ZernioError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const firstFieldError = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;

  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0];
    }
    if (typeof value === "string") {
      return value;
    }
  }

  return null;
};

const unwrapList = <T>(payload: T[] | ZernioPaginated<T>): T[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

const requestUrl = async <T>(
  url: string,
  init: RequestInit = {},
): Promise<T> => {
  const response = await apiFetch(url, init);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? (payload as { detail?: unknown }).detail
        : null;
    const message =
      (typeof detail === "string" && detail) ||
      firstFieldError(payload) ||
      `Zernio request failed (${response.status})`;

    throw new ZernioError(
      message,
      response.status,
      payload && typeof payload === "object" && "code" in payload
        ? String((payload as { code?: unknown }).code ?? "")
        : undefined,
      payload && typeof payload === "object" && "details" in payload
        ? (payload as { details?: unknown }).details
        : undefined,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
};

const request = <T>(path: string, init: RequestInit = {}): Promise<T> =>
  requestUrl<T>(`${ZERNIO_BASE}${path}`, init);

export const ensureZernioProfile = () =>
  request<ZernioProfile>("/profiles/ensure/", {
    method: "POST",
    body: JSON.stringify({}),
  });

export const listZernioProfiles = async (): Promise<ZernioProfile[]> => {
  const payload = await request<ZernioProfile[] | ZernioPaginated<ZernioProfile>>(
    "/profiles/?limit=25",
  );
  return unwrapList(payload);
};

export const getZernioProfile = async (): Promise<ZernioProfile | null> => {
  const profiles = await listZernioProfiles();
  return profiles[0] ?? null;
};

export const listZernioAccounts = async (params?: {
  active?: boolean;
  needsReconnect?: boolean;
  platform?: string;
}): Promise<ZernioAccount[]> => {
  const query = new URLSearchParams({ limit: "100" });
  if (params?.active !== undefined) {
    query.set("active", String(params.active));
  }
  if (params?.needsReconnect !== undefined) {
    query.set("needs_reconnect", String(params.needsReconnect));
  }
  if (params?.platform) {
    query.set("platform", params.platform);
  }

  const payload = await request<
    ZernioAccount[] | ZernioPaginated<ZernioAccount>
  >(`/accounts/?${query.toString()}`);
  return unwrapList(payload);
};

export const syncZernioAccounts = () =>
  request<{ synced: number; results: ZernioAccount[] }>("/accounts/sync/", {
    method: "POST",
    body: JSON.stringify({}),
  });

export const getZernioConnectUrl = (
  platform: string,
  redirectUrl?: string,
) => {
  const query = new URLSearchParams({ platform });
  if (redirectUrl) query.set("redirect_url", redirectUrl);
  return request<ZernioConnectUrl>(
    `/profiles/connect-url/?${query.toString()}`,
  );
};

export const reconnectZernioAccount = (
  accountId: number,
  redirectUrl?: string,
) =>
  request<ZernioConnectUrl>(`/accounts/${accountId}/reconnect/`, {
    method: "POST",
    body: JSON.stringify(redirectUrl ? { redirect_url: redirectUrl } : {}),
  });

export const disconnectZernioAccount = (accountId: number) =>
  request<void>(`/accounts/${accountId}/`, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Conversations and messages
// ---------------------------------------------------------------------------

export type ListZernioConversationsParams = {
  person?: string;
  linked?: boolean;
  unread?: boolean;
  status?: string;
  platform?: string;
  account?: string | number;
  search?: string;
  limit?: number;
  offset?: number;
};

export const listZernioConversations = async (
  params: ListZernioConversationsParams = {},
): Promise<ZernioConversation[]> => {
  const query = new URLSearchParams({ limit: String(params.limit ?? 50) });
  if (params.person) query.set("person", params.person);
  if (params.linked !== undefined) query.set("linked", String(params.linked));
  if (params.unread !== undefined) query.set("unread", String(params.unread));
  if (params.status) query.set("status", params.status);
  if (params.platform) query.set("platform", params.platform);
  if (params.account !== undefined) {
    query.set("account", String(params.account));
  }
  if (params.search) query.set("search", params.search);
  if (params.offset !== undefined) query.set("offset", String(params.offset));

  const payload = await request<
    ZernioConversation[] | ZernioPaginated<ZernioConversation>
  >(`/conversations/?${query.toString()}`);
  return unwrapList(payload);
};

export const getZernioConversation = (conversationId: string) =>
  request<ZernioConversation>(`/conversations/${conversationId}/`);

export const listZernioMessages = async (
  conversationId: string,
  params: { limit?: number; offset?: number; refresh?: boolean } = {},
): Promise<ZernioPaginated<ZernioMessage>> => {
  const query = new URLSearchParams({ limit: String(params.limit ?? 100) });
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  if (params.refresh !== undefined) {
    query.set("refresh", String(params.refresh));
  }

  const payload = await request<
    ZernioMessage[] | ZernioPaginated<ZernioMessage>
  >(`/conversations/${conversationId}/messages/?${query.toString()}`);

  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload,
    };
  }
  return payload;
};

export const sendZernioMessage = (
  conversationId: string,
  message: string,
  idempotencyKey?: string,
) =>
  request<ZernioMessage>(`/conversations/${conversationId}/messages/`, {
    method: "POST",
    body: JSON.stringify({
      message,
      idempotency_key: idempotencyKey,
    }),
  });

export const markZernioConversationRead = (conversationId: string) =>
  request<{ status: string; unread_count: number }>(
    `/conversations/${conversationId}/read/`,
    { method: "POST", body: JSON.stringify({}) },
  );

export const importZernioConversationsToPeople = (options: {
  createMissing?: boolean;
  dryRun?: boolean;
  limit?: number | null;
  conversationIds?: string[] | null;
} = {}) =>
  request<ZernioImportPeopleResult>("/conversations/import-people/", {
    method: "POST",
    body: JSON.stringify({
      create_missing: options.createMissing ?? true,
      dry_run: options.dryRun ?? false,
      limit: options.limit ?? null,
      conversation_ids: options.conversationIds ?? null,
    }),
  });

// ---------------------------------------------------------------------------
// Person merged timeline
// ---------------------------------------------------------------------------

export const getPersonTimeline = async (
  personId: string,
  params: {
    source?: "all" | "activities" | "messages";
    conversation?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<PersonTimelinePage> => {
  const query = new URLSearchParams({
    limit: String(params.limit ?? 50),
    offset: String(params.offset ?? 0),
  });
  if (params.source) query.set("source", params.source);
  if (params.conversation) query.set("conversation", params.conversation);

  return requestUrl<PersonTimelinePage>(
    `/api/people/${personId}/timeline/?${query.toString()}`,
  );
};

/**
 * `apiFetch` already toasts most API failures. Only surface the ones it skips
 * (404) so the UI does not show two toasts for one error.
 */
export const notifyZernioError = (error: unknown, fallback: string) => {
  if (error instanceof ZernioError) {
    if (error.status !== 404) return;
    toast.error(error.message);
    return;
  }
  toast.error(error instanceof Error ? error.message : fallback);
};

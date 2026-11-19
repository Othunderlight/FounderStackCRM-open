import { apiFetch } from "./api";

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

const request = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const response = await apiFetch(`${ZERNIO_BASE}${path}`, init);

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
  const query = new URLSearchParams();
  if (params?.active !== undefined) {
    query.set("active", String(params.active));
  }
  if (params?.needsReconnect !== undefined) {
    query.set("needs_reconnect", String(params.needsReconnect));
  }
  if (params?.platform) {
    query.set("platform", params.platform);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const payload = await request<
    ZernioAccount[] | ZernioPaginated<ZernioAccount>
  >(`/accounts/${suffix}`);
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

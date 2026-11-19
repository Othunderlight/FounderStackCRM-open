import { useStore } from "../store";
import { toast } from "sonner";

export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
export const FAST_AI_BASE_URL =
  import.meta.env.VITE_FAST_AI_BASE_URL || "http://localhost:8080";

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  baseUrl: string = BASE_URL,
): Promise<Response> {
  const { accessToken, refreshToken, logout, user } = useStore.getState();

  const isGettingUser = endpoint.includes("/api/auth/user/");

  if (user && user.is_active === false && !isGettingUser) {
    return new Response(JSON.stringify({ error: "account_inactive" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers(options.headers || {});
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      const errorData = await response
        .clone()
        .json()
        .catch(() => ({}));
      const isTokenError =
        errorData.code === "token_not_valid" ||
        errorData.detail?.toLowerCase().includes("token") ||
        response.status === 401;

      if (isTokenError && baseUrl !== FAST_AI_BASE_URL) {
        if (
          !refreshToken ||
          response.status === 401 ||
          errorData.code === "token_not_valid"
        ) {
          // If we have no refresh token, or if it's a direct 401, or if it's an explicit "token not valid" error
          logout();
          window.location.hash = "#/signin";
          // Only show toast if it's not already handled or if it's an unexpected logout
          if (accessToken) {
            toast.error("Your session has expired. Please sign in again.");
          }
          return response;
        }

        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshResponse = await fetch(
              `${BASE_URL}/api/auth/token/refresh/`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ refresh: refreshToken }),
              },
            );

            if (refreshResponse.ok) {
              const data = await refreshResponse.json();
              useStore.getState().setTokens(data.access, refreshToken);
              isRefreshing = false;
              onRefreshed(data.access);
            } else {
              isRefreshing = false;
              logout();
              window.location.hash = "#/signin";
              toast.error("Your session has expired. Please sign in again.");
              return response;
            }
          } catch (err) {
            isRefreshing = false;
            logout();
            window.location.hash = "#/signin";
            return response;
          }
        }

        const retryOriginalRequest = new Promise<Response>((resolve) => {
          subscribeTokenRefresh((token) => {
            headers.set("Authorization", `Bearer ${token}`);
            resolve(fetch(`${baseUrl}${endpoint}`, { ...options, headers }));
          });
        });

        return retryOriginalRequest;
      }
    }

    if (response.status === 403) {
      toast.error("You do not have permission to perform this action.");
    }

    if (!response.ok && ![401, 403, 404].includes(response.status)) {
      // Only show generic error if it's not a common handled error
      const data = await response
        .clone()
        .json()
        .catch(() => ({}));
      let errorMessage: string | undefined;

      // FastAPI 422 returns detail as an array of {type, loc, msg, input}
      if (Array.isArray(data.detail)) {
        const msgs = data.detail.map((v: any) =>
          typeof v === "string" ? v : v?.msg || JSON.stringify(v),
        );
        errorMessage = msgs.join("; ");
      } else if (typeof data.detail === "string") {
        errorMessage = data.detail;
      } else if (typeof data.detail === "object" && data.detail !== null) {
        errorMessage =
          (data.detail as any).msg ||
          (data.detail as any).message ||
          JSON.stringify(data.detail);
      } else if (typeof data.message === "string") {
        errorMessage = data.message;
      }

      if (!errorMessage && typeof data === "object" && data !== null) {
        // Handle field-level errors from DRF: {"email": ["Enter a valid email address."]}
        const firstKey = Object.keys(data).filter((k) => k !== "detail")[0];
        if (firstKey && Array.isArray(data[firstKey])) {
          errorMessage = `${firstKey}: ${data[firstKey][0]}`;
        } else if (firstKey && typeof data[firstKey] === "string") {
          errorMessage = `${firstKey}: ${data[firstKey]}`;
        }
      }

      errorMessage = errorMessage || "An error occurred. Please try again.";
      toast.error(String(errorMessage));
    }

    return response;
  } catch (error) {
    console.error("Fetch error:", error);
    toast.error("Network error. Please check your connection.");
    throw error;
  }
}

export async function fastAiFetch(
  endpoint: string,
  options: RequestInit = {},
  apiKey?: string,
) {
  const { user } = useStore.getState();

  if (user && user.is_active === false) {
    return new Response(JSON.stringify({ error: "account_inactive" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (apiKey && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }

  return fetch(`${FAST_AI_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

function buildQuery(params: any) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  return query.toString() ? `?${query.toString()}` : "";
}

export async function googleLogin(accessToken: string) {
  const response = await fetch(`${BASE_URL}/api/auth/google/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: accessToken,
    }),
  });
  return response;
}

export async function linkGoogle(accessToken: string) {
  const { accessToken: authAccessToken } = useStore.getState();
  const response = await fetch(`${BASE_URL}/api/auth/google/link/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authAccessToken}`,
    },
    body: JSON.stringify({
      access_token: accessToken,
    }),
  });
  return response;
}

export async function getNotes(params: any = {}) {
  const { myAccess, accessToken } = useStore.getState();
  if (accessToken && !myAccess) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (myAccess) {
    const canRead =
      myAccess.permissions?.includes("*") ||
      myAccess.permissions?.includes("notes.read");
    if (!canRead) {
      return new Response(
        JSON.stringify({ results: [], count: 0, error: "permission_denied" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
  return apiFetch(`/api/notes/${buildQuery(params)}`);
}

export async function createNote(data: {
  title: string;
  content: string;
  relatedPerson?: string;
  relatedCompany?: string;
}) {
  return apiFetch("/api/notes/", {
    method: "POST",
    body: JSON.stringify({
      title: data.title,
      content: data.content,
      related_person: data.relatedPerson,
      related_company: data.relatedCompany,
    }),
  });
}

export async function updateNote(
  id: string,
  data: Partial<{
    title: string;
    content: string;
    relatedPerson: string | null;
    relatedCompany: string | null;
  }>,
) {
  const payload: any = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.content !== undefined) payload.content = data.content;
  if (data.relatedPerson !== undefined)
    payload.related_person = data.relatedPerson;
  if (data.relatedCompany !== undefined)
    payload.related_company = data.relatedCompany;

  return apiFetch(`/api/notes/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteNote(id: string) {
  return apiFetch(`/api/notes/${id}/`, {
    method: "DELETE",
  });
}

// Companies
export async function getCompanies(params: any = {}) {
  const { myAccess, accessToken } = useStore.getState();
  if (accessToken && !myAccess) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (myAccess) {
    const canRead =
      myAccess.permissions?.includes("*") ||
      myAccess.permissions?.includes("companies.read");
    if (!canRead) {
      return new Response(
        JSON.stringify({ results: [], count: 0, error: "permission_denied" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
  return apiFetch(`/api/companies/${buildQuery(params)}`);
}

export async function getCompany(id: string) {
  return apiFetch(`/api/companies/${id}/`);
}

export async function createCompany(data: any) {
  return apiFetch("/api/companies/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCompany(id: string, data: any) {
  return apiFetch(`/api/companies/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCompany(id: string) {
  return apiFetch(`/api/companies/${id}/`, {
    method: "DELETE",
  });
}

// People
export async function getPeople(params: any = {}) {
  const { myAccess, accessToken } = useStore.getState();
  if (accessToken && !myAccess) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (myAccess) {
    const canRead =
      myAccess.permissions?.includes("*") ||
      myAccess.permissions?.includes("people.read");
    if (!canRead) {
      return new Response(
        JSON.stringify({ results: [], count: 0, error: "permission_denied" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
  return apiFetch(`/api/people/${buildQuery(params)}`);
}

export async function getPerson(id: string) {
  return apiFetch(`/api/people/${id}/`);
}

export async function createPerson(data: any) {
  return apiFetch("/api/people/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePerson(id: string, data: any) {
  return apiFetch(`/api/people/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deletePerson(id: string) {
  return apiFetch(`/api/people/${id}/`, {
    method: "DELETE",
  });
}

// Opportunities
export async function getOpportunities(params: any = {}) {
  const { myAccess, accessToken } = useStore.getState();
  if (accessToken && !myAccess) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (myAccess) {
    const canRead =
      myAccess.permissions?.includes("*") ||
      myAccess.permissions?.includes("opportunities.read");
    if (!canRead) {
      return new Response(
        JSON.stringify({ results: [], count: 0, error: "permission_denied" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
  return apiFetch(`/api/opportunities/${buildQuery(params)}`);
}

export async function getOpportunity(id: string) {
  return apiFetch(`/api/opportunities/${id}/`);
}

export async function createOpportunity(data: any) {
  return apiFetch("/api/opportunities/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateOpportunity(id: string, data: any) {
  return apiFetch(`/api/opportunities/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteOpportunity(id: string) {
  return apiFetch(`/api/opportunities/${id}/`, {
    method: "DELETE",
  });
}

// Tasks
export async function getTasks(params: any = {}) {
  const { myAccess, accessToken } = useStore.getState();
  if (accessToken && !myAccess) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (myAccess) {
    const canRead =
      myAccess.permissions?.includes("*") ||
      myAccess.permissions?.includes("tasks.read");
    if (!canRead) {
      return new Response(
        JSON.stringify({ results: [], count: 0, error: "permission_denied" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
  return apiFetch(`/api/tasks/${buildQuery(params)}`);
}

export async function createTask(data: any) {
  return apiFetch("/api/tasks/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTask(id: string, data: any) {
  return apiFetch(`/api/tasks/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTask(id: string) {
  return apiFetch(`/api/tasks/${id}/`, {
    method: "DELETE",
  });
}

// Activities
export async function getActivities(params: any = {}) {
  const { myAccess, accessToken } = useStore.getState();
  if (accessToken && !myAccess) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (myAccess) {
    const canRead =
      myAccess.permissions?.includes("*") ||
      myAccess.permissions?.includes("activities.read");
    if (!canRead) {
      return new Response(
        JSON.stringify({ results: [], count: 0, error: "permission_denied" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
  return apiFetch(`/api/activities/${buildQuery(params)}`);
}

export async function getActivity(id: string) {
  return apiFetch(`/api/activities/${id}/`);
}

export async function createActivity(data: any) {
  return apiFetch("/api/activities/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteActivity(id: string) {
  return apiFetch(`/api/activities/${id}/`, {
    method: "DELETE",
  });
}

// Custom Views
export async function getViews(params: any = {}) {
  return apiFetch(`/api/views/${buildQuery(params)}`);
}

export async function createView(data: any) {
  return apiFetch("/api/views/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateView(id: string, data: any) {
  return apiFetch(`/api/views/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteView(id: string) {
  return apiFetch(`/api/views/${id}/`, {
    method: "DELETE",
  });
}

// Reports
export async function getReports(params: any = {}) {
  const { myAccess, accessToken } = useStore.getState();

  // If we have an access token but permissions haven't loaded yet, skip the request
  // to avoid the 403 error. The ReportsPage component will handle the fetch once
  // myAccess is populated.
  if (accessToken && !myAccess) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If we have permissions, check them
  if (myAccess) {
    const canReadReports =
      myAccess.permissions?.includes("*") ||
      myAccess.permissions?.includes("reports.read");

    if (!canReadReports) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return apiFetch(`/api/reports/${buildQuery(params)}`);
}

export async function createReport(data: any) {
  return apiFetch("/api/reports/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateReport(id: string, data: any) {
  return apiFetch(`/api/reports/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteReport(id: string) {
  return apiFetch(`/api/reports/${id}/`, {
    method: "DELETE",
  });
}

export async function getSharedReport(id: string) {
  return apiFetch(`/api/reports/${id}/shared/`);
}

export async function importData(
  type: string,
  data: any[] | { data: any[]; auto_create?: any },
) {
  const endpointMap: Record<string, string> = {
    person: "/api/people/import/",
    company: "/api/companies/import/",
    task: "/api/tasks/import/",
    note: "/api/notes/import/",
    activity: "/api/activities/import/",
    opportunity: "/api/opportunities/import/",
  };

  const endpoint = endpointMap[type];
  if (!endpoint) throw new Error(`Unsupported import type: ${type}`);

  return apiFetch(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// CRM Configuration
export async function getCRMConfig() {
  return apiFetch("/api/config/mine/");
}

export async function updateCRMConfig(data: any) {
  return apiFetch("/api/config/mine/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function changePassword(data: any) {
  return apiFetch("/api/auth/password/change/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function register(data: any) {
  return fetch(`${BASE_URL}/api/auth/registration/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

// Onboarding
export async function createOnboarding(data: any) {
  return apiFetch("/api/onboarding/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function completeOnboarding() {
  return apiFetch("/api/onboarding/complete/", {
    method: "POST",
  });
}

// App Updates (Notifications/Roadmap)
export async function getAppUpdates(params: any = {}) {
  return apiFetch(`/api/app-updates/${buildQuery(params)}`);
}

export async function updateAppUpdate(id: string, data: any) {
  return apiFetch(`/api/app-updates/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Invitations
export async function createInvitation(
  type: "TEAM" | "EXTERNAL",
  email?: string,
  role?: string,
) {
  return apiFetch("/api/invitations/", {
    method: "POST",
    body: JSON.stringify({ type, email, role }),
  });
}

export async function getInvitationInfo(token: string) {
  return apiFetch(`/api/invitations/info/${token}/`);
}

export async function getOrgUsers() {
  const { myAccess, accessToken } = useStore.getState();
  if (accessToken && !myAccess) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (myAccess) {
    const canRead =
      myAccess.permissions?.includes("*") ||
      myAccess.permissions?.includes("users.manage");
    if (!canRead) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  return apiFetch("/api/org-users/");
}

export async function toggleUserActive(userId: string | number) {
  return apiFetch(`/api/org-users/${userId}/toggle-active/`, {
    method: "POST",
  });
}

export async function getRoles() {
  return apiFetch("/api/roles/");
}

export async function createRole(data: {
  name: string;
  permissions: string[];
  hidden_fields: Record<string, string[]>;
}) {
  return apiFetch("/api/roles/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRole(
  id: string,
  data: Partial<{
    name: string;
    permissions: string[];
    hidden_fields: Record<string, string[]>;
  }>,
) {
  return apiFetch(`/api/roles/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function assignRole(userId: string | number, roleId: string) {
  return apiFetch("/api/roles/assign/", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      role_id: roleId,
    }),
  });
}

export async function getMyRolePermissions() {
  return apiFetch("/api/roles/my-permissions/");
}

export async function globalSearch(query: string) {
  if (!query.trim()) return { results: [] };
  const encoded = encodeURIComponent(query.trim());
  return apiFetch(`/api/search/?q=${encoded}`).then((r) => r.json());
}

export async function getUserDetails() {
  return apiFetch("/api/auth/user/");
}

export async function resendVerificationEmail() {
  return apiFetch("/api/verification/resend-email/", {
    method: "POST",
  });
}

// API Keys
export async function getAPIKeys() {
  const { myAccess, accessToken } = useStore.getState();

  if (accessToken && !myAccess) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (myAccess) {
    const canManageConfig =
      myAccess.permissions?.includes("*") ||
      myAccess.permissions?.includes("config.manage");

    if (!canManageConfig) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return apiFetch("/api/integrations/api-keys/");
}

export async function createAPIKey(
  name: string,
  scopes?: string[],
  expiresAt?: string | null,
) {
  const payload: any = { name };
  if (scopes && scopes.length > 0) {
    payload.scopes = scopes;
  }
  if (expiresAt) {
    payload.expires_at = expiresAt;
  }

  return apiFetch("/api/integrations/api-keys/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function revokeAPIKey(id: string) {
  return apiFetch(`/api/integrations/api-keys/${id}/revoke/`, {
    method: "POST",
  });
}

export async function reactivateAPIKey(id: string) {
  return apiFetch(`/api/integrations/api-keys/${id}/reactivate/`, {
    method: "POST",
  });
}

export async function deleteAPIKey(id: string) {
  return apiFetch(`/api/integrations/api-keys/${id}/`, {
    method: "DELETE",
  });
}

// Credentials (Telegram Agent)
export async function hasCredential() {
  const { myAccess, accessToken } = useStore.getState();

  // If we have an access token but permissions haven't loaded yet, skip the request
  if (accessToken && !myAccess) {
    return new Response(JSON.stringify({ has_credential: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (myAccess) {
    const canUseAgent =
      myAccess.permissions?.includes("*") ||
      myAccess.permissions?.includes("agent.use");

    if (!canUseAgent) {
      return new Response(JSON.stringify({ has_credential: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return apiFetch("/api/integrations/credentials/has-credential/");
}

export async function createCredential(
  keysData: { name: string; value: string }[],
) {
  return apiFetch("/api/integrations/credentials/", {
    method: "POST",
    body: JSON.stringify({ keys_data: keysData }),
  });
}

export async function addCredentialKeys(
  credentialId: string,
  keyData: { name: string; value: string },
) {
  return apiFetch(`/api/integrations/credentials/${credentialId}/add-keys/`, {
    method: "POST",
    body: JSON.stringify(keyData),
  });
}

// AI Endpoints
export const fastai = {
  parseConversation: async (personId: string, text: string) => {
    return fastAiFetch("/ai/parse-conversation", {
      method: "POST",
      body: JSON.stringify({
        person_id: personId,
        conversation_text: text,
      }),
    });
  },
  processLead: async (payload: any) => {
    return fastAiFetch("/ai/process-lead", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  sendTelegramMessage: async (
    userId: string,
    message: string,
    apiKey?: string,
  ) => {
    return fastAiFetch(
      "/telegram/send-message",
      {
        method: "POST",
        body: JSON.stringify({ user_id: userId, message }),
      },
      apiKey,
    );
  },
};

export async function parseConversation(personId: string, text: string) {
  // Clean ONLY the specific LinkedIn default reaction combination sequence
  const cleanedText = text.replace(/🙃\s*👏\s*👍/g, "").trim();

  return fastai.parseConversation(personId, cleanedText);
}

// Interaction Types
export async function getInteractionTypes(params: any = {}) {
  return apiFetch(`/api/interaction-types/${buildQuery(params)}`);
}

export async function createInteractionType(data: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}) {
  return apiFetch("/api/interaction-types/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateInteractionType(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    color: string;
    icon: string;
  }>,
) {
  return apiFetch(`/api/interaction-types/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteInteractionType(id: string) {
  return apiFetch(`/api/interaction-types/${id}/`, {
    method: "DELETE",
  });
}

// Interaction Logs
export async function getInteractions(params: any = {}) {
  const { myAccess, accessToken } = useStore.getState();
  if (accessToken && !myAccess) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (myAccess) {
    const canRead =
      myAccess.permissions?.includes("*") ||
      myAccess.permissions?.includes("interactions.read");
    if (!canRead) {
      return new Response(
        JSON.stringify({ results: [], count: 0, error: "permission_denied" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
  return apiFetch(`/api/interactions/${buildQuery(params)}`);
}

export async function createInteraction(data: {
  interaction_type: string;
  related_person?: string;
  related_company?: string;
  notes?: string;
  date?: string;
  activity_log?: string;
}) {
  return apiFetch("/api/interactions/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateInteraction(
  id: string,
  data: Partial<{
    interaction_type: string;
    related_person: string | null;
    related_company: string | null;
    notes: string;
    date: string;
    activity_log: string | null;
  }>,
) {
  return apiFetch(`/api/interactions/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteInteraction(id: string) {
  return apiFetch(`/api/interactions/${id}/`, {
    method: "DELETE",
  });
}

// Dashboard Configs
export async function getDashboardConfig(chartId: string) {
  return apiFetch(`/api/dashboard-configs/by-chart/${chartId}/`);
}

export async function updateDashboardConfig(chartId: string, config: any) {
  return apiFetch(`/api/dashboard-configs/by-chart/${chartId}/`, {
    method: "POST",
    body: JSON.stringify({ config }),
  });
}

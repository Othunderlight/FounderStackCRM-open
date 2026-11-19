"""HTTP client for the Zernio API.

The client is intentionally small and dependency-light: it mirrors the parts of
the API documented in ``dernio-docs`` and keeps retry/idempotency handling in
one place.  Services in :mod:`integrations.zernio.services` build the local
database state on top of it.
"""

from __future__ import annotations

import time
from typing import Any

import requests
from django.conf import settings


class ZernioAPIError(Exception):
    """An error returned by, or while talking to, the Zernio API."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        code: str | None = None,
        details: Any = None,
        response: requests.Response | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details
        self.response = response

    def __str__(self) -> str:
        if self.status_code:
            return f"Zernio API error ({self.status_code}): {self.message}"
        return f"Zernio API error: {self.message}"


class ZernioConfigurationError(ZernioAPIError):
    """Raised when the integration has not been configured."""

    def __init__(self, message: str):
        super().__init__(
            message,
            status_code=503,
            code="zernio_not_configured",
        )


class ZernioClient:
    """Thin wrapper around the Zernio REST API."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        *,
        timeout: int = 30,
        max_retries: int = 2,
        session: requests.Session | None = None,
    ):
        self.api_key = api_key or getattr(settings, "ZERNIO_API_KEY", "")
        self.base_url = (
            base_url
            or getattr(settings, "ZERNIO_API_BASE_URL", "")
            or "https://zernio.com/api/v1"
        ).rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.session = session or requests.Session()

        if not self.api_key:
            raise ZernioConfigurationError(
                "ZERNIO_API_KEY is not configured. Add it to the environment."
            )

    # ------------------------------------------------------------------
    # Core request handling
    # ------------------------------------------------------------------
    def _url(self, path: str) -> str:
        return f"{self.base_url}/{path.lstrip('/')}"

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        timeout: int | None = None,
    ) -> Any:
        request_headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
        }
        if json is not None:
            request_headers["Content-Type"] = "application/json"
        if headers:
            request_headers.update(headers)

        # Drop None values so optional query arguments do not leak as "None".
        clean_params = (
            {key: value for key, value in params.items() if value is not None}
            if params
            else None
        )

        response: requests.Response | None = None
        for attempt in range(self.max_retries + 1):
            try:
                response = self.session.request(
                    method,
                    self._url(path),
                    params=clean_params,
                    json=json,
                    headers=request_headers,
                    timeout=timeout or self.timeout,
                )
            except requests.RequestException as exc:
                if attempt < self.max_retries:
                    time.sleep(min(2**attempt, 5))
                    continue
                raise ZernioAPIError(f"Could not reach Zernio: {exc}") from exc

            if response.status_code == 429 and attempt < self.max_retries:
                delay = self._retry_after_seconds(response)
                time.sleep(min(delay, 60))
                continue
            break

        assert response is not None
        payload = self._decode(response)

        if response.status_code >= 400:
            error = payload if isinstance(payload, dict) else {}
            raise ZernioAPIError(
                error.get("error")
                or error.get("message")
                or response.text[:500]
                or "Request failed",
                status_code=response.status_code,
                code=error.get("code"),
                details=error.get("details"),
                response=response,
            )

        return payload

    def _request_all_pages(
        self,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        page_param: str = "page",
        pages_key: str = "pages",
        data_key: str = "data",
        limit: int = 50,
        max_pages: int = 50,
    ) -> list[Any]:
        """Fetch a paginated `page`/`pages` response and return all rows."""
        results: list[Any] = []
        page = 1
        while page <= max_pages:
            page_params = dict(params or {})
            page_params[page_param] = page
            page_params.setdefault("limit", limit)
            payload = self._request("GET", path, params=page_params)

            rows = self._extract_list(payload, data_key)
            results.extend(rows)

            pagination = payload.get("pagination", {}) if isinstance(payload, dict) else {}
            total_pages = pagination.get(pages_key)
            if total_pages is None:
                total_pages = pagination.get("totalPages")
            if not total_pages or page >= int(total_pages):
                break
            page += 1
        return results

    @staticmethod
    def _retry_after_seconds(response: requests.Response) -> float:
        retry_after = response.headers.get("Retry-After")
        if retry_after:
            try:
                return max(float(retry_after), 1)
            except (TypeError, ValueError):
                pass
        try:
            payload = response.json()
            details = payload.get("details", {}) if isinstance(payload, dict) else {}
            return max(float(details.get("retryAfterSeconds", 5)), 1)
        except (ValueError, AttributeError):
            return 5

    @staticmethod
    def _decode(response: requests.Response) -> Any:
        if not response.content:
            return {}
        try:
            return response.json()
        except ValueError:
            return {"raw": response.text}

    @staticmethod
    def _extract_list(payload: Any, key: str = "data") -> list[Any]:
        if isinstance(payload, list):
            return payload
        if not isinstance(payload, dict):
            return []
        value = payload.get(key)
        if isinstance(value, list):
            return value
        for fallback in ("data", "accounts", "conversations", "messages"):
            value = payload.get(fallback)
            if isinstance(value, list):
                return value
        return []

    # ------------------------------------------------------------------
    # Profiles
    # ------------------------------------------------------------------
    def create_profile(self, name: str, external_id: str | None = None) -> dict:
        body: dict[str, Any] = {"name": name}
        if external_id:
            body["externalId"] = external_id
        return self._request("POST", "/profiles", json=body)

    def list_profiles(self, external_id: str | None = None) -> dict:
        return self._request(
            "GET",
            "/profiles",
            params={"externalId": external_id} if external_id else None,
        )

    def get_profile(self, profile_id: str) -> dict:
        return self._request("GET", f"/profiles/{profile_id}")

    def delete_profile(self, profile_id: str) -> dict:
        return self._request("DELETE", f"/profiles/{profile_id}")

    # ------------------------------------------------------------------
    # Account connection / health
    # ------------------------------------------------------------------
    def get_connect_url(
        self,
        platform: str,
        profile_id: str,
        *,
        redirect_url: str | None = None,
        headless: bool | None = None,
        welcome: bool | None = None,
        oauth_app_id: str | None = None,
        **extra: Any,
    ) -> dict:
        params: dict[str, Any] = {
            "profileId": profile_id,
            "redirect_url": redirect_url,
            "headless": headless,
            "welcome": welcome,
            "oauthAppId": oauth_app_id,
        }
        params.update(extra)
        return self._request("GET", f"/connect/{platform}", params=params)

    def get_welcome_screen(self) -> dict:
        return self._request("GET", "/connect/welcome-screen")

    def update_welcome_screen(self, payload: dict[str, Any]) -> dict:
        return self._request("PUT", "/connect/welcome-screen", json=payload)

    def list_accounts(self, profile_id: str | None = None) -> dict:
        return self._request(
            "GET", "/accounts", params={"profileId": profile_id} if profile_id else None
        )

    def get_accounts_health(
        self, profile_id: str | None = None, status: str | None = None
    ) -> dict:
        params: dict[str, Any] = {}
        if profile_id:
            params["profileId"] = profile_id
        if status:
            params["status"] = status
        return self._request("GET", "/accounts/health", params=params or None)

    def delete_account(self, account_id: str) -> dict:
        return self._request("DELETE", f"/accounts/{account_id}")

    # ------------------------------------------------------------------
    # Publishing
    # ------------------------------------------------------------------
    def create_post(
        self,
        content: str,
        platforms: list[dict[str, Any]],
        *,
        publish_now: bool = True,
        scheduled_for: str | None = None,
        **extra: Any,
    ) -> dict:
        body: dict[str, Any] = {
            "content": content,
            "platforms": platforms,
            "publishNow": publish_now,
        }
        if scheduled_for:
            body["scheduledFor"] = scheduled_for
        body.update({key: value for key, value in extra.items() if value is not None})
        return self._request("POST", "/posts", json=body)

    def list_posts(self, **params: Any) -> dict:
        return self._request("GET", "/posts", params=params or None)

    def get_post(self, post_id: str) -> dict:
        return self._request("GET", f"/posts/{post_id}")

    def delete_post(self, post_id: str) -> dict:
        return self._request("DELETE", f"/posts/{post_id}")

    # ------------------------------------------------------------------
    # Analytics
    # ------------------------------------------------------------------
    def get_analytics(self, **params: Any) -> dict:
        return self._request("GET", "/analytics", params=params or None)

    def get_analytics_dashboard(self, **params: Any) -> dict:
        return self._request("GET", "/analytics/dashboard", params=params or None)

    def get_daily_metrics(self, **params: Any) -> dict:
        return self._request("GET", "/analytics/daily-metrics", params=params or None)

    def get_follower_stats(self, **params: Any) -> dict:
        return self._request("GET", "/accounts/follower-stats", params=params or None)

    def get_analytics_delta(self, cursor: str | None = None, **params: Any) -> dict:
        if cursor:
            params["cursor"] = cursor
        return self._request("GET", "/analytics/delta", params=params or None)

    def sync_external_post(self, account_id: str, url: str) -> dict:
        return self._request(
            "POST",
            "/posts/sync-external",
            json={"accountId": account_id, "url": url},
        )

    # ------------------------------------------------------------------
    # Inbox / DMs
    # ------------------------------------------------------------------
    def list_inbox_conversations(self, **params: Any) -> dict:
        return self._request("GET", "/inbox/conversations", params=params or None)

    def get_inbox_conversation_messages(
        self, conversation_id: str, **params: Any
    ) -> dict:
        return self._request(
            "GET",
            f"/inbox/conversations/{conversation_id}/messages",
            params=params or None,
        )

    def send_inbox_message(
        self,
        conversation_id: str,
        account_id: str,
        message: str,
        *,
        idempotency_key: str | None = None,
        attachments: list[Any] | None = None,
    ) -> dict:
        body: dict[str, Any] = {"accountId": account_id, "message": message}
        if attachments:
            body["attachments"] = attachments
        headers = {"Idempotency-Key": idempotency_key} if idempotency_key else None
        return self._request(
            "POST",
            f"/inbox/conversations/{conversation_id}/messages",
            json=body,
            headers=headers,
        )

    def mark_conversation_read(self, conversation_id: str, account_id: str) -> dict:
        return self._request(
            "POST",
            f"/inbox/conversations/{conversation_id}/read",
            json={"accountId": account_id},
        )

    def send_typing_indicator(self, conversation_id: str, account_id: str) -> dict:
        return self._request(
            "POST",
            f"/inbox/conversations/{conversation_id}/typing",
            json={"accountId": account_id},
        )

    # ------------------------------------------------------------------
    # White-label platform apps
    # ------------------------------------------------------------------
    def list_oauth_apps(self) -> dict:
        return self._request("GET", "/connect/oauth-apps")

    def create_oauth_app(self, payload: dict[str, Any]) -> dict:
        return self._request("POST", "/connect/oauth-apps", json=payload)

    def update_oauth_app(self, app_id: str, payload: dict[str, Any]) -> dict:
        return self._request("PATCH", f"/connect/oauth-apps/{app_id}", json=payload)

    def delete_oauth_app(self, app_id: str, confirm: bool = False) -> dict:
        return self._request(
            "DELETE",
            f"/connect/oauth-apps/{app_id}",
            params={"confirm": "true"} if confirm else None,
        )

    def test_oauth_app(self, app_id: str) -> dict:
        return self._request("POST", f"/connect/oauth-apps/{app_id}/test")


def get_zernio_client() -> ZernioClient:
    """Return a configured client or raise a clear configuration error."""
    return ZernioClient()

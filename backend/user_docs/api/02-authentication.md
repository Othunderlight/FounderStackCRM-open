# Authentication

To access the API, you must provide a valid API Key in the header of every request.

## The Authorization Header
Use the `Authorization` header with the prefix `Api-Key`.

**Example:**
`Authorization: Api-Key yourapikey`

## Generating a Key
1. Go to your CRM Settings or the Admin Panel.
2. Select **API Keys** -> **Create New**.
3. Give your key a descriptive name (e.g., "n8n Integration").
4. **Copy the key immediately.** For security reasons, the full key is only shown once.

## Security Best Practices
*   **Never share your API Key.**
*   If a key is compromised, **revoke it immediately** from the dashboard.
*   Use **Scopes** to limit what the key can do (e.g., a "Read Only" key for a dashboard).

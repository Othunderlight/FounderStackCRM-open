<div align="center">

# FounderStack CRM — MCP Server

A FastAPI-based [Model Context Protocol](https://modelcontextprotocol.io/) server that gives AI assistants (Claude, Cursor, Gemini CLI, etc.) secure, authenticated access to your CRM data.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&style=flat)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&style=flat)
![FastMCP](https://img.shields.io/badge/FastMCP-3.0-7c3aed?style=flat)

</div>

---

## What is This?

This MCP server acts as a bridge between AI assistants and the [FounderStack CRM backend](https://github.com/Othunderlight/FounderStackCRM-open). It exposes CRM operations (people, companies, tasks, notes, activities, interactions) as MCP tools that any compatible AI client can call — with full authentication via JWT tokens or API keys.

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  MCP Client  │◄───────►│  MCP Server  │◄───────►│   Django     │
│  (Claude,    │  MCP    │  (FastAPI)   │  REST   │   Backend    │
│   Cursor,    │  +JWT/  │  Port 10000  │  API    │   Port 8010  │
│   etc.)      │  APIKey │              │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
```

---

## Project Structure

```
mcp-server/
├── src/
│   ├── server.py          # FastAPI app, middleware, MCP mount, health check
│   ├── config.py          # Environment variable loading (Settings class)
│   ├── auth.py            # Auth middleware — JWT Bearer + API Key validation
│   ├── oauth.py           # OAuth2 Authorization Server (dynamic client registration, token exchange)
│   ├── tools.py           # MCP tool definitions (CRM operations exposed to AI clients)
│   └── tools_utils.py     # Django API helper functions used by tools
├── .env.example           # Environment variable template
├── Dockerfile             # Multi-stage Python 3.11 build
├── docker-compose.yml     # Single-service deployment
├── pyproject.toml         # Project metadata and dependencies
├── requirements.txt       # Pip-compatible dependencies
└── README.md
```

---

## Architecture

```mermaid
graph TB
    subgraph "MCP Clients"
        C1[Claude Desktop]
        C2[Cursor]
        C3[Gemini CLI]
        C4[Other MCP Clients]
    end

    subgraph "MCP Server (FastAPI)"
        Auth[Auth Middleware]
        OAuth[OAuth2 Router]
        MCP[MCP Tools]
        Health[Health Check]
    end

    subgraph "Django Backend"
        API[REST API]
        JWKS[JWKS Endpoint]
    end

    C1 & C2 & C3 & C4 -->|MCP Protocol + JWT/APIKey| Auth
    Auth --> MCP
    OAuth -->|Token Exchange| API
    MCP -->|REST + JWT/APIKey| API
    Auth -->|Validate JWT| JWKS

    subgraph "Auth Methods"
        JWT[JWT Bearer Token]
        APIKey[API Key]
    end

    JWT & APIKey --> Auth
```

### Request Flow

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Server as MCP Server
    participant Django as Django Backend

    Client->>Server: MCP Request + Bearer JWT / Api-Key header
    Server->>Server: AuthMiddleware validates token
    alt API Key
        Server->>Django: GET /api/connection-test/ (Api-Key header)
        Django-->>Server: 200 OK (user info)
    else JWT Bearer
        Server->>Server: Forward token to Django
    end
    Server->>Django: Proxied API request
    Django-->>Server: JSON response
    Server-->>Client: MCP tool result
```

---

## Authentication

The server supports two authentication methods:

### 1. JWT Bearer Token (User Login)

Users authenticate through the CRM frontend (normal login), which returns a JWT access token. This token is passed to the MCP server via the `Authorization: Bearer <token>` header.

```bash
# Login to get JWT
curl -X POST http://localhost:8010/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "your-password"}'

# Use JWT with MCP server
curl -X POST http://localhost:10000/mcp/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### 2. API Key (Programmatic Access)

Generate an API key from **Settings > API Keys** in the CRM. Pass it via the `Api-Key` header or `Authorization: Api-Key <key>` header.

```bash
# Use API Key with MCP server
curl -X POST http://localhost:10000/mcp/ \
  -H "Api-Key your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### OAuth2 Flow (for AI Desktop Apps)

MCP clients like Claude Desktop support automatic OAuth2 authentication:

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant MCP as MCP Server
    participant Frontend as React Frontend
    participant Django as Django Backend

    Client->>MCP: GET /.well-known/oauth-protected-resource/mcp
    MCP-->>Client: Authorization server metadata

    Client->>MCP: POST /oauth2/register (dynamic client registration)
    MCP-->>Client: client_id + client_secret

    Client->>MCP: GET /oauth2/authorize?client_id=...
    MCP->>Frontend: Redirect to /#/mcp/connect (login page)
    Frontend->>Django: User authenticates (email/password or Google)
    Django-->>Frontend: JWT access token
    Frontend->>MCP: GET /oauth2/callback?token=<jwt>
    MCP-->>Client: Authorization code
    Client->>MCP: POST /oauth2/token (exchange code for JWT)
    MCP-->>Client: JWT access token
```

---

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `list_people` | List all people with optional search, filters, pagination |
| `get_person` | Get a specific person by ID |
| `get_person_context` | Get related data (activities, tasks, notes) for a person |
| `create_person` | Create a new person |
| `update_person` | Update an existing person |
| `list_companies` | List all companies with optional search, filters, pagination |
| `get_company` | Get a specific company by ID |
| `create_company` | Create a new company |
| `update_company` | Update an existing company |
| `list_tasks` | List all tasks with optional search, filters, pagination |
| `get_task` | Get a specific task by ID |
| `create_task` | Create a new task |
| `update_task` | Update an existing task |
| `list_notes` | List all notes with optional search, filters, pagination |
| `create_note` | Create a new note |
| `update_note` | Update an existing note |
| `list_activities` | List all activities with optional search, filters, pagination |
| `create_activity` | Create a new activity log |
| `update_activity` | Update an existing activity |
| `list_interaction_types` | List interaction types (call, meeting, email, etc.) |
| `create_interaction_type` | Create a new interaction type |
| `list_interactions` | List interaction logs |
| `create_interaction` | Create a new interaction log |
| `update_interaction` | Update an existing interaction |
| `global_search` | Search across People, Companies, Tasks, and Notes |

---

## Setup

### Prerequisites

- Python 3.11+
- A running [FounderStack CRM backend](https://github.com/Othunderlight/FounderStackCRM-open/blob/main/backend/README.md)

### 1. Install Dependencies

```bash
cd mcp-server
pip install -e .
```

Or with [uv](https://docs.astral.sh/uv/):

```bash
uv pip install -e .
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Point to your running Django backend
DJANGO_BASE_URL=http://127.0.0.1:8000

# Your React frontend URL (for OAuth login redirect)
FRONTEND_URL=http://localhost:3000

# This server's public URL (for OAuth metadata)
MCP_PUBLIC_BASE_URL=http://127.0.0.1:10000

# Must match Django's JWT settings
JWT_AUDIENCE=cccrm-api
JWT_ISSUER=cccrm-backend
```

### 3. Run the Server

```bash
# Using the entry point
mcp-server

# Or with uvicorn
uvicorn src.server:app --host 127.0.0.1 --port 10000 --reload
```

### Docker

```bash
docker-compose up --build
```

The server runs at `http://localhost:10000`.

---

## Django Backend Setup

Your Django backend needs a JWKS endpoint for JWT validation. The MCP server fetches public keys from `{DJANGO_BASE_URL}/auth/.well-known/jwks.json`.

Ensure your Django `settings.py` has:

```python
SIMPLE_JWT = {
    'ALGORITHM': 'RS256',
    'SIGNING_KEY': env('JWT_PRIVATE_KEY'),      # Private key for signing
    'VERIFYING_KEY': env('JWT_PUBLIC_KEY'),      # Public key for verification (shared with MCP)
    'AUDIENCE': env('JWT_AUDIENCE', default='cccrm-api'),
    'ISSUER': env('JWT_ISSUER', default='cccrm-backend'),
}
```

Generate JWT keys if you haven't already:

```bash
python -c "
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public_key = private_key.public_key()
with open('jwt_private_key.pem', 'wb') as f:
    f.write(private_key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
with open('jwt_public_key.pem', 'wb') as f:
    f.write(public_key.public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))
"
```

---

## Well-Known Endpoints

The server exposes standard OAuth2 discovery endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /.well-known/oauth-authorization-server` | Authorization Server Metadata |
| `GET /.well-known/oauth-protected-resource/mcp` | Protected Resource Metadata (RFC 9728) |
| `GET /health` | Health check |

---

## Configuration Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DJANGO_BASE_URL` | Django backend URL | `http://127.0.0.1:8000` |
| `FRONTEND_URL` | React frontend URL (OAuth redirect) | `http://localhost:3000` |
| `MCP_PUBLIC_BASE_URL` | This server's public URL | `http://127.0.0.1:10000` |
| `PORT` | Server port | `10000` |
| `JWT_AUDIENCE` | Expected JWT audience claim | `cccrm-api` |
| `JWT_ISSUER` | Expected JWT issuer claim | `cccrm-backend` |
| `JWKS_CACHE_TTL` | JWKS key cache TTL (seconds) | `3600` |
| `TAVILY_API_KEY` | Tavily API key (optional, for web search) | — |

---

## Connecting MCP Clients

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "founderstack-crm": {
      "url": "http://localhost:10000/mcp/",
      "transport": "streamable-http"
    }
  }
}
```

### Cursor

1. Open Settings > MCP
2. Add new MCP server with URL: `http://localhost:10000/mcp/`
3. The OAuth2 flow will handle authentication automatically

### Gemini CLI

```bash
# The server auto-discovers via OpenID Connect
gemini --mcp http://localhost:10000/mcp/
```

---

## Adding Custom Tools

Add tools to `src/tools.py`:

```python
@mcp.tool()
async def my_custom_tool(param1: str, param2: int = 0) -> Dict:
    """Description of what this tool does.

    Args:
        param1: Description of param1.
        param2: Description of param2.
    """
    user_info = get_current_user()
    if not user_info:
        raise Exception("User not authenticated")

    try:
        result = await make_django_request("/api/my-endpoint/", "GET")
        return {
            "results": result,
            "user_id": user_info.get("id"),
            "status": "success",
        }
    except Exception as e:
        return {"error": str(e), "user_id": user_info.get("id"), "status": "Failed"}
```

Tools have access to:
- `get_current_user()` — authenticated user info from the JWT/API key
- `get_current_token()` — the raw token for forwarding to Django
- `make_django_request(endpoint, method, data, params)` — authenticated Django API client

---

## License

MIT

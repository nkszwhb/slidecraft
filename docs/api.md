# HTTP API

All routes are same-origin JSON endpoints unless noted. Authentication uses the
HttpOnly `slidecraft_session` cookie set by `POST /api/auth/login`. There is no
public API-token system.

If `ADMIN_PASSWORD` is empty, authentication is disabled. This is intended for
local development only.

## Public

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Database/queue health; returns 503 if PostgreSQL is unavailable |
| `GET` | `/api/version` | Application name and version |
| `GET` | `/api/auth/status` | Whether authentication is required and whether the session is valid |
| `POST` | `/api/auth/login` | `{ email, password }`; sets the session cookie |
| `POST` | `/api/auth/logout` | Clears the session cookie |
| `GET` | `/api/themes` | Theme catalog |
| `GET` | `/api/themes/:id` | Theme details and layouts |

## Tasks

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks` | List recent tasks |
| `GET` | `/api/tasks/:id` | Task, steps, events, assets, artifacts, settings, outline |
| `POST` | `/api/tasks/:id/requirements` | Confirm the requirements form |
| `POST` | `/api/tasks/:id/theme` | Select a theme |
| `POST` | `/api/tasks/:id/assets` | Multipart upload (`file`, optional `purpose`) |
| `POST` | `/api/tasks/:id/assets/skip` | Explicitly skip materials |
| `POST` | `/api/tasks/:id/outline/generate` | Enqueue outline generation |
| `POST` | `/api/tasks/:id/outline/confirm` | Persist the edited outline and enqueue proof |
| `POST` | `/api/tasks/:id/proof/confirm` | Confirm the two-slide proof and enqueue the full deck |
| `POST` | `/api/tasks/:id/retry` | Retry the failed stage |
| `GET` | `/api/tasks/:id/events` | SSE stream of task events |
| `GET` | `/api/tasks/:id/artifacts/:artifactId` | Download a proof/PPTX artifact |

### Create a task

```bash
curl -sS http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{
    "prompt": "为设计团队制作 5 页 AI 原型评审方法分享",
    "themeId": "modern-minimal",
    "recipeId": "training",
    "pageCount": 5,
    "language": "zh-CN",
    "ratio": "16:9",
    "settings": {
      "motion": {
        "style": "dynamic",
        "transition": "fade",
        "elementSequence": "sequence"
      },
      "contentDensity": "concise",
      "showPageNumbers": true,
      "showFooter": true
    }
  }'
```

Response:

```json
{ "id": "uuid" }
```

### Confirm requirements

```bash
curl -sS http://localhost:3000/api/tasks/<id>/requirements \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{
    "topic": "AI 原型评审方法",
    "audience": "产品设计师与设计负责人",
    "goal": "建立可复用的评审流程和判断标准",
    "language": "zh-CN",
    "pageCount": 5,
    "ratio": "16:9",
    "tone": "克制、专业、清晰",
    "constraints": "第 3 页流程步骤逐项飞入"
  }'
```

### Upload material

```bash
curl -sS http://localhost:3000/api/tasks/<id>/assets \
  -H 'Cookie: slidecraft_session=...' \
  -F 'file=@source.pdf' \
  -F 'purpose=content'
```

Allowed types: PDF, PPTX, DOCX, XLSX, TXT, Markdown, CSV, PNG, JPEG, WebP.
Maximum size is 50MB. The server validates the file signature and Office ZIP
content type; a renamed executable is rejected.

### SSE events

```bash
curl -N -b cookies.txt http://localhost:3000/api/tasks/<id>/events
```

Events include stage progress, errors, motion application, quality checks, and
completion. Reconnect with the browser's `EventSource`; the task record remains
the source of truth.

## Error format

Nuxt/H3 errors use an HTTP status and a `statusMessage`. Common statuses:

- `400` invalid input
- `401` missing or invalid session
- `404` task, asset, or artifact not found
- `409` task is not in a state that allows the action
- `413` upload exceeds 50MB
- `415` unsupported or mismatched file type
- `429` login rate limit
- `503` database unavailable (health endpoint)

## Authentication example

```bash
curl -sS -c cookies.txt http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"..."}'
```

Do not put credentials in shell history on a shared machine. The cookie is
HttpOnly and SameSite=Lax; HTTPS is required for secure cookies in production.

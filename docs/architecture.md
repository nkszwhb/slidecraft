# Architecture

SlideCraft is a single-tenant, self-hosted Nuxt application with a separate
background Worker. The web process accepts user actions and reads task state;
the Worker owns model calls, rendering, OfficeCLI mutation, and validation.

## System context

```text
┌──────────────┐       REST / SSE        ┌────────────────────┐
│   Browser    │ ──────────────────────▶ │  Nuxt / Nitro Web  │
│ Nuxt + Vue   │ ◀────────────────────── │  API + SSR         │
└──────────────┘                         └─────────┬──────────┘
                                                   │ SQL
                                                   ▼
                                         ┌────────────────────┐
                                         │    PostgreSQL      │
                                         │ tasks, events,     │
                                         │ assets, providers  │
                                         └─────────┬──────────┘
                                                   │ pg-boss
                                                   ▼
                                         ┌────────────────────┐
                                         │   Node Worker      │
                                         │ outline / render / │
                                         │ OfficeCLI / check  │
                                         └───────┬────────────┘
                                                 │
                       ┌─────────────────────────┼─────────────────────────┐
                       ▼                         ▼                         ▼
               Model providers            PptxGenJS + OfficeCLI       DATA_DIR
               text / vision              PPTX + native motion        files
```

## Runtime components

### Web (`app/`, `server/api/`)

- Nuxt 4 SSR and Vue 3 client.
- API routes validate input with Zod, enforce authentication, and enqueue work.
- SSE endpoint streams task events for progress and resume.
- The browser never receives provider API keys.

### Worker (`worker/index.ts`)

- Consumes the `ppt-generation` pg-boss queue.
- Stages: `outline`, `proof`, `generate`.
- Uses the same task service and database schema as the web process.
- Runs model requests, PptxGenJS rendering, OfficeCLI animation injection, and
  OfficeCLI validation.
- Handles `SIGINT`/`SIGTERM` with a graceful queue stop.

### PostgreSQL

- Source of truth for tasks, step state, events, assets, artifacts, providers,
  and models.
- `pg-boss` uses the `pgboss` schema for durable jobs.
- Migrations live in `server/database/migrations/`; the runner records versions
  in `schema_migrations` and serializes upgrades with an advisory lock.

### Data directory

`DATA_DIR` stores uploaded assets, generated proof files, and final PPTX files.
The database stores metadata and storage keys, never the binary content.

## Task state machine

```text
draft
  → requirements
  → theme
  → assets
  → outline
  → proof
  → generate
  → delivery
```

`waiting_input` means the task is paused for a human decision. `running` means a
Worker stage is active. `failed` retains the error and the step state so a retry
can resume from the failed stage.

## AI control boundary

The model is deliberately constrained:

1. It can only choose themes, recipes, layout IDs, and semantic animation targets
   that are registered in `shared/theme/catalog.ts` and
   `shared/domain/schemas.ts`.
2. It cannot emit raw OOXML, coordinates, CSS, selectors, URLs, or shell commands.
3. Outline output is validated by Zod before persistence.
4. Motion output is repaired server-side:
   - repeated or impossible targets are mapped to targets that the selected
     layout actually renders;
   - unavailable targets are dropped;
   - each target group appears at most once per slide;
   - item sequences use one rule with a sequence mode.
5. The renderer owns all visual geometry and PowerPoint packaging.

## Rendering and motion pipeline

```text
outline + theme + settings
  → PptxGenJS writes slide shapes with semantic object names
  → JSZip reads shape names from the generated package
  → shared/presentation/motion.ts builds an OfficeCLI batch
  → OfficeCLI writes slide transitions and shape animations
  → OfficeCLI validates the package
  → PowerPoint manual QA (release gate)
```

Important compatibility rule: do not reorder PptxGenJS package parts after
generation. OfficeCLI mutation must be additive; a PowerPoint repair prompt is a
release blocker.

## Provider abstraction

`server/services/providers.ts` resolves a runtime provider and model.
`server/services/llm.ts` adapts the four supported protocols behind one request
contract:

- OpenAI Chat Completions
- OpenAI Completions
- OpenAI Responses
- Anthropic Messages

Provider secrets are encrypted with AES-256-GCM using `APP_SECRET`. The Worker
must receive the same `APP_SECRET` as the web process.

## Security boundaries

- Single-admin cookie session; no public registration.
- `APP_SECRET` signs sessions and derives encryption material.
- `REQUIRE_SECURE_CONFIG=true` rejects example secrets and weak database
  passwords at startup.
- Uploads are capped at 50MB and validated by magic bytes plus Office ZIP content
  types.
- Download names are emitted with a sanitized ASCII fallback and RFC 5987 UTF-8
  parameter.
- Login attempts are limited in-process; a multi-instance deployment needs a
  shared rate limiter.
- Local model/provider endpoints are administrator-configured; SSRF protection is
  outside the single-admin threat model.

## Extension points

- New theme: `shared/theme/catalog.ts` plus preview coverage.
- New layout: schema, renderer branch, semantic shape names, web preview, test.
- New provider protocol: adapter in `server/services/llm.ts`, settings UI, tests.
- New animation effect: allowlist in `shared/domain/schemas.ts`, motion planner,
  OfficeCLI compatibility test, web motion CSS.
- New deployment target: preserve the web/worker split and PostgreSQL contract.

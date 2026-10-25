# SlideCraft

A self-hosted AI presentation workspace that turns a prompt into an editable
PowerPoint deck using curated themes, semantic layouts, and a reviewable
generation workflow.

[中文 README](README.md) · [Architecture](docs/architecture.md) · [Self-hosting](docs/self-hosting.md) · [API](docs/api.md) · [Roadmap](docs/ppt-capability-roadmap.md)

![SlideCraft home](docs/images/home.png)

## Why SlideCraft

Most AI slide tools generate screenshots or fragile HTML. SlideCraft instead:

- lets the model choose only registered themes, recipes, layouts, and semantic
  animation targets;
- renders a deterministic, editable PPTX with PptxGenJS;
- writes native PowerPoint entrance animations and transitions with OfficeCLI;
- pauses for requirements, theme, materials, outline, and a two-slide proof;
- keeps tasks, events, API keys, and output files on your own infrastructure.

## Features

- Nuxt 4, Vue 3, TypeScript, PostgreSQL, pg-boss.
- Six themes, twenty semantic layouts, four deck recipes.
- OpenAI Chat Completions, OpenAI Completions, OpenAI Responses, Anthropic Messages.
- Persistent tasks, SSE progress, retries, and resumable stages.
- Homepage motion, page transition, element sequence, content density, page
  number, and footer settings.
- AI-generated semantic motion plans with per-slide editing in the outline stage.
- Native PowerPoint animations and transitions, editable in the animation pane.
- Fullscreen web presentation with keyboard, click, swipe, and element motion.
- AES-256-GCM encryption for provider API keys.
- Single-admin cookie auth, login rate limiting, upload signature validation,
  and a health endpoint.

## Quick start

Requirements: Node.js 24+, pnpm 11+, Docker.

```bash
cp .env.example .env
# Replace POSTGRES_PASSWORD, DATABASE_URL, APP_SECRET, and ADMIN_PASSWORD.
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
docker compose up --build
```

Open `http://localhost:3000`, then configure a provider and default text model at
`/settings/providers`.

For local development:

```bash
pnpm install
cp .env.example .env
docker compose up -d db
pnpm db:migrate
pnpm dev
# in another terminal
pnpm worker
```

Docker Compose sets `REQUIRE_SECURE_CONFIG=true`. The web service refuses to
start with example secrets, the default database password, or an empty admin
password.

## Documentation

- [Architecture and data flow](docs/architecture.md)
- [Self-hosting, backups, upgrades, reverse proxy](docs/self-hosting.md)
- [HTTP API](docs/api.md)
- [Manual PowerPoint QA](docs/manual-qa.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Known limitations

- Single-tenant and single-admin; no teams, RBAC, billing, or public share links.
- The web preview is semantic, not a pixel-perfect PowerPoint renderer.
- Output files live on the local filesystem under `DATA_DIR`; S3 is not built in.
- PowerPoint 16 is the primary compatibility target. WPS, LibreOffice, and older
  Office versions need separate verification.
- Native animation writing requires OfficeCLI. Without it, the PPTX is still
  generated but contains no native animation.
- Uploaded PPTX files are used as content/layout references, not preserved as
  templates with all masters, SmartArt, or existing animations.

## Contributing

Issues and pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md)
and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report vulnerabilities privately
through the repository Security Advisory flow described in [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

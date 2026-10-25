# Contributing to SlideCraft

Thanks for helping make SlideCraft better. This project is a self-hosted AI
presentation workspace, not a hosted SaaS. Please keep changes aligned with that
scope: deterministic PPTX output, explicit user control, and a small, auditable
security surface.

## Before you start

- Read [README.md](README.md), [SECURITY.md](SECURITY.md), and the
  [architecture notes](docs/architecture.md).
- For a large feature or a new provider protocol, open an issue first so we can
  agree on the design and the data model.
- Use GitHub Issues for bugs and proposals. Do not include API keys, customer
  decks, or personal data in an issue.

## Local setup

Requirements: Node.js 24+, pnpm 11+, Docker.

```bash
pnpm install
cp .env.example .env
docker compose up -d db
pnpm db:migrate
```

Run the web app and Worker in two terminals:

```bash
pnpm dev
pnpm worker
```

Open `http://localhost:3000`, then configure a provider and a default text model
in `/settings/providers`.

For a local-only instance you may leave `ADMIN_PASSWORD` empty; authentication is
then disabled. Never use that configuration on a public network.

## Project layout

```text
app/                  Nuxt pages, components, presentation UI
server/api/            REST and SSE endpoints
server/services/       providers, tasks, outline, renderer, OfficeCLI, motion
server/database/       migration runner and numbered SQL migrations
shared/domain/         Zod schemas shared by API, Worker, AI, and client
shared/theme/          themes, layouts, recipes
worker/                pg-boss background generation worker
tests/                 Vitest unit and integration tests
docs/                  architecture, operations, roadmap, and design notes
```

## Development rules

### TypeScript and boundaries

- Strict TypeScript is required. Run `pnpm typecheck` before opening a PR.
- Validate external input with Zod in `shared/domain/schemas.ts` or a route-local
  schema.
- Do not let the model choose arbitrary OOXML, coordinates, selectors, or shell
  commands. It may only choose registered layouts, themes, recipes, and semantic
  animation targets.
- Keep provider API keys out of logs, errors, fixtures, and screenshots.

### PPTX compatibility

- The generated package must remain readable by Microsoft PowerPoint.
- Do not reorder PptxGenJS package parts after generation. OfficeCLI mutations
  must be additive and validated.
- New layouts need a renderer branch, a semantic shape name for animation, a
  web preview, and a test.
- If you change animation planning, update both `shared/presentation/motion.ts`
  and the PowerPoint integration test.

### Database changes

Add a new numbered migration under `server/database/migrations/`. Never edit an
already released migration. The migration runner records applied versions in
`schema_migrations`.

### Tests

```bash
pnpm test
pnpm typecheck
pnpm build
```

Tests that need the bundled OfficeCLI binary skip automatically when the binary
is unavailable. Do not make the whole suite require a real LLM or a paid API key.
For a manual PowerPoint check, see [docs/manual-qa.md](docs/manual-qa.md).

## Pull requests

A useful PR includes:

- a focused problem statement and the chosen approach;
- tests for behavior changes;
- screenshots or a short recording for UI changes;
- migration notes for database changes;
- updates to README/docs when configuration or behavior changes;
- no unrelated formatting churn.

Use conventional commit messages when practical, for example:

```text
feat: add provider request timeout setting
fix: preserve PowerPoint-compatible notes master
docs: document backup and restore
```

## Good first issues

These are intentionally scoped for new contributors:

- Add a new semantic layout and its renderer/preview test.
- Improve an existing theme's accessibility contrast.
- Add an OpenAI-compatible provider preset.
- Add a fixture-based test for a PPTX parsing edge case.
- Improve a documentation page or add a translation.
- Add a Docker healthcheck or deployment example.

## Code of conduct

By participating, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
Be direct about code, generous about people, and assume good intent.

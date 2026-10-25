# Changelog

All notable changes to SlideCraft are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Versioned database migrations.
- GitHub Actions CI and container publishing workflows.
- Health endpoint and graceful Worker shutdown.
- Login rate limiting and upload file-signature validation.
- Community documentation, issue templates, and security policy.
- Task/data retention script with dry-run mode.

### Fixed

- Read `DATABASE_URL`, `DATA_DIR`, `APP_SECRET`, and admin credentials from
  runtime environment variables instead of Nuxt's build-time config snapshot.
- Docker Compose now rejects example secrets unless they are replaced.
- Docker image builds and runs as a non-root user; OfficeCLI is optional at
  build time and degrades gracefully on restricted networks.
- Download filenames are protected against header injection.

## [0.1.0] - 2026-10-25

### Added

- Nuxt 4 / Vue 3 workspace with requirements, theme, material, outline, proof,
  and delivery stages.
- Six curated themes, twenty semantic layouts, and four deck recipes.
- OpenAI Chat Completions, OpenAI Completions, OpenAI Responses, and Anthropic
  Messages provider protocols.
- PostgreSQL-backed persistent tasks, pg-boss Worker, SSE progress, retries,
  and resumable stages.
- Deterministic PptxGenJS rendering with OfficeCLI structure validation.
- Native PowerPoint entrance animations and slide transitions generated from
  an AI semantic motion plan.
- Fullscreen web presentation with keyboard, click, swipe, and element motion.
- AES-256-GCM encryption for provider API keys.
- Docker Compose deployment and single-admin cookie authentication.

# Security Policy

## Supported versions

Security fixes are provided for the latest released minor version. The project
is currently pre-1.0, so please upgrade to the latest tag before reporting an
issue.

## Reporting a vulnerability

Please **do not open a public issue** for a suspected vulnerability.

Use the repository's **Security → Advisories → Report a vulnerability** flow
(GitHub private vulnerability reporting). Include:

- affected version or commit;
- deployment mode (Docker Compose, bare Node, reverse proxy);
- reproduction steps or a minimal proof of concept;
- impact assessment;
- any suggested mitigation.

You should receive an acknowledgement within 72 hours. We will coordinate a
fix and disclosure date with you. Please avoid accessing data that is not yours
while validating a report.

## Security model

SlideCraft is designed as a **single-tenant, self-hosted** application:

- One administrator authenticates with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- The session cookie is HttpOnly, SameSite=Lax, and signed with `APP_SECRET`.
- Provider API keys are encrypted at rest with AES-256-GCM.
- Uploaded files and generated PPTX files are stored under `DATA_DIR`.
- The application does not provide public sharing links or multi-user RBAC.

If `ADMIN_PASSWORD` is empty, authentication is disabled. This is intended only
for local development. Production deployments must set a strong password and a
random `APP_SECRET`, and should terminate TLS at a reverse proxy.

## Deployment requirements

- Set `APP_SECRET` to at least 32 random bytes. Generate one with:
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
- Set a unique `ADMIN_PASSWORD` and `POSTGRES_PASSWORD`.
- Do not expose PostgreSQL or the Worker directly to the internet.
- Put the web service behind HTTPS.
- Keep `DATA_DIR` on a private, backed-up volume.
- Rotate provider keys if a host or backup is compromised.

## Out of scope

- Issues caused by unsupported browsers or by PowerPoint/WPS bugs.
- Vulnerabilities in third-party model providers or self-hosted model servers.
- Denial of service caused by intentionally huge prompts or uploads from an
  authenticated administrator.
- Secrets committed to a fork or a misconfigured reverse proxy.

## Known upstream advisories

As of 2026-10-25, Dependabot reports three high-severity advisories with no
upstream patched release:

- [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv):
  `node-forge <= 1.4.0`, pulled in through Nuxt's development server tooling.
- [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq):
  `image-size <= 2.0.2`, pulled in through PptxGenJS.
- [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr):
  `image-size <= 2.0.2`, pulled in through PptxGenJS.

Mitigation: SlideCraft does not accept arbitrary image uploads. PptxGenJS
processes trusted theme assets, and the affected `node-forge` path is used by
Nuxt's local development tooling rather than the generated deck runtime. We will
upgrade as soon as patched releases are available.

## Dependency and binary notices

OfficeCLI is distributed under Apache-2.0; PptxGenJS is MIT-licensed. Review
the dependency licenses before redistributing a container image.

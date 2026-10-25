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

## Dependency and binary notices

OfficeCLI is distributed under Apache-2.0; PptxGenJS is MIT-licensed. Review
the dependency licenses before redistributing a container image.

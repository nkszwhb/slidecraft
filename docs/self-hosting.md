# Self-hosting

This guide targets a single-node Docker Compose deployment. SlideCraft stores
task metadata in PostgreSQL and files in `DATA_DIR`; back up both.

## 1. Generate secrets

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Set distinct values in `.env`:

```dotenv
POSTGRES_PASSWORD=...
DATABASE_URL=postgres://slidecraft:...@localhost:5432/slidecraft
APP_SECRET=...
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=...
```

If the password contains URL-reserved characters, URL-encode it in
`DATABASE_URL`. Docker Compose uses `POSTGRES_PASSWORD` internally and overrides
the host portion to `db`.

## 2. Start

```bash
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:3000/api/health
```

Open `/settings/providers`, add a provider, add a model, and mark one model as
the default text model. Add a vision model only if you want image-aware
planning.

The Compose configuration sets `REQUIRE_SECURE_CONFIG=true`. Startup fails with
an explicit message if example secrets, the default database password, or an
empty admin password are still present.

## 3. Put it behind HTTPS

Do not expose port 3000 directly to the internet. Example Caddy configuration:

```caddy
slides.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

Nginx example:

```nginx
server {
  listen 443 ssl;
  server_name slides.example.com;

  client_max_body_size 55m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_buffering off;
  }
}
```

`proxy_buffering off` is important for SSE progress streams.

## 4. Backups

Back up the database and the application data volume:

```bash
docker compose exec -T db pg_dump -U slidecraft slidecraft > slidecraft.sql
docker run --rm \
  -v slidecraft_app_data:/data \
  -v "$PWD":/backup \
  alpine tar czf /backup/slidecraft-data.tar.gz -C /data .
```

Restore:

```bash
docker compose stop web worker
cat slidecraft.sql | docker compose exec -T db psql -U slidecraft slidecraft
docker run --rm \
  -v slidecraft_app_data:/data \
  -v "$PWD":/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/slidecraft-data.tar.gz -C /data"
docker compose up -d
```

Check that the volume name matches `docker volume ls`; Compose prefixes it with
the project directory name.

## 5. Upgrades

```bash
git fetch --tags
git checkout <new-tag>
docker compose build
docker compose run --rm migrate
docker compose up -d
curl -fsS http://127.0.0.1:3000/api/health
```

The migration runner applies only new numbered migrations. Never edit a released
migration file. Back up before every upgrade.

## 6. Health and logs

```bash
curl -fsS http://127.0.0.1:3000/api/health
docker compose logs -f web
docker compose logs -f worker
```

The Worker logs stage transitions and model/render failures. Task-level events
are also visible in the UI and stored in `task_events`.

## 7. Storage and retention

- `DATA_DIR` contains uploaded material, proof PPTX, and final PPTX.
- Files are not deleted automatically when a task is removed.
- Use the prune script to remove old completed/failed tasks and their task
  directories together:

  ```bash
  pnpm tasks:prune --days=30            # dry run
  pnpm tasks:prune --days=30 --yes      # delete
  ```

  Add `--include-drafts` only if you intentionally want to remove paused tasks.
- Do not place `DATA_DIR` on an unencrypted shared drive.

## 8. Scaling notes

The default deployment is one web process and one Worker. If you scale out:

- use a shared rate limiter instead of the in-process login limiter;
- keep all web and Worker processes on the same `APP_SECRET`;
- use a shared `DATA_DIR` or replace local storage with object storage;
- back up PostgreSQL and the file store consistently;
- do not run multiple migration containers without the advisory lock (the runner
  serializes them, but avoid racing deployments anyway).

## 9. Troubleshooting

### Web exits with “Unsafe production configuration”

Replace every `replace-with-...`, `change-me`, and default `slidecraft` password
in `.env`. `APP_SECRET` must be at least 32 random characters.

### `ECONNREFUSED 127.0.0.1:5432`

Start the database:

```bash
docker compose up -d db
docker compose ps
```

For a bare-metal development environment, run PostgreSQL 17 and apply
`pnpm db:migrate`.

### I changed `POSTGRES_PASSWORD` after first startup

PostgreSQL only applies `POSTGRES_PASSWORD` when initializing a new data
directory. Either update the role with `ALTER ROLE slidecraft PASSWORD ...`, or
remove the development volume and start fresh:

```bash
docker compose down -v
docker compose up -d --build
```

`down -v` deletes the database and application data volumes.

### PPTX opens with a repair prompt

This is a release blocker. Run:

```bash
pnpm office:check
pnpm test
```

Then open the generated file in Microsoft PowerPoint and inspect the animation
pane. Do not publish a build that triggers repair.

### Animations are missing

OfficeCLI is optional at runtime. Check its installation:

```bash
pnpm office:check
```

The task log reports whether motion was applied or degraded to a plain PPTX.

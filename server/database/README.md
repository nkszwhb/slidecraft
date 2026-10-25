# Database migrations

`migrations/` is the source of truth for the PostgreSQL schema.

- Migrations are named `NNN_description.sql` and run in lexical order.
- `pnpm db:migrate` creates `schema_migrations`, takes a PostgreSQL advisory
  lock, and applies only migrations that have not been recorded.
- Each migration runs inside a transaction. A failed migration is rolled back
  and is not recorded.
- Never edit a migration after it has been released. Add the next number.
- Use `CREATE ... IF NOT EXISTS` only for the initial bootstrap; ordinary
  changes should be explicit and reversible where practical.

To add a migration:

```bash
touch server/database/migrations/003_add_example.sql
pnpm db:migrate
```

Back up the database and `DATA_DIR` before upgrading a production instance.

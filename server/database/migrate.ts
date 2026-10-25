import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { closeDatabase, getDatabase } from './client'

const migrationsDir = new URL('./migrations/', import.meta.url)
const sql = getDatabase()

async function main(): Promise<void> {
  const files = (await readdir(fileURLToPath(migrationsDir)))
    .filter(file => /^\d{3,}_.+\.sql$/.test(file))
    .sort()

  if (!files.length) throw new Error('No database migrations found')

  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `

  await sql.begin(async (tx) => {
    // Hold the advisory lock on the same connection as the migration writes.
    await tx`SELECT pg_advisory_xact_lock(84267421)`
    const appliedRows = await tx<{ version: string }[]>`SELECT version FROM schema_migrations`
    const applied = new Set(appliedRows.map(row => row.version))

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Already applied: ${file}`)
        continue
      }

      const contents = await readFile(fileURLToPath(new URL(file, migrationsDir)), 'utf8')
      await tx.unsafe(contents)
      await tx`INSERT INTO schema_migrations (version) VALUES (${file})`
      console.log(`Applied: ${file}`)
    }
  })

  console.log('Database schema is up to date.')
}

try {
  await main()
}
finally {
  await closeDatabase()
}

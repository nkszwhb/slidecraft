import postgres from 'postgres'
import type { TransactionSql } from 'postgres'

export type Sql = ReturnType<typeof postgres>
export type DbClient = Sql | TransactionSql<Record<string, unknown>>

let singleton: Sql | undefined

export function createDatabase(url: string): Sql {
  return postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    transform: { undefined: null },
  })
}

export function getDatabase(url = process.env.DATABASE_URL): Sql {
  if (!url) throw new Error('DATABASE_URL is not configured')
  if (!singleton) singleton = createDatabase(url)
  return singleton
}

export async function closeDatabase(): Promise<void> {
  if (singleton) {
    await singleton.end({ timeout: 5 })
    singleton = undefined
  }
}

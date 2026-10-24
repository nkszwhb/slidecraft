import type { Sql } from '../database/client'
import { getDatabase } from '../database/client'

export function useDb(): Sql {
  const config = useRuntimeConfig()
  return getDatabase(config.databaseUrl)
}

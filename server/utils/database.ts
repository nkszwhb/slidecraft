import type { Sql } from '../database/client'
import { getDatabase } from '../database/client'

export function useDb(): Sql {
  // Read at request time. Nuxt's runtimeConfig is baked at build time; Docker
  // and bare Node deployments must be able to provide DATABASE_URL at runtime.
  return getDatabase(process.env.DATABASE_URL)
}

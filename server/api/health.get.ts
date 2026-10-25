import { useDb } from '../utils/database'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const startedAt = Date.now()

  try {
    const sql = useDb()
    await sql`SELECT 1`

    let pending: number | null = null
    try {
      const rows = await sql<{ count: number }[]>`
        SELECT count(*)::int AS count
        FROM pgboss.job
        WHERE state IN ('created', 'retry', 'active')
      `
      pending = rows[0]?.count ?? 0
    }
    catch {
      pending = null
    }

    const config = useRuntimeConfig()
    return {
      status: 'ok',
      version: String(config.public.version || '0.1.0'),
      uptimeSeconds: Math.round(process.uptime()),
      database: 'ok',
      queue: { pending },
      latencyMs: Date.now() - startedAt,
    }
  }
  catch {
    setResponseStatus(event, 503)
    return {
      status: 'error',
      database: 'unavailable',
      uptimeSeconds: Math.round(process.uptime()),
      latencyMs: Date.now() - startedAt,
    }
  }
})

import 'dotenv/config'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { closeDatabase, getDatabase } from '../server/database/client'

function argument(name: string): string | undefined {
  return process.argv.find(value => value.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
}

const days = Number(argument('days') ?? 30)
if (!Number.isFinite(days) || days < 1) {
  throw new Error('--days must be a positive number')
}

const deleteMode = process.argv.includes('--yes')
const includeDrafts = process.argv.includes('--include-drafts')
const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
const dataRoot = resolve(process.env.DATA_DIR || './.data')
const sql = getDatabase()

try {
  const rows = await sql<{ id: string; title: string; status: string; created_at: Date }[]>`
    SELECT id, title, status, created_at
    FROM tasks
    WHERE created_at < ${cutoff}
      AND (${includeDrafts} OR status IN ('succeeded', 'failed'))
    ORDER BY created_at ASC
  `

  if (!rows.length) {
    console.log(`No tasks older than ${days} days match the prune criteria.`)
  }
  else {
    console.log(`${rows.length} task(s) older than ${days} days:`)
    for (const row of rows) console.log(`- ${row.id}  ${row.status}  ${row.title}`)

    if (!deleteMode) {
      console.log('\nDry run only. Re-run with --yes to delete these tasks and their data directories.')
    }
    else {
      for (const row of rows) {
        const taskDir = resolve(dataRoot, 'tasks', row.id)
        if (!taskDir.startsWith(resolve(dataRoot, 'tasks') + `${process.platform === 'win32' ? '\\' : '/'}`)) {
          throw new Error(`Refusing to delete unexpected path: ${taskDir}`)
        }
        await rm(taskDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
        await sql`DELETE FROM tasks WHERE id = ${row.id}`
        console.log(`Deleted ${row.id}`)
      }
    }
  }
}
finally {
  await closeDatabase()
}

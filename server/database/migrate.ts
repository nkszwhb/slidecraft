import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { closeDatabase, getDatabase } from './client'

const schemaUrl = new URL('./schema.sql', import.meta.url)
const sql = getDatabase()
const schema = await readFile(fileURLToPath(schemaUrl), 'utf8')

await sql.unsafe(schema)
console.log('Database schema is up to date.')
await closeDatabase()

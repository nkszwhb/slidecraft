import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { PgBoss } from 'pg-boss'
import { getDatabase } from '../server/database/client'
import { getTheme } from '../shared/theme/catalog'
import {
  addTaskEvent,
  completeDeck,
  completeOutline,
  completeProof,
  failTask,
  getTask,
  markStageRunning,
  registerArtifact,
} from '../server/services/tasks'
import { getRuntimeProvider } from '../server/services/providers'
import { generateOutline } from '../server/services/outline'
import { renderDeck } from '../server/services/render-deck'
import { applyPresentationMotion } from '../server/services/motion'
import { extractOfficeText, validateWithOfficeCli } from '../server/services/office-cli'
import { buildAssetContext, extractInlineText } from '../server/services/assets'
import type { TaskJobData } from '../server/utils/queue'

const QUEUE = 'ppt-generation'
const sql = getDatabase()
const dataRoot = resolve(process.env.DATA_DIR || './.data')

function log(message: string): void {
  console.log(`[worker ${new Date().toISOString()}] ${message}`)
}

async function taskDirectory(taskId: string): Promise<string> {
  const folder = join(dataRoot, 'tasks', taskId)
  await import('node:fs/promises').then(fs => fs.mkdir(folder, { recursive: true }))
  return folder
}

async function imageAssetsForTask(taskId: string): Promise<Array<{ path: string }>> {
  const rows = await sql<{ storage_key: string; mime_type: string }[]>`
    SELECT storage_key, mime_type FROM assets
    WHERE task_id = ${taskId} AND mime_type LIKE 'image/%'
    ORDER BY created_at ASC
  `
  return rows.map(row => ({ path: resolve(dataRoot, row.storage_key) }))
}

async function assetContextForTask(taskId: string): Promise<{ context: string; count: number }> {
  const rows = await sql<{ original_name: string; storage_key: string; mime_type: string }[]>`
    SELECT original_name, storage_key, mime_type FROM assets
    WHERE task_id = ${taskId}
    ORDER BY created_at ASC
  `
  const extracted: Array<{ name: string; text: string }> = []
  for (const row of rows) {
    const path = resolve(dataRoot, row.storage_key)
    let text = await extractInlineText(path, row.mime_type).catch(() => null)
    if (text === null && [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ].includes(row.mime_type)) {
      text = await extractOfficeText(path, process.env.OFFICECLI_BIN)
    }
    if (text?.trim()) extracted.push({ name: row.original_name, text })
  }
  return { context: buildAssetContext(extracted), count: extracted.length }
}

async function saveArtifact(input: {
  taskId: string
  kind: string
  filePath: string
}): Promise<string> {
  const id = randomUUID()
  const info = await stat(input.filePath)
  await registerArtifact(sql, {
    id,
    taskId: input.taskId,
    kind: input.kind,
    storageKey: relativeStorageKey(input.filePath),
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sizeBytes: info.size,
    metadata: { generatedAt: new Date().toISOString() },
  })
  return id
}

function relativeStorageKey(filePath: string): string {
  const relative = resolve(filePath).slice(resolve(dataRoot).length).replace(/^[\\/]/, '')
  return relative.replace(/\\/g, '/')
}

async function processJob(job: TaskJobData): Promise<void> {
  log(`processing ${job.stage} for ${job.taskId}`)
  await markStageRunning(sql, job.taskId, job.stage)
  const task = await getTask(sql, job.taskId)
  if (!task) throw new Error('任务不存在')

  if (job.stage === 'outline') {
    if (!task.requirements) throw new Error('请先确认需求')
    const runtime = await getRuntimeProvider(sql, 'text')
    if (!runtime) throw new Error('尚未配置默认文本模型，请前往设置添加提供商和模型')
    await addTaskEvent(sql, task.id, 'stage.progress', 'outline', `正在通过 ${runtime.provider.name} / ${runtime.model.displayName} 规划大纲`)
    const assetContext = await assetContextForTask(task.id)
    if (assetContext.count) {
      await addTaskEvent(sql, task.id, 'assets.extracted', 'outline', `已读取 ${assetContext.count} 个素材的内容作为规划依据`)
    }
    const generated = await generateOutline({
      runtime,
      title: task.title,
      prompt: task.prompt,
      requirements: task.requirements,
      recipeId: task.recipeId,
      assetNames: task.assets.map(asset => asset.name),
      assetContext: assetContext.context,
      settings: task.settings,
    })
    await completeOutline(sql, task.id, generated.outline)
    log(`outline ready for ${job.taskId}`)
    return
  }

  if (!task.outline) throw new Error('大纲尚未生成')
  const theme = getTheme(task.themeId)
  if (!theme) throw new Error('主题不存在')

  const folder = await taskDirectory(task.id)
  const images = await imageAssetsForTask(task.id)
  const slideLimit = job.stage === 'proof' ? 2 : undefined
  const fileName = `${job.stage}-${Date.now()}.pptx`
  const outputPath = join(folder, fileName)

  await addTaskEvent(sql, task.id, 'stage.progress', job.stage, job.stage === 'proof'
    ? '正在渲染封面与典型内容页'
    : `正在渲染 ${task.outline.slides.length} 页内容`)

  await renderDeck({
    outline: task.outline,
    theme,
    outputPath,
    slideLimit,
    assetImages: images,
    settings: task.settings,
  })

  const motion = await applyPresentationMotion(outputPath, task.outline, {
    slideLimit,
    binary: process.env.OFFICECLI_BIN,
  })
  await addTaskEvent(sql, task.id, 'motion.applied', job.stage, motion.message, {
    available: motion.available,
    applied: motion.applied,
  })

  const validation = await validateWithOfficeCli(outputPath, process.env.OFFICECLI_BIN)
  await addTaskEvent(sql, task.id, 'quality.checked', job.stage, validation.message, {
    available: validation.available,
    valid: validation.valid,
  })
  if (validation.available && !validation.valid) {
    throw new Error(`OfficeCLI 结构验证失败：${validation.message}`)
  }

  const artifactId = await saveArtifact({ taskId: task.id, kind: job.stage === 'proof' ? 'proof' : 'pptx', filePath: outputPath })
  if (job.stage === 'proof') await completeProof(sql, task.id, artifactId)
  else await completeDeck(sql, task.id, artifactId)
  log(`${job.stage} ready for ${job.taskId}`)
}

const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  schema: 'pgboss',
})

boss.on('error', (error: unknown) => console.error('[worker queue]', error))
await boss.start()
await boss.createQueue(QUEUE)

await boss.work<TaskJobData>(QUEUE, { batchSize: 1, pollingIntervalSeconds: 1 }, async jobs => {
  for (const job of jobs) {
    try {
      await processJob(job.data)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : '生成任务失败'
      console.error('[worker task]', message)
      await failTask(sql, job.data.taskId, job.data.stage, message).catch(() => undefined)
    }
  }
})

log('worker ready')

let stopping = false
async function shutdown(signal: string): Promise<void> {
  if (stopping) return
  stopping = true
  log(`received ${signal}, stopping`)
  await boss.stop({ graceful: true, timeout: 15_000 })
  await sql.end({ timeout: 5 })
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

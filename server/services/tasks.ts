import { randomUUID } from 'node:crypto'
import type { Sql } from '../database/client'
import {
  buildTaskFlow,
  TASK_STEP_META,
  type StepId,
  type StepState,
  type TaskStatus,
  type TaskStep,
} from '../../shared/domain/task'
import type {
  AssetView,
  ArtifactView,
  RequirementView,
  TaskEventView,
  TaskView,
} from '../../shared/domain/task-view'
import type { DeckOutline } from '../../shared/domain/schemas'
import { getTheme } from '../../shared/theme/catalog'

interface TaskRow {
  id: string
  title: string
  prompt: string
  status: TaskStatus
  current_step: string
  theme_id: string
  theme_version: string
  recipe_id: string
  page_count: number
  language: string
  ratio: string
  requirements: RequirementView | null
  outline: DeckOutline | null
  error_message: string | null
  has_assets: boolean
  assets_skipped: boolean
  created_at: Date
  updated_at: Date
  completed_at: Date | null
}

interface EventRow {
  id: string
  type: string
  stage: string | null
  message: string
  data: Record<string, unknown> | null
  created_at: Date
}

interface AssetRow {
  id: string
  original_name: string
  mime_type: string
  size_bytes: string | number
  purpose: string
  parse_status: string
  created_at: Date
}

interface ArtifactRow {
  id: string
  kind: string
  mime_type: string
  size_bytes: string | number
  metadata: Record<string, unknown>
  created_at: Date
}

export async function createTask(
  sql: Sql,
  input: {
    title: string
    prompt: string
    themeId?: string
    recipeId: string
    pageCount: number
    language: string
    ratio: string
  },
): Promise<string> {
  const theme = getTheme(input.themeId ?? 'modern-minimal') ?? getTheme('modern-minimal')!
  const id = randomUUID()
  const flow = buildTaskFlow({ hasAssets: false, assetsSkipped: false })

  await sql.begin(async tx => {
    await tx`
      INSERT INTO tasks (
        id, title, prompt, status, current_step, theme_id, theme_version,
        recipe_id, page_count, language, ratio
      ) VALUES (
        ${id}, ${input.title}, ${input.prompt}, 'waiting_input', 'requirements',
        ${theme.id}, ${theme.version}, ${input.recipeId}, ${input.pageCount},
        ${input.language}, ${input.ratio}
      )
    `
    for (const step of flow) {
      await tx`
        INSERT INTO task_steps (task_id, step_id, state)
        VALUES (${id}, ${step.id}, ${step.state})
      `
    }
    await insertEvent(tx as unknown as Sql, id, 'task.created', 'requirements', '任务已创建，等待确认需求')
  })

  return id
}

export async function getTask(sql: Sql, id: string): Promise<TaskView | null> {
  const rows = await sql<TaskRow[]>`SELECT * FROM tasks WHERE id = ${id}`
  const task = rows[0]
  if (!task) return null

  const [stepRows, eventRows, assetRows, artifactRows] = await Promise.all([
    sql<{ step_id: StepId; state: StepState }[]>`
      SELECT step_id, state FROM task_steps WHERE task_id = ${id}
    `,
    sql<EventRow[]>`
      SELECT id, type, stage, message, data, created_at
      FROM task_events WHERE task_id = ${id} ORDER BY id DESC LIMIT 80
    `,
    sql<AssetRow[]>`
      SELECT id, original_name, mime_type, size_bytes, purpose, parse_status, created_at
      FROM assets WHERE task_id = ${id} ORDER BY created_at ASC
    `,
    sql<ArtifactRow[]>`
      SELECT id, kind, mime_type, size_bytes, metadata, created_at
      FROM artifacts WHERE task_id = ${id} ORDER BY created_at DESC
    `,
  ])

  const stateByStep = new Map(stepRows.map(row => [row.step_id, row.state]))
  const steps: TaskStep[] = (Object.keys(TASK_STEP_META) as StepId[]).map(stepId => ({
    id: stepId,
    ...TASK_STEP_META[stepId],
    optional: stepId === 'assets',
    state: stateByStep.get(stepId) ?? 'pending',
  }))

  return {
    id: task.id,
    title: task.title,
    prompt: task.prompt,
    status: task.status,
    currentStep: task.current_step,
    themeId: task.theme_id,
    themeVersion: task.theme_version,
    recipeId: task.recipe_id,
    pageCount: task.page_count,
    language: task.language,
    ratio: task.ratio,
    requirements: task.requirements,
    outline: task.outline,
    errorMessage: task.error_message,
    hasAssets: task.has_assets,
    assetsSkipped: task.assets_skipped,
    createdAt: task.created_at.toISOString(),
    updatedAt: task.updated_at.toISOString(),
    completedAt: task.completed_at?.toISOString() ?? null,
    steps,
    assets: assetRows.map(toAssetView),
    artifacts: artifactRows.map(toArtifactView),
    events: eventRows.map(toEventView).reverse(),
  }
}

export async function listTasks(sql: Sql): Promise<Array<{
  id: string
  title: string
  status: string
  themeId: string
  pageCount: number
  updatedAt: string
}>> {
  const rows = await sql<Array<{
    id: string
    title: string
    status: string
    theme_id: string
    page_count: number
    updated_at: Date
  }>>`
    SELECT id, title, status, theme_id, page_count, updated_at
    FROM tasks ORDER BY updated_at DESC LIMIT 50
  `
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    status: row.status,
    themeId: row.theme_id,
    pageCount: row.page_count,
    updatedAt: row.updated_at.toISOString(),
  }))
}

export async function getTaskRow(sql: Sql, id: string): Promise<TaskRow | null> {
  const rows = await sql<TaskRow[]>`SELECT * FROM tasks WHERE id = ${id}`
  return rows[0] ?? null
}

export async function getEventsAfter(
  sql: Sql,
  taskId: string,
  afterId: number,
): Promise<TaskEventView[]> {
  const rows = await sql<EventRow[]>`
    SELECT id, type, stage, message, data, created_at
    FROM task_events
    WHERE task_id = ${taskId} AND id > ${afterId}
    ORDER BY id ASC
    LIMIT 200
  `
  return rows.map(toEventView)
}

function toEventView(row: EventRow): TaskEventView {
  return {
    id: String(row.id),
    type: row.type,
    stage: row.stage,
    message: row.message,
    data: row.data,
    createdAt: row.created_at.toISOString(),
  }
}

function toAssetView(row: AssetRow): AssetView {
  return {
    id: row.id,
    name: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    purpose: row.purpose,
    parseStatus: row.parse_status,
    createdAt: row.created_at.toISOString(),
  }
}

function toArtifactView(row: ArtifactRow): ArtifactView {
  return {
    id: row.id,
    kind: row.kind,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
  }
}

async function insertEvent(
  sql: Sql,
  taskId: string,
  type: string,
  stage: string | null,
  message: string,
  data: Record<string, unknown> | null = null,
): Promise<void> {
  await sql`
    INSERT INTO task_events (task_id, type, stage, message, data)
    VALUES (${taskId}, ${type}, ${stage}, ${message}, ${data ? sql.json(data as never) : null})
  `
}

export async function addTaskEvent(
  sql: Sql,
  taskId: string,
  type: string,
  stage: string | null,
  message: string,
  data: Record<string, unknown> | null = null,
): Promise<void> {
  await insertEvent(sql, taskId, type, stage, message, data)
}

async function setStep(sql: Sql, taskId: string, step: StepId, state: StepState, error?: string): Promise<void> {
  await sql`
    INSERT INTO task_steps (task_id, step_id, state, error_message, updated_at)
    VALUES (${taskId}, ${step}, ${state}, ${error ?? null}, now())
    ON CONFLICT (task_id, step_id)
    DO UPDATE SET state = EXCLUDED.state, error_message = EXCLUDED.error_message, updated_at = now()
  `
}

export async function confirmRequirements(
  sql: Sql,
  taskId: string,
  requirements: RequirementView,
): Promise<boolean> {
  const updated = await sql`
    UPDATE tasks SET
      requirements = ${sql.json(requirements as never)},
      page_count = ${requirements.pageCount},
      language = ${requirements.language},
      ratio = ${requirements.ratio},
      current_step = 'theme',
      status = 'waiting_input',
      updated_at = now()
    WHERE id = ${taskId}
  `
  if (!updated.count) return false
  await setStep(sql, taskId, 'requirements', 'succeeded')
  await setStep(sql, taskId, 'theme', 'running')
  await insertEvent(sql, taskId, 'requirements.confirmed', 'requirements', '需求已确认')
  return true
}

export async function confirmTheme(
  sql: Sql,
  taskId: string,
  themeId: string,
): Promise<boolean> {
  const theme = getTheme(themeId)
  if (!theme) return false
  const rows = await sql<{ has_assets: boolean; assets_skipped: boolean }[]>`
    SELECT has_assets, assets_skipped FROM tasks WHERE id = ${taskId}
  `
  const task = rows[0]
  if (!task) return false

  const nextStep = task.has_assets || task.assets_skipped ? 'outline' : 'assets'
  await sql`
    UPDATE tasks SET theme_id = ${theme.id}, theme_version = ${theme.version},
      current_step = ${nextStep}, status = 'waiting_input', updated_at = now()
    WHERE id = ${taskId}
  `
  await setStep(sql, taskId, 'theme', 'succeeded')
  if (task.has_assets) await setStep(sql, taskId, 'assets', 'succeeded')
  else if (task.assets_skipped) await setStep(sql, taskId, 'assets', 'skipped')
  else await setStep(sql, taskId, 'assets', 'waiting_input')
  if (nextStep === 'outline') await setStep(sql, taskId, 'outline', 'running')
  await insertEvent(sql, taskId, 'theme.confirmed', 'theme', `已选择主题：${theme.name}`, { themeId: theme.id })
  return true
}

export async function registerAsset(
  sql: Sql,
  asset: {
    id: string
    taskId: string
    name: string
    storageKey: string
    mimeType: string
    sizeBytes: number
    purpose: string
  },
): Promise<void> {
  await sql.begin(async tx => {
    await tx`
      INSERT INTO assets (id, task_id, original_name, storage_key, mime_type, size_bytes, purpose)
      VALUES (${asset.id}, ${asset.taskId}, ${asset.name}, ${asset.storageKey},
        ${asset.mimeType}, ${asset.sizeBytes}, ${asset.purpose})
    `
    const rows = await tx<{ current_step: string }[]>`
      SELECT current_step FROM tasks WHERE id = ${asset.taskId}
    `
    const currentStep = rows[0]?.current_step
    if (currentStep === 'assets') {
      await tx`
        UPDATE tasks SET has_assets = true, current_step = 'outline', updated_at = now()
        WHERE id = ${asset.taskId}
      `
      await setStep(tx as unknown as Sql, asset.taskId, 'assets', 'succeeded')
      await setStep(tx as unknown as Sql, asset.taskId, 'outline', 'running')
    }
    else {
      await tx`
        UPDATE tasks SET has_assets = true, updated_at = now()
        WHERE id = ${asset.taskId}
      `
    }
    await insertEvent(tx as unknown as Sql, asset.taskId, 'asset.added', 'assets', `已添加素材：${asset.name}`)
  })
}

export async function skipAssets(sql: Sql, taskId: string): Promise<boolean> {
  const rows = await sql<{ current_step: string }[]>`
    SELECT current_step FROM tasks WHERE id = ${taskId}
  `
  if (rows[0]?.current_step !== 'assets') return false

  await sql.begin(async tx => {
    await tx`
      UPDATE tasks SET assets_skipped = true, current_step = 'outline', updated_at = now()
      WHERE id = ${taskId}
    `
    await setStep(tx as unknown as Sql, taskId, 'assets', 'skipped')
    await setStep(tx as unknown as Sql, taskId, 'outline', 'running')
    await insertEvent(tx as unknown as Sql, taskId, 'assets.skipped', 'assets', '已选择仅根据需求创作')
  })
  return true
}

export async function prepareStage(
  sql: Sql,
  taskId: string,
  stage: 'outline' | 'proof' | 'generate',
): Promise<boolean> {
  const step: StepId = stage
  const updated = await sql`
    UPDATE tasks SET status = 'queued', current_step = ${step}, error_message = null, updated_at = now()
    WHERE id = ${taskId} AND status = 'waiting_input'
  `
  if (!updated.count) return false
  await setStep(sql, taskId, step, 'running')
  await insertEvent(sql, taskId, 'stage.queued', step, stage === 'outline'
    ? '正在生成大纲与页面模板'
    : stage === 'proof' ? '正在生成两页设计试稿' : '正在生成完整演示文稿')
  return true
}

export async function retryStage(
  sql: Sql,
  taskId: string,
  stage: 'outline' | 'proof' | 'generate',
): Promise<boolean> {
  const updated = await sql`
    UPDATE tasks SET status = 'queued', current_step = ${stage},
      error_message = null, updated_at = now()
    WHERE id = ${taskId} AND status = 'failed'
  `
  if (!updated.count) return false
  await setStep(sql, taskId, stage, 'running')
  await insertEvent(sql, taskId, 'stage.retried', stage, '已重新提交当前步骤')
  return true
}

export async function markStageRunning(sql: Sql, taskId: string, stage: string): Promise<void> {
  await sql`
    UPDATE tasks SET status = 'running', current_step = ${stage}, updated_at = now()
    WHERE id = ${taskId} AND status = 'queued'
  `
  await insertEvent(sql, taskId, 'stage.started', stage, '开始执行生成任务')
}

export async function completeOutline(sql: Sql, taskId: string, outline: DeckOutline): Promise<void> {
  await sql.begin(async tx => {
    await tx`
      UPDATE tasks SET outline = ${tx.json(outline as never)}, status = 'waiting_input',
        current_step = 'outline', updated_at = now()
      WHERE id = ${taskId}
    `
    await setStep(tx as unknown as Sql, taskId, 'outline', 'waiting_input')
    await insertEvent(tx as unknown as Sql, taskId, 'outline.ready', 'outline', '大纲已生成，等待确认', {
      slides: outline.slides.length,
    })
  })
}

export async function confirmOutline(
  sql: Sql,
  taskId: string,
  outline: DeckOutline,
): Promise<boolean> {
  const updated = await sql`
    UPDATE tasks SET outline = ${sql.json(outline as never)}, status = 'queued',
      current_step = 'proof', updated_at = now()
    WHERE id = ${taskId} AND status = 'waiting_input'
  `
  if (!updated.count) return false
  await setStep(sql, taskId, 'outline', 'succeeded')
  await setStep(sql, taskId, 'proof', 'running')
  await insertEvent(sql, taskId, 'outline.confirmed', 'outline', '大纲已确认，开始生成设计试稿')
  return true
}

export async function completeProof(sql: Sql, taskId: string, artifactId: string): Promise<void> {
  await sql.begin(async tx => {
    await tx`
      UPDATE tasks SET status = 'waiting_input', current_step = 'proof', updated_at = now()
      WHERE id = ${taskId}
    `
    await setStep(tx as unknown as Sql, taskId, 'proof', 'waiting_input')
    await insertEvent(tx as unknown as Sql, taskId, 'proof.ready', 'proof', '设计试稿已生成，等待确认', { artifactId })
  })
}

export async function confirmProof(sql: Sql, taskId: string): Promise<boolean> {
  const updated = await sql`
    UPDATE tasks SET status = 'queued', current_step = 'generate', updated_at = now()
    WHERE id = ${taskId} AND status = 'waiting_input'
  `
  if (!updated.count) return false
  await setStep(sql, taskId, 'proof', 'succeeded')
  await setStep(sql, taskId, 'generate', 'running')
  await insertEvent(sql, taskId, 'proof.confirmed', 'proof', '试稿已确认，开始生成整套演示文稿')
  return true
}

export async function completeDeck(sql: Sql, taskId: string, artifactId: string): Promise<void> {
  await sql.begin(async tx => {
    await tx`
      UPDATE tasks SET status = 'succeeded', current_step = 'delivery',
        completed_at = now(), updated_at = now()
      WHERE id = ${taskId}
    `
    await setStep(tx as unknown as Sql, taskId, 'generate', 'succeeded')
    await setStep(tx as unknown as Sql, taskId, 'delivery', 'succeeded')
    await insertEvent(tx as unknown as Sql, taskId, 'task.completed', 'delivery', '演示文稿已生成，可以预览和下载', { artifactId })
  })
}

export async function failTask(
  sql: Sql,
  taskId: string,
  stage: string,
  message: string,
): Promise<void> {
  await sql.begin(async tx => {
    await tx`
      UPDATE tasks SET status = 'failed', current_step = ${stage},
        error_message = ${message}, updated_at = now()
      WHERE id = ${taskId}
    `
    await setStep(tx as unknown as Sql, taskId, stage as StepId, 'failed', message)
    await insertEvent(tx as unknown as Sql, taskId, 'task.failed', stage, message)
  })
}

export async function registerArtifact(
  sql: Sql,
  input: {
    id: string
    taskId: string
    kind: string
    storageKey: string
    mimeType: string
    sizeBytes: number
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  await sql`
    INSERT INTO artifacts (id, task_id, kind, storage_key, mime_type, size_bytes, metadata)
    VALUES (${input.id}, ${input.taskId}, ${input.kind}, ${input.storageKey},
      ${input.mimeType}, ${input.sizeBytes}, ${sql.json((input.metadata ?? {}) as never)})
  `
}

export async function getArtifact(
  sql: Sql,
  taskId: string,
  artifactId: string,
): Promise<{ key: string; name: string; mimeType: string } | null> {
  const rows = await sql<{ storage_key: string; kind: string; mime_type: string }[]>`
    SELECT storage_key, kind, mime_type FROM artifacts
    WHERE id = ${artifactId} AND task_id = ${taskId}
  `
  const artifact = rows[0]
  if (!artifact) return null
  return {
    key: artifact.storage_key,
    name: `slidecraft-${artifactId.slice(0, 8)}.${artifact.kind === 'pptx' ? 'pptx' : 'bin'}`,
    mimeType: artifact.mime_type,
  }
}

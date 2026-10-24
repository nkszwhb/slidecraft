import { requireUser } from '../../../utils/auth'
import { useDb } from '../../../utils/database'
import { requireTaskId } from '../../../utils/validation'
import { retryStage } from '../../../services/tasks'
import { enqueueTask, type TaskJobStage } from '../../../utils/queue'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = requireTaskId(getRouterParam(event, 'id'))
  const db = useDb()
  const rows = await db<{ current_step: TaskJobStage }[]>`
    SELECT current_step FROM tasks WHERE id = ${id} AND status = 'failed'
  `
  const stage = rows[0]?.current_step
  if (!stage || !['outline', 'proof', 'generate'].includes(stage)) {
    throw createError({ statusCode: 409, statusMessage: '当前没有可重试的步骤' })
  }
  const updated = await retryStage(db, id, stage)
  if (!updated) throw createError({ statusCode: 409, statusMessage: '当前没有可重试的步骤' })
  await enqueueTask({ taskId: id, stage })
  return { ok: true, stage }
})

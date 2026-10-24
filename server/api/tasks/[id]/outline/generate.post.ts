import { requireUser } from '../../../../utils/auth'
import { useDb } from '../../../../utils/database'
import { requireTaskId } from '../../../../utils/validation'
import { prepareStage } from '../../../../services/tasks'
import { enqueueTask } from '../../../../utils/queue'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = requireTaskId(getRouterParam(event, 'id'))
  const queued = await prepareStage(useDb(), id, 'outline')
  if (!queued) throw createError({ statusCode: 409, statusMessage: '任务当前不能生成大纲' })
  await enqueueTask({ taskId: id, stage: 'outline' })
  return { ok: true }
})

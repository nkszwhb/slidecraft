import { requireUser } from '../../../../utils/auth'
import { useDb } from '../../../../utils/database'
import { requireTaskId } from '../../../../utils/validation'
import { confirmProof } from '../../../../services/tasks'
import { enqueueTask } from '../../../../utils/queue'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = requireTaskId(getRouterParam(event, 'id'))
  const updated = await confirmProof(useDb(), id)
  if (!updated) throw createError({ statusCode: 409, statusMessage: '试稿尚未准备好' })
  await enqueueTask({ taskId: id, stage: 'generate' })
  return { ok: true }
})

import { deckOutlineSchema } from '../../../../../shared/domain/schemas'
import { requireUser } from '../../../../utils/auth'
import { useDb } from '../../../../utils/database'
import { readBodyValidated, requireTaskId } from '../../../../utils/validation'
import { confirmOutline } from '../../../../services/tasks'
import { enqueueTask } from '../../../../utils/queue'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = requireTaskId(getRouterParam(event, 'id'))
  const outline = await readBodyValidated(event, deckOutlineSchema)
  const updated = await confirmOutline(useDb(), id, outline)
  if (!updated) throw createError({ statusCode: 409, statusMessage: '大纲尚未准备好' })
  await enqueueTask({ taskId: id, stage: 'proof' })
  return { ok: true }
})

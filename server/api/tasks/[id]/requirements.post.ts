import { requirementSchema } from '../../../../shared/domain/schemas'
import { requireUser } from '../../../utils/auth'
import { useDb } from '../../../utils/database'
import { readBodyValidated, requireTaskId } from '../../../utils/validation'
import { confirmRequirements } from '../../../services/tasks'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = requireTaskId(getRouterParam(event, 'id'))
  const requirements = await readBodyValidated(event, requirementSchema)
  const updated = await confirmRequirements(useDb(), id, requirements)
  if (!updated) throw createError({ statusCode: 404, statusMessage: '任务不存在' })
  return { ok: true }
})

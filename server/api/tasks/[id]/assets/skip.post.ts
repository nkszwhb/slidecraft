import { requireUser } from '../../../../utils/auth'
import { useDb } from '../../../../utils/database'
import { requireTaskId } from '../../../../utils/validation'
import { skipAssets } from '../../../../services/tasks'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = requireTaskId(getRouterParam(event, 'id'))
  const skipped = await skipAssets(useDb(), id)
  if (!skipped) throw createError({ statusCode: 409, statusMessage: '当前步骤不能跳过素材' })
  return { ok: true }
})

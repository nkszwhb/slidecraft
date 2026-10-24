import { z } from 'zod'
import { requireUser } from '../../../utils/auth'
import { useDb } from '../../../utils/database'
import { readBodyValidated, requireTaskId } from '../../../utils/validation'
import { confirmTheme } from '../../../services/tasks'

const bodySchema = z.object({ themeId: z.string().min(1) })

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = requireTaskId(getRouterParam(event, 'id'))
  const { themeId } = await readBodyValidated(event, bodySchema)
  const updated = await confirmTheme(useDb(), id, themeId)
  if (!updated) throw createError({ statusCode: 400, statusMessage: '主题无效或任务不存在' })
  return { ok: true }
})

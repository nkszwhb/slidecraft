import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/database'
import { deleteProvider } from '../../services/providers'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  const deleted = await deleteProvider(useDb(), id)
  if (!deleted) throw createError({ statusCode: 404, statusMessage: '提供商不存在' })
  return { ok: true }
})

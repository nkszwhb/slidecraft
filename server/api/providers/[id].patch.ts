import { providerInputSchema } from '../../../shared/domain/schemas'
import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/database'
import { readBodyValidated } from '../../utils/validation'
import { normalizeProviderBaseUrl } from '../../services/llm'
import { updateProvider } from '../../services/providers'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  const input = await readBodyValidated(event, providerInputSchema)
  const updated = await updateProvider(useDb(), id, {
    ...input,
    baseUrl: normalizeProviderBaseUrl(input.baseUrl),
  })
  if (!updated) throw createError({ statusCode: 404, statusMessage: '提供商不存在' })
  return { ok: true }
})

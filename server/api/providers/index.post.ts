import { providerInputSchema } from '../../../shared/domain/schemas'
import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/database'
import { readBodyValidated } from '../../utils/validation'
import { normalizeProviderBaseUrl } from '../../services/llm'
import { createProvider } from '../../services/providers'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const input = await readBodyValidated(event, providerInputSchema)
  if (!input.apiKey) throw createError({ statusCode: 400, statusMessage: '首次添加提供商必须填写 API Key' })

  const id = await createProvider(useDb(), {
    ...input,
    baseUrl: normalizeProviderBaseUrl(input.baseUrl),
    apiKey: input.apiKey,
  })
  return { id }
})

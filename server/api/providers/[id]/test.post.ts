import { z } from 'zod'
import { requireUser } from '../../../utils/auth'
import { useDb } from '../../../utils/database'
import { readBodyValidated } from '../../../utils/validation'
import { callLlm } from '../../../services/llm'
import { getRuntimeProviderById } from '../../../services/providers'

const bodySchema = z.object({ modelId: z.string().optional() })

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  const { modelId } = await readBodyValidated(event, bodySchema)
  const runtime = await getRuntimeProviderById(useDb(), id, modelId)
  if (!runtime) throw createError({ statusCode: 404, statusMessage: '没有可测试的模型，请先添加模型' })

  const started = Date.now()
  try {
    const response = await callLlm(runtime.provider, runtime.model.modelId, {
      messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
      temperature: 0,
      maxOutputTokens: 16,
    })
    return {
      ok: true,
      latencyMs: Date.now() - started,
      model: runtime.model.displayName,
      preview: response.text.slice(0, 80),
    }
  }
  catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: error instanceof Error ? error.message : '连接测试失败',
    })
  }
})

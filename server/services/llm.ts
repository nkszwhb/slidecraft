import {
  buildProviderRequest,
  parseProviderResponse,
} from '../../shared/providers/adapter'
import type {
  NormalizedRequest,
  NormalizedResponse,
  ProviderConfig,
} from '../../shared/providers/types'

export function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim()
  const candidate = fenced ?? trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Model response did not contain a JSON object')

  let parsed: unknown
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1))
  }
  catch {
    throw new Error('Model response contained invalid JSON')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Model response must be a JSON object')
  }
  return parsed as Record<string, unknown>
}

function sanitizedErrorMessage(status: number, raw: string): string {
  const compact = raw.replace(/\s+/g, ' ').slice(0, 300)
  if (status === 401 || status === 403) return '模型服务鉴权失败，请检查 API Key 和 Base URL'
  if (status === 429) return '模型服务触发限流，请稍后重试或检查配额'
  return `模型服务返回 ${status}${compact ? `：${compact}` : ''}`
}

export async function callLlm(
  config: ProviderConfig,
  model: string,
  request: Omit<NormalizedRequest, 'model'>,
): Promise<NormalizedResponse> {
  const built = buildProviderRequest(config, { ...request, model })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(built.url, {
      method: 'POST',
      headers: built.headers,
      body: JSON.stringify(built.body),
      signal: controller.signal,
      redirect: 'error',
    })
    const raw = await response.text()
    if (!response.ok) throw new Error(sanitizedErrorMessage(response.status, raw))

    let payload: unknown
    try {
      payload = JSON.parse(raw)
    }
    catch {
      throw new Error('模型服务返回了无法解析的响应')
    }
    return parseProviderResponse(config.protocol, payload)
  }
  catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`模型请求超过 ${Math.round(config.timeoutMs / 1000)} 秒，已中止`)
    }
    throw error
  }
  finally {
    clearTimeout(timeout)
  }
}

export function normalizeProviderBaseUrl(value: string): string {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Base URL 只支持 HTTP 或 HTTPS')
  if (url.username || url.password) throw new Error('Base URL 不能包含用户名或密码')
  return url.toString().replace(/\/$/, '')
}

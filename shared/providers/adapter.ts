import type {
  BuiltProviderRequest,
  NormalizedRequest,
  NormalizedResponse,
  ProviderConfig,
  ProviderProtocol,
} from './types'

const PROTOCOL_PATHS: Record<ProviderProtocol, string> = {
  'openai-chat': '/chat/completions',
  'openai-completions': '/completions',
  'openai-responses': '/responses',
  'anthropic-messages': '/messages',
}

const COMPLETE_ENDPOINT = /\/(chat\/completions|completions|responses|messages)\/?$/

export function resolveProviderEndpoint(protocol: ProviderProtocol, baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(trimmed)) throw new Error('Base URL must start with http:// or https://')
  if (COMPLETE_ENDPOINT.test(trimmed)) return trimmed

  if (protocol === 'anthropic-messages') {
    return trimmed.endsWith('/v1')
      ? `${trimmed}${PROTOCOL_PATHS[protocol]}`
      : `${trimmed}/v1${PROTOCOL_PATHS[protocol]}`
  }

  return trimmed.endsWith('/v1')
    ? `${trimmed}${PROTOCOL_PATHS[protocol]}`
    : `${trimmed}/v1${PROTOCOL_PATHS[protocol]}`
}

function messagesToPrompt(request: NormalizedRequest): string {
  return request.messages
    .map(message => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n\n')
    .concat('\n\nASSISTANT:')
}

export function buildProviderRequest(
  config: ProviderConfig,
  request: NormalizedRequest,
): BuiltProviderRequest {
  const url = resolveProviderEndpoint(config.protocol, config.baseUrl)
  const jsonHeaders = { 'Content-Type': 'application/json' }

  if (config.protocol === 'openai-chat') {
    return {
      url,
      headers: { ...jsonHeaders, Authorization: `Bearer ${config.apiKey}` },
      body: {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxOutputTokens,
        ...(request.jsonSchema
          ? {
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: request.jsonSchema.name,
                  schema: request.jsonSchema.schema,
                  strict: true,
                },
              },
            }
          : {}),
      },
    }
  }

  if (config.protocol === 'openai-completions') {
    return {
      url,
      headers: { ...jsonHeaders, Authorization: `Bearer ${config.apiKey}` },
      body: {
        model: request.model,
        prompt: messagesToPrompt(request),
        temperature: request.temperature,
        max_tokens: request.maxOutputTokens,
      },
    }
  }

  if (config.protocol === 'openai-responses') {
    return {
      url,
      headers: { ...jsonHeaders, Authorization: `Bearer ${config.apiKey}` },
      body: {
        model: request.model,
        input: request.messages.map(message => ({
          role: message.role,
          content: message.content,
        })),
        temperature: request.temperature,
        max_output_tokens: request.maxOutputTokens,
        ...(request.jsonSchema
          ? {
              text: {
                format: {
                  type: 'json_schema',
                  name: request.jsonSchema.name,
                  schema: request.jsonSchema.schema,
                  strict: true,
                },
              },
            }
          : {}),
      },
    }
  }

  const system = request.messages
    .filter(message => message.role === 'system')
    .map(message => message.content)
    .join('\n\n')
  const conversation = request.messages.filter(message => message.role !== 'system')

  return {
    url,
    headers: {
      ...jsonHeaders,
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: {
      model: request.model,
      max_tokens: request.maxOutputTokens ?? 4096,
      temperature: request.temperature,
      ...(system ? { system } : {}),
      messages: conversation.map(message => ({
        role: message.role,
        content: message.content,
      })),
    },
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function readUsage(value: unknown, inputKey: string, outputKey: string) {
  const usage = asRecord(value)
  if (!Object.keys(usage).length) return undefined
  return {
    inputTokens: asNumber(usage[inputKey]),
    outputTokens: asNumber(usage[outputKey]),
  }
}

export function parseProviderResponse(
  protocol: ProviderProtocol,
  payload: unknown,
): NormalizedResponse {
  const body = asRecord(payload)

  if (protocol === 'openai-chat') {
    const choice = asRecord(Array.isArray(body.choices) ? body.choices[0] : undefined)
    const message = asRecord(choice.message)
    return {
      text: asString(message.content),
      finishReason: typeof choice.finish_reason === 'string' ? choice.finish_reason : null,
      usage: readUsage(body.usage, 'prompt_tokens', 'completion_tokens'),
      providerRequestId: typeof body.id === 'string' ? body.id : undefined,
    }
  }

  if (protocol === 'openai-completions') {
    const choice = asRecord(Array.isArray(body.choices) ? body.choices[0] : undefined)
    return {
      text: asString(choice.text),
      finishReason: typeof choice.finish_reason === 'string' ? choice.finish_reason : null,
      usage: readUsage(body.usage, 'prompt_tokens', 'completion_tokens'),
      providerRequestId: typeof body.id === 'string' ? body.id : undefined,
    }
  }

  if (protocol === 'openai-responses') {
    let text = asString(body.output_text)
    if (!text && Array.isArray(body.output)) {
      const parts: string[] = []
      for (const item of body.output) {
        const output = asRecord(item)
        if (!Array.isArray(output.content)) continue
        for (const contentItem of output.content) {
          const content = asRecord(contentItem)
          if (content.type === 'output_text' && typeof content.text === 'string') parts.push(content.text)
        }
      }
      text = parts.join('')
    }
    return {
      text,
      finishReason: typeof body.status === 'string' ? body.status : null,
      usage: readUsage(body.usage, 'input_tokens', 'output_tokens'),
      providerRequestId: typeof body.id === 'string' ? body.id : undefined,
    }
  }

  const blocks = Array.isArray(body.content) ? body.content : []
  const text = blocks
    .map(block => {
      const record = asRecord(block)
      return record.type === 'text' ? asString(record.text) : ''
    })
    .join('')

  return {
    text,
    finishReason: typeof body.stop_reason === 'string' ? body.stop_reason : null,
    usage: readUsage(body.usage, 'input_tokens', 'output_tokens'),
    providerRequestId: typeof body.id === 'string' ? body.id : undefined,
  }
}

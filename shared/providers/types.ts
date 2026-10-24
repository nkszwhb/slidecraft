export const PROVIDER_PROTOCOLS = [
  'openai-chat',
  'openai-completions',
  'openai-responses',
  'anthropic-messages',
] as const

export type ProviderProtocol = (typeof PROVIDER_PROTOCOLS)[number]

export interface ProviderConfig {
  id: string
  name: string
  protocol: ProviderProtocol
  baseUrl: string
  apiKey: string
  timeoutMs: number
}

export interface NormalizedMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface JsonSchemaRequest {
  name: string
  schema: Record<string, unknown>
}

export interface NormalizedRequest {
  messages: NormalizedMessage[]
  model: string
  temperature?: number
  maxOutputTokens?: number
  jsonSchema?: JsonSchemaRequest
}

export interface BuiltProviderRequest {
  url: string
  headers: Record<string, string>
  body: Record<string, unknown>
}

export interface NormalizedResponse {
  text: string
  finishReason: string | null
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  providerRequestId?: string
}

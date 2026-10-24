import { describe, expect, it } from 'vitest'
import {
  buildProviderRequest,
  parseProviderResponse,
  resolveProviderEndpoint,
} from '../../shared/providers/adapter'
import type { NormalizedRequest, ProviderConfig } from '../../shared/providers/types'

const request: NormalizedRequest = {
  messages: [
    { role: 'system', content: 'You are a concise presentation planner.' },
    { role: 'user', content: 'Plan a six-slide launch deck.' },
  ],
  model: 'test-model',
  temperature: 0.4,
  maxOutputTokens: 2048,
  jsonSchema: {
    name: 'outline',
    schema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
  },
}

function config(protocol: ProviderConfig['protocol'], baseUrl: string): ProviderConfig {
  return {
    id: 'provider-1',
    name: 'Test',
    protocol,
    baseUrl,
    apiKey: 'secret-key',
    timeoutMs: 30_000,
  }
}

describe('provider endpoint resolution', () => {
  it.each([
    ['openai-chat', 'https://api.openai.com/v1', 'https://api.openai.com/v1/chat/completions'],
    ['openai-completions', 'https://api.example.com/v1/', 'https://api.example.com/v1/completions'],
    ['openai-responses', 'https://api.example.com', 'https://api.example.com/v1/responses'],
    ['anthropic-messages', 'https://api.anthropic.com', 'https://api.anthropic.com/v1/messages'],
  ] as const)('resolves %s', (protocol, base, expected) => {
    expect(resolveProviderEndpoint(protocol, base)).toBe(expected)
  })

  it('keeps explicitly supplied endpoint paths', () => {
    expect(resolveProviderEndpoint('openai-chat', 'https://gateway.example.com/chat/completions'))
      .toBe('https://gateway.example.com/chat/completions')
  })
})

describe('provider request mapping', () => {
  it('maps OpenAI chat requests with bearer auth and JSON schema', () => {
    const built = buildProviderRequest(config('openai-chat', 'https://api.example.com/v1'), request)
    expect(built.url).toBe('https://api.example.com/v1/chat/completions')
    expect(built.headers.Authorization).toBe('Bearer secret-key')
    expect(built.body.messages).toHaveLength(2)
    expect(built.body.model).toBe('test-model')
    expect(built.body.response_format).toMatchObject({ type: 'json_schema' })
  })

  it('maps Anthropic system prompts and required max_tokens separately', () => {
    const built = buildProviderRequest(config('anthropic-messages', 'https://api.anthropic.com'), request)
    expect(built.headers['x-api-key']).toBe('secret-key')
    expect(built.headers['anthropic-version']).toBeTruthy()
    expect(built.body.system).toContain('presentation planner')
    expect(built.body.messages).toEqual([{ role: 'user', content: expect.stringContaining('six-slide') }])
    expect(built.body.max_tokens).toBe(2048)
  })

  it('compiles completions requests to a single prompt', () => {
    const built = buildProviderRequest(config('openai-completions', 'https://api.example.com/v1'), request)
    expect(built.body.prompt).toContain('SYSTEM:')
    expect(built.body.prompt).toContain('USER:')
    expect(built.body.messages).toBeUndefined()
  })
})

describe('provider response normalization', () => {
  it('normalizes chat completions', () => {
    const result = parseProviderResponse('openai-chat', {
      choices: [{ message: { content: '{"title":"Deck"}' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 4 },
    })
    expect(result.text).toBe('{"title":"Deck"}')
    expect(result.finishReason).toBe('stop')
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 4 })
  })

  it('normalizes Anthropic content blocks', () => {
    const result = parseProviderResponse('anthropic-messages', {
      content: [{ type: 'text', text: 'first ' }, { type: 'text', text: 'second' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 8, output_tokens: 2 },
    })
    expect(result.text).toBe('first second')
    expect(result.finishReason).toBe('end_turn')
    expect(result.usage).toEqual({ inputTokens: 8, outputTokens: 2 })
  })

  it('normalizes Responses API output text', () => {
    const result = parseProviderResponse('openai-responses', {
      output_text: 'plan',
      status: 'completed',
      usage: { input_tokens: 12, output_tokens: 6 },
    })
    expect(result.text).toBe('plan')
    expect(result.finishReason).toBe('completed')
  })
})

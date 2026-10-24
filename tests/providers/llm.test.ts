import { describe, expect, it } from 'vitest'
import { extractJsonObject } from '../../server/services/llm'

describe('model JSON extraction', () => {
  it('reads a plain JSON object', () => {
    expect(extractJsonObject('{"title":"Deck"}')).toEqual({ title: 'Deck' })
  })

  it('reads JSON wrapped in a Markdown code fence', () => {
    expect(extractJsonObject('Here is the outline:\n```json\n{"title":"Deck","slides":[]}\n```')).toEqual({
      title: 'Deck',
      slides: [],
    })
  })

  it('rejects non-object output', () => {
    expect(() => extractJsonObject('["not", "an", "object"]')).toThrow(/object/i)
    expect(() => extractJsonObject('no json here')).toThrow(/JSON/i)
  })
})

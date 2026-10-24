import { describe, expect, it } from 'vitest'
import { buildAssetContext } from '../../server/services/assets'

describe('asset context', () => {
  it('labels extracted source text and skips empty material', () => {
    const context = buildAssetContext([
      { name: 'brief.md', text: 'Audience: seed investors\nGoal: explain differentiation' },
      { name: 'empty.txt', text: '   ' },
    ])
    expect(context).toContain('### brief.md')
    expect(context).toContain('seed investors')
    expect(context).not.toContain('empty.txt')
  })

  it('caps the total context and marks truncation', () => {
    const context = buildAssetContext([
      { name: 'long.txt', text: 'x'.repeat(30_000) },
      { name: 'second.txt', text: 'never reached' },
    ], 500)
    expect(context.length).toBeLessThanOrEqual(520)
    expect(context).toContain('[素材内容已截断]')
  })
})

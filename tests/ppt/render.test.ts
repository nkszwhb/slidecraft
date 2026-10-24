import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { renderDeck } from '../../server/services/render-deck'
import { THEMES } from '../../shared/theme/catalog'
import type { DeckOutline } from '../../shared/domain/schemas'

const outline: DeckOutline = {
  title: '季度业务回顾',
  subtitle: '2026 年第三季度',
  summary: '收入增长、客户留存改善，下一季度聚焦自助增长。',
  recipeId: 'business-report',
  slides: [
    {
      id: 's1',
      title: '季度业务回顾',
      layoutId: 'cover',
      content: { eyebrow: 'Q3 REVIEW', subtitle: '2026 年第三季度', meta: 'SlideCraft' },
    },
    {
      id: 's2',
      title: '三个关键结论',
      layoutId: 'three-cards',
      content: { title: '三个关键结论' },
      bullets: ['收入同比增长 18%', '留存率达到 94%', '交付周期缩短 31%'],
    },
    {
      id: 's3',
      title: '区域收入',
      layoutId: 'chart',
      content: { title: '区域收入', insight: '亚太市场增长最快' },
      chart: {
        type: 'bar',
        categories: ['华东', '华南', '华北'],
        series: [{ name: '收入', values: [24, 19, 15] }],
      },
    },
  ],
}

const folders: string[] = []

afterEach(async () => {
  await Promise.all(folders.splice(0).map(folder => rm(folder, { recursive: true, force: true })))
})

describe('PPTX renderer', () => {
  it('produces a non-empty editable PPTX package', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'slidecraft-render-'))
    folders.push(folder)
    const output = join(folder, 'deck.pptx')

    await renderDeck({
      outline,
      theme: THEMES[0]!,
      outputPath: output,
      slideLimit: 3,
    })

    const bytes = await readFile(output)
    expect(bytes.subarray(0, 2).toString()).toBe('PK')
    expect(bytes.byteLength).toBeGreaterThan(20_000)
  })

  it('renders every bundled theme without throwing', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'slidecraft-themes-'))
    folders.push(folder)

    for (const [index, theme] of THEMES.entries()) {
      const output = join(folder, `${index}.pptx`)
      await expect(renderDeck({ outline, theme, outputPath: output })).resolves.toBeUndefined()
    }
  })
})

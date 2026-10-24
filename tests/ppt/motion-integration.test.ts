import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import JSZip from 'jszip'
import { afterEach, describe, expect, it } from 'vitest'
import { renderDeck } from '../../server/services/render-deck'
import { applyPresentationMotion } from '../../server/services/motion'
import { validateWithOfficeCli } from '../../server/services/office-cli'
import { deckOutlineSchema, DEFAULT_PRESENTATION_SETTINGS } from '../../shared/domain/schemas'
import { ensureDeckMotion } from '../../shared/presentation/motion'
import { THEMES } from '../../shared/theme/catalog'

const binary = join(
  process.cwd(),
  'node_modules',
  '@officecli',
  'officecli',
  'vendor',
  process.platform === 'win32' ? 'officecli.exe' : 'officecli',
)
const hasOfficeCli = existsSync(binary)
const folders: string[] = []

afterEach(async () => {
  await new Promise(resolve => setTimeout(resolve, 250))
  await Promise.all(folders.splice(0).map(folder =>
    rm(folder, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }),
  ))
})

describe.skipIf(!hasOfficeCli)('PowerPoint motion integration', () => {
  it('writes native animations and transitions without breaking the package', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'slidecraft-motion-'))
    folders.push(folder)
    const output = join(folder, 'motion.pptx')
    const parsed = deckOutlineSchema.parse({
      title: 'Animated deck',
      subtitle: '',
      summary: '',
      recipeId: 'business-report',
      slides: [
        { id: 's1', title: 'Cover title', layoutId: 'cover', content: { subtitle: 'Cover subtitle' } },
        { id: 's2', title: 'Three points', layoutId: 'three-cards', content: { title: 'Three points' }, bullets: ['One', 'Two', 'Three'] },
        { id: 's3', title: 'Thanks', layoutId: 'closing', content: { subtitle: 'Bye' } },
      ],
    })
    const settings = {
      ...DEFAULT_PRESENTATION_SETTINGS,
      motion: { style: 'dynamic' as const, transition: 'fade' as const, elementSequence: 'sequence' as const },
    }
    const outline = ensureDeckMotion(parsed, settings.motion)

    await renderDeck({ outline, theme: THEMES[0]!, outputPath: output, settings })
    const result = await applyPresentationMotion(output, outline, { binary })
    expect(result.available).toBe(true)
    expect(result.applied).toBeGreaterThan(0)

    const validation = await validateWithOfficeCli(output, binary)
    expect(validation.valid, validation.message).toBe(true)

    const zip = await JSZip.loadAsync(await readFile(output))
    const firstSlide = await zip.file('ppt/slides/slide1.xml')!.async('string')
    const secondSlide = await zip.file('ppt/slides/slide2.xml')!.async('string')
    expect(firstSlide).toContain('<p:timing>')
    expect(firstSlide).toContain('<p:transition')
    expect(secondSlide).toContain('<p:timing>')
  })
})

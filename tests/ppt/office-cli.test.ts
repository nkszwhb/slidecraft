import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { renderDeck } from '../../server/services/render-deck'
import { validateWithOfficeCli } from '../../server/services/office-cli'
import { THEMES } from '../../shared/theme/catalog'
import type { DeckOutline } from '../../shared/domain/schemas'

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

const outline: DeckOutline = {
  title: 'OfficeCLI validation',
  subtitle: '',
  summary: '',
  recipeId: 'business-report',
  slides: [
    { id: 's1', title: 'OfficeCLI validation', layoutId: 'cover', content: {} },
    { id: 's2', title: 'A clear statement', layoutId: 'statement', content: { body: 'Short and readable.' } },
    { id: 's3', title: 'The end', layoutId: 'closing', content: {} },
  ],
}

afterEach(async () => {
  await new Promise(resolve => setTimeout(resolve, 250))
  await Promise.all(folders.splice(0).map(folder =>
    rm(folder, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }),
  ))
})

describe.skipIf(!hasOfficeCli)('OfficeCLI integration', () => {
  it('accepts the generated package without schema errors', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'slidecraft-officecli-'))
    folders.push(folder)
    const output = join(folder, 'validated.pptx')
    await renderDeck({ outline, theme: THEMES[0]!, outputPath: output })

    const result = await validateWithOfficeCli(output, binary)
    expect(result.available).toBe(true)
    expect(result.valid, result.message).toBe(true)
    expect(result.message).toMatch(/PowerPoint compatibility check passed/i)
  })
})

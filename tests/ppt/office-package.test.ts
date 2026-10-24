import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import JSZip from 'jszip'
import { afterEach, describe, expect, it } from 'vitest'
import { renderDeck } from '../../server/services/render-deck'
import { THEMES } from '../../shared/theme/catalog'
import type { DeckOutline } from '../../shared/domain/schemas'

const outline: DeckOutline = {
  title: 'Validation deck',
  subtitle: 'OOXML ordering',
  summary: 'Checks the generated package structure.',
  recipeId: 'business-report',
  slides: [
    {
      id: 's1',
      title: 'Validation deck',
      layoutId: 'cover',
      content: { subtitle: 'OOXML ordering' },
    },
    {
      id: 's2',
      title: 'A content slide',
      layoutId: 'statement',
      content: { body: 'This slide verifies the package.' },
    },
    {
      id: 's3',
      title: 'A chart slide',
      layoutId: 'chart',
      content: { title: 'A chart slide', insight: 'One clear signal.' },
      chart: {
        type: 'bar',
        categories: ['A', 'B', 'C'],
        series: [{ name: 'Value', values: [3, 7, 5] }],
      },
    },
    {
      id: 's4',
      title: 'Thank you',
      layoutId: 'closing',
      content: { subtitle: 'End' },
    },
  ],
}

const folders: string[] = []

afterEach(async () => {
  await Promise.all(folders.splice(0).map(folder => rm(folder, { recursive: true, force: true })))
})

describe('PPTX OOXML package', () => {
  it('preserves the PptxGenJS notes-master ordering that Microsoft PowerPoint accepts', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'slidecraft-ooxml-'))
    folders.push(folder)
    const output = join(folder, 'validation.pptx')
    await renderDeck({ outline, theme: THEMES[0]!, outputPath: output })

    const zip = await JSZip.loadAsync(await readFile(output))
    const presentation = zip.file('ppt/presentation.xml')
    expect(presentation).not.toBeNull()
    const xml = await presentation!.async('string')
    const indexes = {
      slideMaster: xml.indexOf('<p:sldMasterIdLst'),
      notesMaster: xml.indexOf('<p:notesMasterIdLst'),
      slides: xml.indexOf('<p:sldIdLst'),
      slideSize: xml.indexOf('<p:sldSz'),
      notesSize: xml.indexOf('<p:notesSz'),
      defaultText: xml.indexOf('<p:defaultTextStyle'),
    }

    expect(indexes.notesSize).toBeGreaterThan(-1)
    // This is PptxGenJS's tested order. PowerPoint 16 accepts it, while moving
    // notesMasterIdLst to the XML-schema position triggers a repair prompt.
    expect(indexes.slideMaster).toBeLessThan(indexes.slides)
    expect(indexes.slides).toBeLessThan(indexes.notesMaster)
    expect(indexes.notesMaster).toBeLessThan(indexes.slideSize)
    expect(indexes.slideSize).toBeLessThan(indexes.notesSize)
    expect(indexes.notesSize).toBeLessThan(indexes.defaultText)
  })

  it('keeps chart parts in the generated package', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'slidecraft-chart-'))
    folders.push(folder)
    const output = join(folder, 'chart.pptx')
    await renderDeck({ outline, theme: THEMES[0]!, outputPath: output })

    const zip = await JSZip.loadAsync(await readFile(output))
    const chartPath = Object.keys(zip.files).find(name => /^ppt\/charts\/chart\d+\.xml$/.test(name))
    expect(chartPath).toBeTruthy()
    const chart = zip.file(chartPath!)
    expect(chart).not.toBeNull()
    const xml = await chart!.async('string')
    expect(xml).toContain('<c:barChart>')
  })
})

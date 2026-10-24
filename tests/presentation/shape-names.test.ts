import { describe, expect, it } from 'vitest'
import { extractShapeNamesFromSlideXml } from '../../server/services/motion'

describe('PPTX semantic shape extraction', () => {
  it('reads shape ids and names from slide XML', () => {
    const xml = `
      <p:sld>
        <p:cNvPr id="14" name="motion-title"/>
        <p:cNvPr name="motion-item-1" id="27"/>
        <p:cNvPr id="28" name="motion-footer"/>
      </p:sld>
    `
    expect(extractShapeNamesFromSlideXml(xml)).toEqual([
      { id: '14', name: 'motion-title' },
      { id: '27', name: 'motion-item-1' },
      { id: '28', name: 'motion-footer' },
    ])
  })
})

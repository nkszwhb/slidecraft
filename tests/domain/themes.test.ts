import { describe, expect, it } from 'vitest'
import { LAYOUT_DEFINITIONS, THEMES, getTheme, validateThemeCatalog } from '../../shared/theme/catalog'

describe('theme catalog', () => {
  it('ships six complete, versioned themes', () => {
    expect(THEMES).toHaveLength(6)
    expect(new Set(THEMES.map(theme => theme.id)).size).toBe(6)
    for (const theme of THEMES) {
      expect(theme.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(theme.name.length).toBeGreaterThan(2)
      expect(theme.tokens.colors.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(theme.layoutIds).toEqual(LAYOUT_DEFINITIONS.map(layout => layout.id))
    }
  })

  it('defines content constraints for every semantic layout', () => {
    expect(LAYOUT_DEFINITIONS.length).toBeGreaterThanOrEqual(16)
    for (const layout of LAYOUT_DEFINITIONS) {
      expect(layout.slots.length).toBeGreaterThan(0)
      expect(layout.maxBullets === undefined || layout.maxBullets > 0).toBe(true)
      expect(layout.role).toMatch(/^(cover|structure|content|data|closing)$/)
    }
  })

  it('rejects a theme that references an unknown layout', () => {
    const broken = structuredClone(THEMES[0]!)
    broken.layoutIds = [...broken.layoutIds, 'made-up-layout']
    expect(() => validateThemeCatalog([broken])).toThrow(/unknown layout/i)
  })

  it('returns themes by id only', () => {
    expect(getTheme('tech-utility')?.name).toBe('Tech Utility')
    expect(getTheme('missing')).toBeUndefined()
  })
})

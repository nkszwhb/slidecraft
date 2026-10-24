import { describe, expect, it } from 'vitest'
import {
  clampSlideIndex,
  slideIndexForKey,
} from '../../shared/presentation/navigation'

describe('presentation navigation', () => {
  it('clamps slide indexes to the deck', () => {
    expect(clampSlideIndex(-2, 6)).toBe(0)
    expect(clampSlideIndex(8, 6)).toBe(5)
    expect(clampSlideIndex(2.9, 6)).toBe(2)
    expect(clampSlideIndex(0, 0)).toBe(0)
  })

  it('moves forward with right, down, page down and space', () => {
    for (const key of ['ArrowRight', 'ArrowDown', 'PageDown', ' ']) {
      expect(slideIndexForKey(key, 2, 6)).toBe(3)
    }
  })

  it('moves backward with left, up and page up', () => {
    for (const key of ['ArrowLeft', 'ArrowUp', 'PageUp']) {
      expect(slideIndexForKey(key, 2, 6)).toBe(1)
    }
  })

  it('supports home and end without wrapping controls', () => {
    expect(slideIndexForKey('Home', 3, 6)).toBe(0)
    expect(slideIndexForKey('End', 2, 6)).toBe(5)
    expect(slideIndexForKey('Escape', 2, 6)).toBeNull()
  })
})

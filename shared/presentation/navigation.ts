export function clampSlideIndex(index: number, slideCount: number): number {
  if (slideCount <= 0) return 0
  return Math.min(slideCount - 1, Math.max(0, Math.trunc(index)))
}

export function slideIndexForKey(key: string, currentIndex: number, slideCount: number): number | null {
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(key)) {
    return clampSlideIndex(currentIndex + 1, slideCount)
  }
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(key)) {
    return clampSlideIndex(currentIndex - 1, slideCount)
  }
  if (key === 'Home') return 0
  if (key === 'End') return clampSlideIndex(slideCount - 1, slideCount)
  return null
}

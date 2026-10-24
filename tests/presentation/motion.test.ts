import { describe, expect, it } from 'vitest'
import { deckOutlineSchema } from '../../shared/domain/schemas'
import { buildMotionBatch, ensureDeckMotion } from '../../shared/presentation/motion'

function outlineFixture() {
  return deckOutlineSchema.parse({
    title: 'Motion deck',
    subtitle: 'Testing animation planning',
    summary: 'A short deck',
    recipeId: 'business-report',
    slides: [
      { id: 's1', title: 'Cover', layoutId: 'cover', content: { subtitle: 'Subtitle' } },
      { id: 's2', title: 'Three points', layoutId: 'three-cards', content: { title: 'Three points' }, bullets: ['One', 'Two', 'Three'] },
      { id: 's3', title: 'End', layoutId: 'closing', content: { subtitle: 'Thanks' } },
    ],
  })
}

describe('motion defaults', () => {
  it('removes every animation and transition when motion is disabled', () => {
    const outline = outlineFixture()
    outline.slides[0]!.animations = [{
      targets: ['title'],
      effect: 'fly',
      direction: 'up',
      durationMs: 500,
      delayMs: 0,
      trigger: 'click',
      sequence: 'sequence',
    }]
    const result = ensureDeckMotion(outline, { style: 'none', transition: 'fade', elementSequence: 'sequence' })
    expect(result.motion).toEqual({ style: 'none', transition: 'none', elementSequence: 'sequence' })
    expect(result.slides.every(slide => slide.animations.length === 0)).toBe(true)
  })

  it('repairs duplicate or impossible model targets using the slide content', () => {
    const outline = outlineFixture()
    outline.slides[1]!.animations = [
      {
        targets: ['title'], effect: 'fade', durationMs: 450, delayMs: 0, trigger: 'after', sequence: 'group',
      },
      {
        targets: ['title'], effect: 'fly', direction: 'up', durationMs: 450, delayMs: 0, trigger: 'after', sequence: 'group',
      },
      {
        targets: ['title'], effect: 'fly', direction: 'up', durationMs: 450, delayMs: 0, trigger: 'after', sequence: 'group',
      },
    ]
    const result = ensureDeckMotion(outline, { style: 'dynamic', transition: 'fade', elementSequence: 'sequence' })
    const repaired = result.slides[1]!.animations
    expect(repaired[0]?.targets).toEqual(['title'])
    expect(repaired.filter(animation => animation.targets.includes('items'))).toHaveLength(1)
    expect(repaired.find(animation => animation.targets.includes('items'))?.effect).toBe('fly')
    expect(repaired.filter(animation => animation.targets.includes('title'))).toHaveLength(1)
  })

  it('derives per-slide semantic animations when the model omits them', () => {
    const outline = outlineFixture()
    const result = ensureDeckMotion(outline, { style: 'dynamic', transition: 'push', elementSequence: 'sequence' })
    expect(result.motion).toEqual({ style: 'dynamic', transition: 'push', elementSequence: 'sequence' })
    expect(result.slides[0]!.animations.length).toBeGreaterThan(0)
    expect(result.slides[0]!.animations.flatMap(animation => animation.targets)).toContain('title')
    expect(result.slides[1]!.animations.flatMap(animation => animation.targets)).toContain('items')
    expect(result.slides[1]!.animations.every(animation => animation.effect === 'fly')).toBe(true)
  })
})

describe('OfficeCLI motion batch planning', () => {
  it('maps semantic targets to shape ids and honors sequence triggers', () => {
    const outline = outlineFixture()
    outline.motion = { style: 'subtle', transition: 'fade', elementSequence: 'sequence' }
    outline.slides[0]!.animations = [{
      targets: ['title', 'body'],
      effect: 'fade',
      durationMs: 500,
      delayMs: 0,
      trigger: 'after',
      sequence: 'sequence',
    }]
    outline.slides[1]!.animations = [{
      targets: ['items'],
      effect: 'fly',
      direction: 'up',
      durationMs: 400,
      delayMs: 80,
      trigger: 'after',
      sequence: 'group',
    }]

    const commands = buildMotionBatch(outline, [
      [
        { id: '15', name: 'motion-title' },
        { id: '16', name: 'motion-body' },
        { id: '17', name: 'motion-body-1-heading' },
        { id: '19', name: 'motion-footer' },
      ],
      [
        { id: '25', name: 'motion-title' },
        { id: '26', name: 'motion-item-1' },
        { id: '27', name: 'motion-item-2' },
      ],
      [{ id: '35', name: 'motion-title' }],
    ])

    expect(commands).toContainEqual({ command: 'set', path: '/slide[1]', props: { transition: 'fade' } })
    expect(commands).toContainEqual({
      command: 'set',
      path: '/slide[1]/shape[@id=15]',
      props: { animation: 'fade-entrance-500-click' },
    })
    expect(commands).toContainEqual({
      command: 'set',
      path: '/slide[1]/shape[@id=16]',
      props: { animation: 'fade-entrance-500-after' },
    })
    expect(commands).toContainEqual({
      command: 'set',
      path: '/slide[1]/shape[@id=17]',
      props: { animation: 'fade-entrance-500-after' },
    })
    expect(commands).toContainEqual({
      command: 'set',
      path: '/slide[2]/shape[@id=26]',
      props: { animation: 'fly-up-entrance-400-after-delay=80' },
    })
    expect(commands).toContainEqual({
      command: 'set',
      path: '/slide[2]/shape[@id=27]',
      props: { animation: 'fly-up-entrance-400-with-delay=80' },
    })
    expect(commands.some(command => command.path.includes('id=19'))).toBe(false)
  })
})

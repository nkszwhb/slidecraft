import type {
  AnimationTarget,
  DeckMotion,
  DeckOutline,
  SlideAnimation,
  SlideSpec,
} from '../domain/schemas'

export interface PptxShapeRef {
  id: string
  name: string
}

export interface MotionBatchCommand {
  command: 'set'
  path: string
  props: Record<string, string>
}

function hasText(value: unknown): boolean {
  return typeof value === 'string'
    ? value.trim().length > 0
    : Array.isArray(value) && value.some(item => String(item).trim().length > 0)
}

function hasAnyText(slide: SlideSpec, keys: string[]): boolean {
  return keys.some(key => hasText(slide.content[key]))
}

function hasItems(slide: SlideSpec): boolean {
  return Boolean(slide.bullets?.length) || hasAnyText(slide, ['items', 'cards', 'steps', 'milestones', 'leftItems', 'rightItems'])
}

const TARGET_PRIORITY: AnimationTarget[] = ['items', 'body', 'media', 'chart', 'eyebrow', 'title']

/**
 * Only advertise targets that this layout actually renders. This prevents the
 * model (and the repair pass) from assigning an animation to a shape that will
 * never exist in the PPTX, such as bullets on a statement layout.
 */
function availableTargetsForSlide(slide: SlideSpec): Set<AnimationTarget> {
  const targets = new Set<AnimationTarget>(['title'])

  switch (slide.layoutId) {
    case 'cover':
      if (hasText(slide.content.eyebrow)) targets.add('eyebrow')
      if (hasAnyText(slide, ['subtitle', 'body', 'meta'])) targets.add('body')
      break
    case 'section':
      targets.add('eyebrow')
      if (hasText(slide.content.subtitle)) targets.add('body')
      break
    case 'agenda':
      if (hasItems(slide)) targets.add('items')
      break
    case 'statement':
      if (hasText(slide.content.body)) targets.add('body')
      break
    case 'two-column':
      if (hasAnyText(slide, ['leftTitle', 'leftBody', 'rightTitle', 'rightBody'])) targets.add('body')
      break
    case 'three-cards':
    case 'team':
    case 'four-points':
    case 'process':
    case 'timeline':
    case 'summary':
      if (hasItems(slide)) targets.add('items')
      break
    case 'comparison':
      if (hasAnyText(slide, ['leftItems', 'rightItems'])) targets.add('items')
      break
    case 'metric':
      targets.add('eyebrow')
      if (hasAnyText(slide, ['label', 'context'])) targets.add('body')
      break
    case 'chart':
      if (slide.chart) targets.add('chart')
      if (hasAnyText(slide, ['insight'])) targets.add('body')
      break
    case 'table':
      if (slide.table) targets.add('chart')
      break
    case 'quote':
      if (hasText(slide.content.source)) targets.add('body')
      break
    case 'closing':
      if (hasText(slide.content.subtitle)) targets.add('body')
      break
    case 'split-image':
    case 'image-top':
    case 'full-image':
      targets.add('media')
      if (hasAnyText(slide, ['body', 'caption', 'subtitle'])) targets.add('body')
      break
    default:
      targets.add('eyebrow')
      if (hasItems(slide)) targets.add('items')
  }

  return targets
}

function deriveTargets(slide: SlideSpec): AnimationTarget[][] {
  const available = availableTargetsForSlide(slide)
  const groups: AnimationTarget[][] = []
  const titleTargets: AnimationTarget[] = ['title']
  if (available.has('eyebrow')) titleTargets.push('eyebrow')
  groups.push(titleTargets)

  for (const target of ['body', 'items', 'media', 'chart'] as AnimationTarget[]) {
    if (available.has(target)) groups.push([target])
  }

  return groups.slice(0, 4)
}

function repairModelAnimations(
  slide: SlideSpec,
  animations: SlideAnimation[],
  sequence: DeckMotion['elementSequence'],
): SlideAnimation[] {
  const available = new Set(deriveTargets(slide).flat())
  const used = new Set<AnimationTarget>()
  const repaired: SlideAnimation[] = []

  for (const animation of animations) {
    const requested = animation.targets.filter(target => available.has(target))
    if (!requested.length) continue

    let targets = requested.filter(target => !used.has(target))
    if (!targets.length) {
      const fallback = TARGET_PRIORITY.find(target => available.has(target) && !used.has(target))
      if (!fallback) continue
      targets = [fallback]
    }

    repaired.push({ ...animation, targets, sequence })
    for (const target of targets) used.add(target)
  }

  return repaired
}

function derivedAnimation(
  targets: AnimationTarget[],
  style: Exclude<DeckMotion['style'], 'none'>,
  sequence: DeckMotion['elementSequence'],
): SlideAnimation {
  const effect = style === 'dynamic' ? 'fly' : style === 'cinematic' ? 'zoom' : 'fade'
  return {
    targets,
    effect,
    ...(effect === 'fly' ? { direction: 'up' as const } : {}),
    durationMs: style === 'cinematic' ? 700 : style === 'dynamic' ? 450 : 400,
    delayMs: 0,
    trigger: 'after',
    sequence,
  }
}

/**
 * Applies the user's global motion preference and fills sensible semantic
 * animations when a model omits the motion plan.
 */
export function ensureDeckMotion(outline: DeckOutline, preferences: DeckMotion): DeckOutline {
  const result = structuredClone(outline)
  if (preferences.style === 'none') {
    result.motion = { ...preferences, transition: 'none' }
    for (const slide of result.slides) slide.animations = []
    return result
  }

  result.motion = { ...preferences }
  for (const slide of result.slides) {
    if (slide.animations.length) {
      const repaired = repairModelAnimations(slide, slide.animations, preferences.elementSequence)
      slide.animations = repaired.length
        ? repaired
        : deriveTargets(slide).map(targets =>
            derivedAnimation(targets, preferences.style as Exclude<DeckMotion['style'], 'none'>, preferences.elementSequence),
          )
      continue
    }
    slide.animations = deriveTargets(slide).map(targets =>
      derivedAnimation(targets, preferences.style as Exclude<DeckMotion['style'], 'none'>, preferences.elementSequence),
    )
  }
  return result
}

function matchesTarget(name: string, target: AnimationTarget): boolean {
  switch (target) {
    case 'title':
    case 'eyebrow':
    case 'body':
    case 'media':
      return name === `motion-${target}` || name.startsWith(`motion-${target}-`)
    case 'items':
      return name.startsWith('motion-item-')
    case 'chart':
      return name === 'motion-chart' || name === 'motion-table'
    default:
      return false
  }
}

function animationValue(animation: SlideAnimation, trigger: SlideAnimation['trigger']): string {
  const direction = ['fly', 'wipe'].includes(animation.effect)
    ? `-${animation.direction ?? (animation.effect === 'wipe' ? 'left' : 'up')}`
    : ''
  const delay = animation.delayMs > 0 ? `-delay=${animation.delayMs}` : ''
  return `${animation.effect}${direction}-entrance-${animation.durationMs}-${trigger}${delay}`
}

/**
 * Builds a single OfficeCLI batch for slide transitions and native PowerPoint
 * entrance animations. Semantic shape names come from render-deck.ts.
 */
export function buildMotionBatch(
  outline: DeckOutline,
  shapesBySlide: PptxShapeRef[][],
): MotionBatchCommand[] {
  if (outline.motion.style === 'none') return []

  const commands: MotionBatchCommand[] = []
  let deckStarted = false
  outline.slides.forEach((slide, slideIndex) => {
    if (outline.motion.transition !== 'none') {
      commands.push({
        command: 'set',
        path: `/slide[${slideIndex + 1}]`,
        props: { transition: outline.motion.transition },
      })
    }

    let hasPriorEffect = false
    for (const animation of slide.animations) {
      const matches = (shapesBySlide[slideIndex] ?? [])
        .filter(shape => animation.targets.some(target => matchesTarget(shape.name, target)))
        .sort((a, b) => Number(a.id) - Number(b.id))

      matches.forEach((shape, shapeIndex) => {
        let trigger: SlideAnimation['trigger']
        if (!deckStarted) trigger = 'click'
        else if (!hasPriorEffect) trigger = animation.trigger === 'click'
          ? 'click'
          : animation.trigger === 'with' ? 'with' : 'after'
        else if (animation.sequence === 'group' && shapeIndex > 0) trigger = 'with'
        else if (animation.trigger === 'click') trigger = 'click'
        else if (animation.trigger === 'with') trigger = 'with'
        else trigger = 'after'

        commands.push({
          command: 'set',
          path: '/slide[' + (slideIndex + 1) + ']/shape[@id=' + shape.id + ']',
          props: { animation: animationValue(animation, trigger) },
        })
        deckStarted = true
        hasPriorEffect = true
      })
    }
  })

  return commands
}

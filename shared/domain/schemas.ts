import { z } from 'zod'
import { LAYOUT_DEFINITIONS, THEMES } from '../theme/catalog'

export const requirementSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  audience: z.string().trim().min(1).max(120),
  goal: z.string().trim().min(1).max(200),
  language: z.enum(['zh-CN', 'en-US']),
  pageCount: z.number().int().min(3).max(30),
  ratio: z.enum(['16:9', '4:3']),
  tone: z.string().trim().min(1).max(80),
  constraints: z.string().trim().max(1000).default(''),
})

export type RequirementInput = z.infer<typeof requirementSchema>

export const ANIMATION_EFFECTS = ['fade', 'fly', 'zoom', 'wipe', 'appear'] as const
export const ANIMATION_TARGETS = ['title', 'eyebrow', 'body', 'items', 'media', 'chart'] as const
export const MOTION_STYLES = ['none', 'subtle', 'dynamic', 'cinematic'] as const
export const PAGE_TRANSITIONS = ['none', 'fade', 'push', 'wipe'] as const
export const ELEMENT_SEQUENCES = ['group', 'sequence'] as const

export const slideAnimationSchema = z.object({
  targets: z.array(z.enum(ANIMATION_TARGETS)).min(1).max(6).default(['title']),
  effect: z.enum(ANIMATION_EFFECTS).default('fade'),
  direction: z.enum(['left', 'right', 'up', 'down']).optional(),
  durationMs: z.number().int().min(200).max(2000).default(450),
  delayMs: z.number().int().min(0).max(1500).default(0),
  trigger: z.enum(['click', 'after', 'with']).default('after'),
  sequence: z.enum(ELEMENT_SEQUENCES).default('group'),
})

export const deckMotionSchema = z.object({
  style: z.enum(MOTION_STYLES).default('subtle'),
  transition: z.enum(PAGE_TRANSITIONS).default('fade'),
  elementSequence: z.enum(ELEMENT_SEQUENCES).default('group'),
})

export const presentationSettingsSchema = z.object({
  motion: deckMotionSchema.default({ style: 'subtle', transition: 'fade', elementSequence: 'group' }),
  contentDensity: z.enum(['concise', 'standard', 'detailed']).default('standard'),
  showPageNumbers: z.boolean().default(true),
  showFooter: z.boolean().default(true),
})

export type SlideAnimation = z.infer<typeof slideAnimationSchema>
export type DeckMotion = z.infer<typeof deckMotionSchema>
export type PresentationSettings = z.infer<typeof presentationSettingsSchema>
export type AnimationEffect = (typeof ANIMATION_EFFECTS)[number]
export type AnimationTarget = (typeof ANIMATION_TARGETS)[number]

export const DEFAULT_PRESENTATION_SETTINGS: PresentationSettings = presentationSettingsSchema.parse({})

export const createTaskSchema = z.object({
  prompt: z.string().trim().min(10, '请至少描述 10 个字符').max(4000),
  themeId: z.string().optional(),
  recipeId: z.string().default('business-report'),
  pageCount: z.coerce.number().int().min(3).max(30).default(10),
  language: z.enum(['zh-CN', 'en-US']).default('zh-CN'),
  ratio: z.enum(['16:9', '4:3']).default('16:9'),
  title: z.string().trim().max(80).optional(),
  settings: presentationSettingsSchema.optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

const contentSchema = z.record(z.string(), z.union([z.string(), z.array(z.string())]))
const chartSchema = z.object({
  type: z.enum(['bar', 'line', 'pie']),
  categories: z.array(z.string()).min(1),
  series: z.array(z.object({
    name: z.string(),
    values: z.array(z.number()),
  })).min(1),
})
const tableSchema = z.object({
  headers: z.array(z.string()).min(1),
  rows: z.array(z.array(z.string())).min(1),
})

export const slideSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100),
  layoutId: z.string().refine(
    id => LAYOUT_DEFINITIONS.some(layout => layout.id === id),
    'Unknown layout id',
  ),
  content: contentSchema,
  bullets: z.array(z.string()).max(6).optional(),
  chart: chartSchema.optional(),
  table: tableSchema.optional(),
  notes: z.string().max(1000).optional(),
  animations: z.array(slideAnimationSchema).max(8).default([]),
})

export const deckOutlineSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(160).default(''),
  summary: z.string().max(600).default(''),
  recipeId: z.string(),
  motion: deckMotionSchema.default({ style: 'subtle', transition: 'fade', elementSequence: 'group' }),
  slides: z.array(slideSchema).min(3).max(30),
})

export type DeckOutline = z.infer<typeof deckOutlineSchema>
export type SlideSpec = z.infer<typeof slideSchema>

export const providerInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  protocol: z.enum(['openai-chat', 'openai-completions', 'openai-responses', 'anthropic-messages']),
  baseUrl: z.string().url(),
  apiKey: z.string().trim().min(1).max(500).optional(),
  timeoutMs: z.coerce.number().int().min(1000).max(600_000).default(120_000),
  enabled: z.boolean().default(true),
  models: z.array(z.object({
    modelId: z.string().trim().min(1).max(200),
    displayName: z.string().trim().min(1).max(200),
    supportsVision: z.boolean().default(false),
    isDefaultText: z.boolean().default(false),
    isDefaultVision: z.boolean().default(false),
  })).max(50).default([]),
})

export type ProviderInput = z.infer<typeof providerInputSchema>

export const themeIds = THEMES.map(theme => theme.id)

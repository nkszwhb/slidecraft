export type LayoutRole = 'cover' | 'structure' | 'content' | 'data' | 'closing'

export type SlotKind = 'text' | 'bullets' | 'image' | 'chart' | 'table' | 'quote' | 'metrics'

export interface LayoutSlot {
  key: string
  label: string
  kind: SlotKind
  required?: boolean
  maxChars?: number
}

export interface LayoutDefinition {
  id: string
  name: string
  description: string
  role: LayoutRole
  slots: LayoutSlot[]
  maxBullets?: number
  imageRequired?: boolean
  chartTypes?: Array<'bar' | 'line' | 'pie'>
}

export interface ThemeColors {
  background: string
  surface: string
  ink: string
  muted: string
  accent: string
  secondary: string
  chart: string[]
}

export interface ThemeTokens {
  colors: ThemeColors
  displayFont: string
  bodyFont: string
  headingWeight: number
  titleSize: number
  bodySize: number
  radius: number
  lineHeight: number
}

export interface ThemeDefinition {
  id: string
  version: string
  name: string
  tagline: string
  description: string
  tags: string[]
  recommendedFor: string[]
  tokens: ThemeTokens
  layoutIds: string[]
  decoration: 'minimal' | 'editorial' | 'grid' | 'executive' | 'organic' | 'bold'
}

export interface DeckRecipe {
  id: string
  name: string
  description: string
  roles: string[]
  pageRange: [number, number]
}

import type { DeckOutline, PresentationSettings } from './schemas'
import type { TaskStatus, TaskStep } from './task'

export interface RequirementView {
  topic: string
  audience: string
  goal: string
  language: 'zh-CN' | 'en-US'
  pageCount: number
  ratio: '16:9' | '4:3'
  tone: string
  constraints: string
}

export interface AssetView {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  purpose: string
  parseStatus: string
  createdAt: string
}

export interface ArtifactView {
  id: string
  kind: string
  mimeType: string
  sizeBytes: number
  metadata: Record<string, unknown>
  createdAt: string
}

export interface TaskEventView {
  id: string
  type: string
  stage: string | null
  message: string
  data: Record<string, unknown> | null
  createdAt: string
}

export interface TaskView {
  id: string
  title: string
  prompt: string
  status: TaskStatus
  currentStep: string
  themeId: string
  themeVersion: string
  recipeId: string
  pageCount: number
  language: string
  ratio: string
  requirements: RequirementView | null
  settings: PresentationSettings
  outline: DeckOutline | null
  errorMessage: string | null
  hasAssets: boolean
  assetsSkipped: boolean
  createdAt: string
  updatedAt: string
  completedAt: string | null
  steps: TaskStep[]
  assets: AssetView[]
  artifacts: ArtifactView[]
  events: TaskEventView[]
}

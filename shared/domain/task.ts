export const TASK_STATUSES = [
  'draft',
  'waiting_input',
  'queued',
  'running',
  'succeeded',
  'failed',
  'canceled',
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]
export type StepState = 'pending' | 'waiting_input' | 'running' | 'succeeded' | 'failed' | 'skipped'
export type StepId = 'requirements' | 'theme' | 'assets' | 'outline' | 'proof' | 'generate' | 'delivery'

export interface TaskStep {
  id: StepId
  label: string
  state: StepState
  optional: boolean
  description: string
}

export const TASK_STEP_META: Record<StepId, { label: string; description: string }> = {
  requirements: { label: '需求确认', description: '确认主题、受众、页数与表达约束' },
  theme: { label: '视觉主题', description: '选择预先设计的主题与页面模板' },
  assets: { label: '素材准备', description: '补充资料，或明确仅根据需求创作' },
  outline: { label: '大纲与模板', description: '确认叙事结构、逐页内容与版式' },
  proof: { label: '设计试稿', description: '确认封面和典型内容页的视觉效果' },
  generate: { label: '生成与检查', description: '生成整套幻灯片并执行结构与视觉检查' },
  delivery: { label: '预览交付', description: '预览、下载并继续提出修改' },
}

export function buildTaskFlow(input: {
  hasAssets: boolean
  assetsSkipped: boolean
  activeStep?: StepId
}): TaskStep[] {
  const steps: TaskStep[] = [
    { id: 'requirements', ...TASK_STEP_META.requirements, state: 'running', optional: false },
    { id: 'theme', ...TASK_STEP_META.theme, state: 'pending', optional: false },
    { id: 'assets', ...TASK_STEP_META.assets, state: 'pending', optional: true },
    { id: 'outline', ...TASK_STEP_META.outline, state: 'pending', optional: false },
    { id: 'proof', ...TASK_STEP_META.proof, state: 'pending', optional: false },
    { id: 'generate', ...TASK_STEP_META.generate, state: 'pending', optional: false },
    { id: 'delivery', ...TASK_STEP_META.delivery, state: 'pending', optional: false },
  ]

  const assets = steps.find(step => step.id === 'assets')!
  if (input.hasAssets) assets.state = 'succeeded'
  else if (input.assetsSkipped) assets.state = 'skipped'
  else assets.state = 'waiting_input'

  const active = input.activeStep ?? 'requirements'
  const activeIndex = steps.findIndex(step => step.id === active)
  if (active !== 'requirements' && activeIndex >= 0) {
    for (let index = 0; index < activeIndex; index += 1) {
      const step = steps[index]!
      if (step.state === 'running') step.state = 'succeeded'
      if (step.state === 'waiting_input') step.state = 'skipped'
    }
    steps[activeIndex]!.state = 'running'
  }

  return steps
}

const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  draft: ['waiting_input', 'canceled'],
  waiting_input: ['queued', 'canceled'],
  queued: ['running', 'canceled', 'failed'],
  running: ['waiting_input', 'succeeded', 'failed', 'canceled'],
  succeeded: [],
  failed: ['queued', 'canceled'],
  canceled: [],
}

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

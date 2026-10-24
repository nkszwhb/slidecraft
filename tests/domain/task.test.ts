import { describe, expect, it } from 'vitest'
import { buildTaskFlow, canTransitionTask } from '../../shared/domain/task'

describe('task flow', () => {
  it('inserts a waiting asset step when no source material exists', () => {
    const flow = buildTaskFlow({ hasAssets: false, assetsSkipped: false })
    expect(flow.find(step => step.id === 'assets')).toMatchObject({
      state: 'waiting_input',
      optional: true,
    })
    expect(flow.find(step => step.id === 'requirements')?.state).toBe('running')
  })

  it('skips the asset step when the user explicitly continues without material', () => {
    const flow = buildTaskFlow({ hasAssets: false, assetsSkipped: true })
    expect(flow.find(step => step.id === 'assets')?.state).toBe('skipped')
    expect(flow.find(step => step.id === 'outline')?.state).toBe('pending')
  })

  it('groups existing assets into a completed step', () => {
    const flow = buildTaskFlow({ hasAssets: true, assetsSkipped: false })
    expect(flow.find(step => step.id === 'assets')?.state).toBe('succeeded')
  })

  it('allows the approved task transitions only', () => {
    expect(canTransitionTask('draft', 'waiting_input')).toBe(true)
    expect(canTransitionTask('waiting_input', 'queued')).toBe(true)
    expect(canTransitionTask('queued', 'running')).toBe(true)
    expect(canTransitionTask('running', 'succeeded')).toBe(true)
    expect(canTransitionTask('failed', 'queued')).toBe(true)
    expect(canTransitionTask('succeeded', 'running')).toBe(false)
    expect(canTransitionTask('draft', 'succeeded')).toBe(false)
  })
})

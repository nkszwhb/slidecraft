import { createTaskSchema } from '../../../shared/domain/schemas'
import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/database'
import { readBodyValidated } from '../../utils/validation'
import { createTask } from '../../services/tasks'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const input = await readBodyValidated(event, createTaskSchema)
  const title = input.title?.trim() || input.prompt.replace(/\s+/g, ' ').trim().slice(0, 52)
  const id = await createTask(useDb(), { ...input, title })
  return { id }
})

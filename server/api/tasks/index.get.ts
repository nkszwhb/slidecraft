import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/database'
import { listTasks } from '../../services/tasks'

export default defineEventHandler(async (event) => {
  requireUser(event)
  return { tasks: await listTasks(useDb()) }
})

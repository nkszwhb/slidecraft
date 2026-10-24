import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/database'
import { requireTaskId } from '../../utils/validation'
import { getTask } from '../../services/tasks'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = requireTaskId(getRouterParam(event, 'id'))
  const task = await getTask(useDb(), id)
  if (!task) throw createError({ statusCode: 404, statusMessage: '任务不存在' })
  return task
})

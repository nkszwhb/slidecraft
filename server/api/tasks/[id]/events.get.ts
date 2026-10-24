import { requireUser } from '../../../utils/auth'
import { useDb } from '../../../utils/database'
import { requireTaskId } from '../../../utils/validation'
import { getEventsAfter } from '../../../services/tasks'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const taskId = requireTaskId(getRouterParam(event, 'id'))
  const db = useDb()
  const headerId = Number(getHeader(event, 'last-event-id') ?? getQuery(event).after ?? 0)
  let lastId = Number.isFinite(headerId) ? headerId : 0
  let closed = false

  setHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  const response = event.node.res
  response.write('retry: 2000\n\n')

  const flush = async () => {
    if (closed) return
    const events = await getEventsAfter(db, taskId, lastId)
    for (const item of events) {
      lastId = Number(item.id)
      response.write(`id: ${item.id}\nevent: task\ndata: ${JSON.stringify(item)}\n\n`)
    }
  }

  try {
    await flush()
  }
  catch {
    response.write('event: error\ndata: {"message":"暂时无法读取任务事件"}\n\n')
  }

  const poll = setInterval(() => {
    flush().catch(() => undefined)
  }, 1500)
  const heartbeat = setInterval(() => {
    if (!closed) response.write(': heartbeat\n\n')
  }, 15_000)

  event.node.req.on('close', () => {
    closed = true
    clearInterval(poll)
    clearInterval(heartbeat)
    response.end()
  })

  return new Promise<void>(() => undefined)
})

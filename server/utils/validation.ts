import type { H3Event } from 'h3'
import type { ZodType } from 'zod'

export async function readBodyValidated<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: '请求参数不正确',
      data: { issues: result.error.issues.map(issue => ({ path: issue.path, message: issue.message })) },
    })
  }
  return result.data
}

export function requireTaskId(value: string | undefined): string {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw createError({ statusCode: 400, statusMessage: '任务 ID 无效' })
  }
  return value
}

import { setSessionCookie } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.adminPassword) return { ok: true }

  const body = await readBody<{ email?: string; password?: string }>(event)
  if (!body?.email || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: '请输入邮箱和密码' })
  }

  const emailMatches = body.email.trim().toLowerCase() === config.adminEmail.toLowerCase()
  const passwordMatches = body.password === config.adminPassword
  if (!emailMatches || !passwordMatches) {
    await new Promise(resolve => setTimeout(resolve, 350))
    throw createError({ statusCode: 401, statusMessage: '邮箱或密码不正确' })
  }

  setSessionCookie(event)
  return { ok: true }
})

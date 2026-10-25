import { adminEmail, adminPassword, setSessionCookie } from '../../utils/auth'
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginFailure,
} from '../../utils/login-rate-limit'

export default defineEventHandler(async (event) => {
  if (!adminPassword()) return { ok: true }

  const body = await readBody<{ email?: string; password?: string }>(event)
  if (!body?.email || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: '请输入邮箱和密码' })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const rateKey = `login:${ip}`
  const limit = checkLoginRateLimit(rateKey)
  if (!limit.allowed) {
    event.node.res.setHeader('Retry-After', String(limit.retryAfterSeconds))
    throw createError({
      statusCode: 429,
      statusMessage: `登录尝试过多，请在 ${limit.retryAfterSeconds} 秒后重试`,
    })
  }

  const emailMatches = body.email.trim().toLowerCase() === adminEmail().toLowerCase()
  const passwordMatches = body.password === adminPassword()
  if (!emailMatches || !passwordMatches) {
    recordLoginFailure(rateKey)
    await new Promise(resolve => setTimeout(resolve, 350))
    throw createError({ statusCode: 401, statusMessage: '邮箱或密码不正确' })
  }

  clearLoginFailures(rateKey)
  setSessionCookie(event)
  return { ok: true }
})

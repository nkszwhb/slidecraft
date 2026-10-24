import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const COOKIE_NAME = 'slidecraft_session'

function secret(): string {
  const config = useRuntimeConfig()
  return config.appSecret || config.adminPassword || 'development-only-secret'
}

function signature(expires: number): string {
  return createHmac('sha256', secret()).update(String(expires)).digest('base64url')
}

export function authRequired(): boolean {
  const config = useRuntimeConfig()
  return Boolean(config.adminPassword)
}

export function createSessionToken(): string {
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000
  return `${expires}.${signature(expires)}`
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false
  const [expiresRaw, supplied] = token.split('.')
  const expires = Number(expiresRaw)
  if (!Number.isFinite(expires) || expires < Date.now() || !supplied) return false
  const expected = signature(expires)
  const a = Buffer.from(supplied)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function setSessionCookie(event: H3Event): void {
  const forwarded = getHeader(event, 'x-forwarded-proto')?.split(',')[0]?.trim()
  const secure = forwarded === 'https' || getRequestURL(event).protocol === 'https:'
  setCookie(event, COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
}

export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export function requireUser(event: H3Event): void {
  if (!authRequired()) return
  if (!verifySessionToken(getCookie(event, COOKIE_NAME))) {
    throw createError({ statusCode: 401, statusMessage: '请先登录' })
  }
}

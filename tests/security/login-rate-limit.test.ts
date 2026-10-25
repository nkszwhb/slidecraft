import { beforeEach, describe, expect, it } from 'vitest'
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginFailure,
  resetLoginRateLimitForTests,
} from '../../server/utils/login-rate-limit'

beforeEach(() => resetLoginRateLimitForTests())

describe('login rate limit', () => {
  it('allows five failures and blocks the sixth attempt', () => {
    const key = 'login:127.0.0.1'
    const now = 1_000_000
    for (let i = 0; i < 5; i += 1) {
      expect(checkLoginRateLimit(key, now).allowed).toBe(true)
      recordLoginFailure(key, now)
    }
    const blocked = checkLoginRateLimit(key, now)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('resets after the window expires', () => {
    const key = 'login:127.0.0.1'
    const now = 1_000_000
    for (let i = 0; i < 5; i += 1) recordLoginFailure(key, now)
    expect(checkLoginRateLimit(key, now + 15 * 60 * 1000 + 1).allowed).toBe(true)
  })

  it('clears failures after a successful login', () => {
    const key = 'login:127.0.0.1'
    for (let i = 0; i < 5; i += 1) recordLoginFailure(key)
    clearLoginFailures(key)
    expect(checkLoginRateLimit(key).allowed).toBe(true)
  })
})

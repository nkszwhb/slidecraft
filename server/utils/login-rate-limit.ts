const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5
const attempts = new Map<string, { count: number; resetAt: number }>()

export interface LoginLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

function prune(now: number): void {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key)
  }
}

export function checkLoginRateLimit(key: string, now = Date.now()): LoginLimitResult {
  prune(now)
  const entry = attempts.get(key)
  if (!entry) return { allowed: true, retryAfterSeconds: 0 }
  if (entry.count < MAX_ATTEMPTS) return { allowed: true, retryAfterSeconds: 0 }
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  }
}

export function recordLoginFailure(key: string, now = Date.now()): void {
  prune(now)
  const entry = attempts.get(key)
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }
  entry.count += 1
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key)
}

export function resetLoginRateLimitForTests(): void {
  attempts.clear()
}

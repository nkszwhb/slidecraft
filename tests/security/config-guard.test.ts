import { describe, expect, it } from 'vitest'
import { securityConfigProblems } from '../../server/utils/security-config'

const valid = {
  requireSecure: true,
  appSecret: 'a'.repeat(48),
  adminPassword: 'a-strong-admin-password',
  databaseUrl: 'postgres://slidecraft:a-strong-db-password@db:5432/slidecraft',
}

describe('securityConfigProblems', () => {
  it('allows a fully configured production deployment', () => {
    expect(securityConfigProblems(valid)).toEqual([])
  })

  it('does not block local development when the guard is off', () => {
    expect(securityConfigProblems({
      ...valid,
      requireSecure: false,
      appSecret: '',
      adminPassword: '',
      databaseUrl: 'postgres://slidecraft:slidecraft@localhost:5432/slidecraft',
    })).toEqual([])
  })

  it('rejects example secrets and weak database passwords', () => {
    const problems = securityConfigProblems({
      ...valid,
      appSecret: 'development-only-secret-change-me',
      adminPassword: 'change-me-now',
      databaseUrl: 'postgres://slidecraft:slidecraft@db:5432/slidecraft',
    })
    expect(problems).toHaveLength(3)
    expect(problems.join(' ')).toContain('APP_SECRET')
    expect(problems.join(' ')).toContain('ADMIN_PASSWORD')
    expect(problems.join(' ')).toContain('PostgreSQL')
  })

  it('rejects malformed database URLs', () => {
    expect(securityConfigProblems({ ...valid, databaseUrl: 'not-a-url' }).join(' ')).toContain('DATABASE_URL')
  })
})

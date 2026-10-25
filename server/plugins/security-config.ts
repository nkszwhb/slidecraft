import { securityConfigProblems } from '../utils/security-config'

export default defineNitroPlugin(() => {
  const requireSecure = process.env.REQUIRE_SECURE_CONFIG === 'true'
  if (!requireSecure) return

  const adminPassword = process.env.ADMIN_PASSWORD || ''
  const problems = securityConfigProblems({
    requireSecure,
    adminPassword,
    appSecret: process.env.APP_SECRET || '',
    databaseUrl: process.env.DATABASE_URL || '',
  })

  if (problems.length) {
    throw new Error(`Unsafe production configuration:\n- ${problems.join('\n- ')}`)
  }

  if (!adminPassword) {
    throw new Error('Unsafe production configuration:\n- ADMIN_PASSWORD is required when REQUIRE_SECURE_CONFIG=true.')
  }
})

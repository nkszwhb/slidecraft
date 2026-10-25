export interface SecurityConfigInput {
  requireSecure: boolean
  appSecret: string
  adminPassword: string
  databaseUrl: string
}

const PLACEHOLDER = /(change-me|replace-with|development-only|ci-only)/i

export function securityConfigProblems(input: SecurityConfigInput): string[] {
  if (!input.requireSecure) return []

  const problems: string[] = []
  if (input.appSecret.length < 32 || PLACEHOLDER.test(input.appSecret)) {
    problems.push('APP_SECRET must be a random secret of at least 32 characters and must not use an example value.')
  }
  if (input.adminPassword.length < 12 || PLACEHOLDER.test(input.adminPassword)) {
    problems.push('ADMIN_PASSWORD must be at least 12 characters and must not use an example value.')
  }

  try {
    const database = new URL(input.databaseUrl)
    const password = database.password
    if (password.length < 12 || PLACEHOLDER.test(password) || password === 'slidecraft') {
      problems.push('The PostgreSQL password must be at least 12 characters and must not use the default or an example value.')
    }
  }
  catch {
    problems.push('DATABASE_URL is not a valid PostgreSQL connection URL.')
  }

  return problems
}

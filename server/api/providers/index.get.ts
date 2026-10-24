import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/database'
import { listProviders } from '../../services/providers'

export default defineEventHandler(async (event) => {
  requireUser(event)
  return { providers: await listProviders(useDb()) }
})

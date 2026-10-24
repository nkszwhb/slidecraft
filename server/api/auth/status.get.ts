import { authRequired, verifySessionToken } from '../../utils/auth'

export default defineEventHandler((event) => {
  return {
    required: authRequired(),
    authenticated: !authRequired() || verifySessionToken(getCookie(event, 'slidecraft_session')),
    email: useRuntimeConfig().adminEmail,
  }
})

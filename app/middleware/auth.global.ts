export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return
  const requestFetch = useRequestFetch()
  try {
    const status = await requestFetch<{ required: boolean; authenticated: boolean }>('/api/auth/status')
    if (status.required && !status.authenticated) {
      return navigateTo('/login', { redirectCode: 302 })
    }
  }
  catch {
    // Let the page surface a useful API/database error instead of trapping the user in a redirect loop.
  }
})

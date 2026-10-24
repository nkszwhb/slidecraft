import { THEMES } from '../../../shared/theme/catalog'

export default defineEventHandler(() => {
  return { themes: THEMES }
})

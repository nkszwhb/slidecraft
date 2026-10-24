import { DECK_RECIPES, LAYOUT_DEFINITIONS, getTheme } from '../../../shared/theme/catalog'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const theme = getTheme(id)
  if (!theme) throw createError({ statusCode: 404, statusMessage: '主题不存在' })
  return { theme, layouts: LAYOUT_DEFINITIONS, recipes: DECK_RECIPES }
})

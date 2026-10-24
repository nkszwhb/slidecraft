export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: [
    '@fontsource-variable/inter/index.css',
    '~/assets/css/main.css',
  ],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || 'postgres://slidecraft:slidecraft@localhost:5432/slidecraft',
    appSecret: process.env.APP_SECRET || '',
    dataDir: process.env.DATA_DIR || './.data',
    officeCliBin: process.env.OFFICECLI_BIN || 'officecli',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    public: {
      appName: 'SlideCraft',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: 'SlideCraft — AI 演示文稿工作台',
      meta: [
        { name: 'description', content: '从想法到可编辑 PPT 的 AI 演示文稿工作台。' },
        { name: 'theme-color', content: '#f7f6f3' },
      ],
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  nitro: {
    experimental: {
      openAPI: true,
    },
  },
})

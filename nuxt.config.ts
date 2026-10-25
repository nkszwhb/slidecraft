export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  css: [
    '@fontsource-variable/inter/index.css',
    '~/assets/css/main.css',
  ],
  runtimeConfig: {
    // Server secrets and deployment paths are read from process.env at request
    // time in server/utils/*, not serialized into the build.
    public: {
      appName: 'SlideCraft',
      version: '0.1.0',
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

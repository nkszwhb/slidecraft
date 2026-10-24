<script setup lang="ts">
import { LayoutGrid, Plus, Settings2 } from 'lucide-vue-next'

const route = useRoute()
</script>

<template>
  <div class="app-frame">
    <header class="site-header">
      <div class="header-inner">
        <NuxtLink to="/" aria-label="返回首页">
          <AppLogo />
        </NuxtLink>

        <nav class="main-nav" aria-label="主导航">
          <NuxtLink to="/" class="nav-link" :class="{ active: route.path === '/' }">
            工作台
          </NuxtLink>
          <NuxtLink to="/themes" class="nav-link" :class="{ active: route.path.startsWith('/themes') }">
            主题库
          </NuxtLink>
        </nav>

        <div class="header-actions">
          <NuxtLink to="/settings/providers" class="icon-link" aria-label="模型设置" title="模型设置">
            <Settings2 :size="18" />
          </NuxtLink>
          <NuxtLink to="/" class="button button-ink button-small">
            <Plus :size="16" />
            新演示
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="page-main">
      <slot />
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <span>SlideCraft · 预制主题驱动的 AI 演示文稿</span>
        <span class="footer-meta">
          <LayoutGrid :size="14" />
          6 套主题 · 20 种页面模板
        </span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-frame {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid color-mix(in srgb, var(--color-line) 80%, transparent);
  background: color-mix(in srgb, var(--color-canvas) 88%, transparent);
  backdrop-filter: blur(16px);
}

.header-inner {
  width: min(var(--content-width), calc(100% - 40px));
  height: 66px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: rgb(255 255 255 / 55%);
}

.nav-link {
  padding: 6px 14px;
  border-radius: 999px;
  color: var(--color-ink-soft);
  font-size: 13px;
  font-weight: 550;
  transition: background 180ms ease, color 180ms ease;
}

.nav-link:hover,
.nav-link.active {
  color: var(--color-ink);
  background: var(--color-surface);
  box-shadow: 0 1px 3px rgb(25 24 23 / 6%);
}

.header-actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-link {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: var(--color-ink-soft);
  transition: background 180ms ease, color 180ms ease;
}

.icon-link:hover {
  color: var(--color-ink);
  background: var(--color-surface-muted);
}

.page-main {
  flex: 1;
}

.site-footer {
  border-top: 1px solid var(--color-line);
  margin-top: 80px;
}

.footer-inner {
  width: min(var(--content-width), calc(100% - 40px));
  margin: 0 auto;
  min-height: 78px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: var(--color-ink-faint);
  font-size: 12px;
}

.footer-meta {
  display: flex;
  align-items: center;
  gap: 7px;
}

@media (max-width: 720px) {
  .header-inner {
    width: calc(100% - 24px);
    grid-template-columns: 1fr auto;
    height: 60px;
  }

  .main-nav {
    display: none;
  }

  .footer-inner {
    width: calc(100% - 24px);
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 4px;
  }
}
</style>

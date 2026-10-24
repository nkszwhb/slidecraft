<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowUpRight, Check, Layers3, X } from 'lucide-vue-next'
import { DECK_RECIPES, LAYOUT_DEFINITIONS, THEMES } from '~~/shared/theme/catalog'

const activeThemeId = ref<string | null>(null)
const activeTheme = computed(() => THEMES.find(theme => theme.id === activeThemeId.value))
const filter = ref('全部')
const filters = ['全部', '商务', '科技', '教育', '创意']
const filteredThemes = computed(() => {
  if (filter.value === '全部') return THEMES
  return THEMES.filter(theme => theme.tags.includes(filter.value) || theme.recommendedFor.some(item => item.includes(filter.value)))
})
</script>

<template>
  <div class="themes-page shell">
    <header class="themes-hero">
      <span class="eyebrow">Pre-designed, not improvised</span>
      <h1>从一套成熟的设计<br>开始你的演示。</h1>
      <p>每套主题包含完整的字体、色彩、图表与 20 种页面模板。AI 在这个系统里组织内容，而不是每次凭空决定视觉。</p>
      <div class="filter-row">
        <button
          v-for="item in filters"
          :key="item"
          type="button"
          class="filter-chip"
          :class="{ active: filter === item }"
          @click="filter = item"
        >
          {{ item }}
        </button>
      </div>
    </header>

    <section class="theme-library">
      <article v-for="(theme, index) in filteredThemes" :key="theme.id" class="library-card">
        <button type="button" class="preview-stack" :aria-label="`查看 ${theme.name} 详情`" @click="activeThemeId = theme.id">
          <span class="stack-back" />
          <span class="stack-mid" />
          <ThemePreview
            :theme-id="theme.id"
            :variant="index % 3 === 0 ? 'cover' : index % 3 === 1 ? 'content' : 'chart'"
            :title="theme.id === 'editorial-magazine' ? 'Stories worth printing' : theme.id === 'bold-experimental' ? 'Make it loud' : 'Ideas into clarity'"
          />
        </button>
        <div class="library-copy">
          <div class="library-title">
            <div>
              <span class="theme-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <h2>{{ theme.name }}</h2>
            </div>
            <button type="button" class="open-button" @click="activeThemeId = theme.id">
              <ArrowUpRight :size="16" />
            </button>
          </div>
          <p>{{ theme.tagline }}</p>
          <div class="tag-row">
            <span v-for="tag in theme.tags" :key="tag">{{ tag }}</span>
          </div>
          <div class="palette">
            <i v-for="swatch in [theme.tokens.colors.background, theme.tokens.colors.ink, theme.tokens.colors.accent, theme.tokens.colors.secondary]" :key="swatch" :style="{ background: swatch }" />
            <small>{{ theme.tokens.displayFont }}</small>
          </div>
        </div>
      </article>
    </section>

    <section class="layout-section">
      <div class="layout-heading">
        <div>
          <span class="eyebrow">One system, many pages</span>
          <h2>20 种语义页面模板</h2>
        </div>
        <p>所有主题共享相同的内容结构，却拥有不同的视觉表达。AI 只选择与内容匹配的模板。</p>
      </div>
      <div class="layout-grid">
        <div v-for="layout in LAYOUT_DEFINITIONS" :key="layout.id" class="layout-item">
          <span>{{ layout.role }}</span>
          <strong>{{ layout.name }}</strong>
          <small>{{ layout.description }}</small>
        </div>
      </div>
    </section>

    <section class="recipe-section">
      <div>
        <span class="eyebrow">Deck recipes</span>
        <h2>不是只生成页面，<br>还安排叙事节奏。</h2>
      </div>
      <div class="recipe-list">
        <article v-for="recipe in DECK_RECIPES" :key="recipe.id">
          <span>{{ recipe.name }}</span>
          <strong>{{ recipe.roles.slice(0, 5).join(' → ') }}</strong>
          <p>{{ recipe.description }}</p>
        </article>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="activeTheme" class="theme-modal-backdrop" @click.self="activeThemeId = null">
        <div class="theme-modal" role="dialog" aria-modal="true" :aria-label="`${activeTheme.name} 主题详情`">
          <button type="button" class="modal-close" aria-label="关闭" @click="activeThemeId = null"><X :size="18" /></button>
          <header class="modal-head">
            <span class="eyebrow">{{ activeTheme.tags.join(' · ') }}</span>
            <h2>{{ activeTheme.name }}</h2>
            <p>{{ activeTheme.description }}</p>
          </header>
          <div class="modal-previews">
            <ThemePreview :theme-id="activeTheme.id" variant="cover" />
            <ThemePreview :theme-id="activeTheme.id" variant="content" />
            <ThemePreview :theme-id="activeTheme.id" variant="chart" />
          </div>
          <div class="modal-details">
            <div>
              <span class="detail-label">推荐场景</span>
              <p>{{ activeTheme.recommendedFor.join('、') }}</p>
            </div>
            <div>
              <span class="detail-label">设计特征</span>
              <p>{{ activeTheme.decoration }} · 标题 {{ activeTheme.tokens.titleSize }}pt · 圆角 {{ activeTheme.tokens.radius }}px</p>
            </div>
            <div>
              <span class="detail-label">模板覆盖</span>
              <p><Layers3 :size="13" /> {{ activeTheme.layoutIds.length }} 种页面 · 中英文字体降级</p>
            </div>
          </div>
          <div class="modal-actions">
            <NuxtLink to="/" class="button button-ink">
              用这套主题开始
              <ArrowUpRight :size="15" />
            </NuxtLink>
            <span><Check :size="13" /> 已通过内容容量与对比度检查</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.themes-page {
  padding-top: 64px;
}

.themes-hero {
  max-width: 760px;
}

h1 {
  margin: 17px 0 20px;
  font-size: clamp(43px, 6vw, 76px);
  font-weight: 620;
  line-height: 1;
  letter-spacing: -0.065em;
}

.themes-hero > p {
  max-width: 590px;
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 16px;
  line-height: 1.75;
}

.filter-row {
  display: flex;
  gap: 6px;
  margin-top: 26px;
}

.filter-chip {
  min-height: 32px;
  padding: 5px 12px;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: transparent;
  color: var(--color-ink-soft);
  font-size: 11px;
  font-weight: 550;
}

.filter-chip:hover,
.filter-chip.active {
  border-color: var(--color-ink);
  background: var(--color-ink);
  color: #fff;
}

.theme-library {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px 16px;
  margin-top: 54px;
}

.library-card {
  min-width: 0;
}

.preview-stack {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
}

.preview-stack :deep(.theme-preview) {
  position: relative;
  z-index: 3;
  border: 1px solid rgb(0 0 0 / 7%);
  transition: transform 240ms ease;
}

.preview-stack:hover :deep(.theme-preview) {
  transform: translateY(-4px);
}

.stack-back,
.stack-mid {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: #eae6de;
}

.stack-back {
  transform: rotate(-3deg) translateY(9px) scale(0.96);
  opacity: 0.55;
}

.stack-mid {
  transform: rotate(-1.2deg) translateY(4px) scale(0.98);
  opacity: 0.8;
}

.library-copy {
  padding: 20px 4px 0;
}

.library-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.library-title > div {
  display: flex;
  align-items: baseline;
  gap: 9px;
}

.theme-number {
  color: var(--color-ink-faint);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.library-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 620;
  letter-spacing: -0.035em;
}

.open-button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--color-line);
  border-radius: 50%;
  background: transparent;
  color: var(--color-ink-soft);
}

.open-button:hover {
  border-color: var(--color-ink);
  background: var(--color-ink);
  color: #fff;
}

.library-copy > p {
  margin: 5px 0 12px;
  color: var(--color-ink-soft);
  font-size: 12px;
}

.tag-row {
  display: flex;
  gap: 5px;
  margin-bottom: 14px;
}

.tag-row span {
  padding: 3px 7px;
  border-radius: 4px;
  background: #ebe8e1;
  color: var(--color-ink-soft);
  font-size: 9px;
}

.palette {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-top: 12px;
  border-top: 1px solid var(--color-line);
}

.palette i {
  width: 20px;
  height: 20px;
  border: 1px solid rgb(0 0 0 / 8%);
  border-radius: 50%;
}

.palette small {
  margin-left: auto;
  color: var(--color-ink-faint);
  font-size: 9px;
}

.layout-section {
  margin-top: 110px;
}

.layout-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 28px;
}

.layout-heading h2,
.recipe-section h2 {
  margin: 12px 0 0;
  font-size: clamp(28px, 3.8vw, 44px);
  line-height: 1.08;
  letter-spacing: -0.05em;
}

.layout-heading p {
  max-width: 390px;
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 12px;
  line-height: 1.65;
}

.layout-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--color-line);
  border-left: 1px solid var(--color-line);
}

.layout-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 112px;
  padding: 16px;
  border-right: 1px solid var(--color-line);
  border-bottom: 1px solid var(--color-line);
  background: rgb(255 255 255 / 32%);
}

.layout-item > span {
  color: var(--color-accent);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.layout-item strong {
  font-size: 13px;
  font-weight: 600;
}

.layout-item small {
  color: var(--color-ink-faint);
  font-size: 10px;
  line-height: 1.5;
}

.recipe-section {
  display: grid;
  grid-template-columns: 0.9fr 1.2fr;
  gap: 70px;
  margin-top: 104px;
}

.recipe-list {
  border-top: 1px solid var(--color-line);
}

.recipe-list article {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 3px 20px;
  padding: 18px 0;
  border-bottom: 1px solid var(--color-line);
}

.recipe-list article > span {
  grid-row: span 2;
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 650;
}

.recipe-list strong {
  font-size: 12px;
  font-weight: 600;
}

.recipe-list p {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 11px;
}

.theme-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(25 24 23 / 42%);
  backdrop-filter: blur(8px);
}

.theme-modal {
  position: relative;
  width: min(980px, 100%);
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  padding: 30px;
  border-radius: 25px;
  background: var(--color-canvas);
  box-shadow: 0 30px 100px rgb(0 0 0 / 25%);
}

.modal-close {
  position: absolute;
  top: 18px;
  right: 18px;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--color-line);
  border-radius: 50%;
  background: #fff;
  color: var(--color-ink);
}

.modal-head h2 {
  margin: 12px 0 7px;
  font-size: 38px;
  letter-spacing: -0.05em;
}

.modal-head p {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 13px;
}

.modal-previews {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 10px;
  margin-top: 24px;
}

.modal-previews :deep(.theme-preview) {
  border: 1px solid var(--color-line);
}

.modal-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 24px;
  padding: 18px 0;
  border-top: 1px solid var(--color-line);
  border-bottom: 1px solid var(--color-line);
}

.detail-label {
  color: var(--color-ink-faint);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.modal-details p {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 5px 0 0;
  font-size: 11px;
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 22px;
}

.modal-actions > span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--color-ink-faint);
  font-size: 10px;
}

@media (max-width: 900px) {
  .theme-library {
    grid-template-columns: 1fr 1fr;
  }

  .layout-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .recipe-section {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .modal-previews {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .themes-page {
    padding-top: 40px;
  }

  h1 {
    font-size: 45px;
  }

  .theme-library {
    grid-template-columns: 1fr;
  }

  .layout-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .layout-grid {
    grid-template-columns: 1fr 1fr;
  }

  .theme-modal-backdrop {
    padding: 10px;
  }

  .theme-modal {
    padding: 22px 16px;
    max-height: calc(100dvh - 20px);
  }

  .modal-details {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

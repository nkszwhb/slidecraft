<script setup lang="ts">
import { computed } from 'vue'
import { getTheme } from '~~/shared/theme/catalog'

const props = withDefaults(defineProps<{
  themeId: string
  variant?: 'cover' | 'content' | 'chart'
  title?: string
}>(), {
  variant: 'cover',
  title: 'Ideas into clarity',
})

const theme = computed(() => getTheme(props.themeId) ?? getTheme('modern-minimal')!)
const vars = computed(() => ({
  '--preview-bg': theme.value.tokens.colors.background,
  '--preview-surface': theme.value.tokens.colors.surface,
  '--preview-ink': theme.value.tokens.colors.ink,
  '--preview-muted': theme.value.tokens.colors.muted,
  '--preview-accent': theme.value.tokens.colors.accent,
  '--preview-secondary': theme.value.tokens.colors.secondary,
  '--preview-radius': `${Math.min(theme.value.tokens.radius, 16)}px`,
  '--preview-display': theme.value.tokens.displayFont,
}))
</script>

<template>
  <div class="theme-preview" :class="[`variant-${variant}`, `decor-${theme.decoration}`]" :style="vars" aria-hidden="true">
    <div v-if="variant === 'cover'" class="preview-cover">
      <span class="preview-eyebrow">PRESENTATION / 2026</span>
      <strong class="preview-display">{{ title }}</strong>
      <span class="preview-sub">A clear story, thoughtfully composed.</span>
      <span class="preview-rule" />
      <span class="preview-meta">SLIDECRAFT STUDIO</span>
    </div>

    <div v-else-if="variant === 'content'" class="preview-content">
      <div class="preview-head">
        <span class="preview-eyebrow">02 / CONTEXT</span>
        <strong class="preview-display">Three ideas that move us forward</strong>
      </div>
      <div class="preview-cards">
        <div v-for="index in 3" :key="index" class="preview-card">
          <span>0{{ index }}</span>
          <i />
          <b>{{ ['Clarity', 'Momentum', 'Trust'][index - 1] }}</b>
        </div>
      </div>
    </div>

    <div v-else class="preview-chart">
      <div class="preview-head">
        <span class="preview-eyebrow">03 / SIGNAL</span>
        <strong class="preview-display">Steady, measurable growth</strong>
      </div>
      <div class="bar-stage">
        <div v-for="(value, index) in [38, 58, 46, 76, 64, 88]" :key="index" class="bar" :style="{ height: `${value}%` }" />
      </div>
      <div class="axis"><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span></div>
    </div>

    <span class="preview-page">01</span>
  </div>
</template>

<style scoped>
.theme-preview {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--preview-radius);
  background: var(--preview-bg);
  color: var(--preview-ink);
  container-type: inline-size;
  isolation: isolate;
}

.preview-display {
  font-family: var(--preview-display), Georgia, sans-serif;
}

.preview-eyebrow {
  color: var(--preview-accent);
  font-size: clamp(5px, 1.25cqw, 10px);
  font-weight: 650;
  letter-spacing: 0.14em;
}

.preview-cover {
  height: 100%;
  padding: 7% 8%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3%;
}

.preview-cover strong {
  display: -webkit-box;
  max-width: 70%;
  max-height: 3.05em;
  overflow: hidden;
  font-size: clamp(16px, 6.2cqw, 48px);
  line-height: 0.98;
  letter-spacing: -0.055em;
  font-weight: 650;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.preview-sub {
  color: var(--preview-muted);
  font-size: clamp(6px, 1.7cqw, 13px);
}

.preview-rule {
  width: 20%;
  height: 2px;
  background: var(--preview-accent);
}

.preview-meta {
  color: var(--preview-muted);
  font-size: clamp(4px, 1.1cqw, 8px);
  letter-spacing: 0.14em;
}

.preview-content,
.preview-chart {
  height: 100%;
  padding: 6% 7%;
  display: flex;
  flex-direction: column;
  gap: 7%;
}

.preview-head {
  display: flex;
  flex-direction: column;
  gap: 2%;
}

.preview-head strong {
  max-width: 85%;
  font-size: clamp(11px, 4.2cqw, 32px);
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.preview-cards {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3%;
}

.preview-card {
  padding: 7%;
  display: flex;
  flex-direction: column;
  gap: 8%;
  border: 1px solid color-mix(in srgb, var(--preview-muted) 22%, transparent);
  border-radius: var(--preview-radius);
  background: var(--preview-surface);
}

.preview-card span {
  color: var(--preview-accent);
  font-size: clamp(4px, 1.2cqw, 9px);
  font-weight: 700;
}

.preview-card i {
  width: 18%;
  height: 2px;
  background: var(--preview-accent);
}

.preview-card b {
  font-size: clamp(6px, 1.8cqw, 14px);
  font-weight: 600;
}

.bar-stage {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 5%;
  border-bottom: 1px solid color-mix(in srgb, var(--preview-muted) 30%, transparent);
  padding: 0 4%;
}

.bar {
  flex: 1;
  min-height: 6%;
  border-radius: calc(var(--preview-radius) / 2) calc(var(--preview-radius) / 2) 0 0;
  background: var(--preview-accent);
  opacity: 0.86;
}

.bar:nth-child(even) {
  background: var(--preview-secondary);
  opacity: 0.9;
}

.axis {
  display: flex;
  justify-content: space-around;
  color: var(--preview-muted);
  font-size: clamp(4px, 1cqw, 7px);
}

.preview-page {
  position: absolute;
  right: 4%;
  bottom: 3%;
  color: var(--preview-muted);
  font-size: clamp(4px, 1cqw, 7px);
}

.decor-editorial {
  border-left: 2cqw solid var(--preview-accent);
}

.decor-editorial .preview-cover strong {
  font-family: Georgia, serif;
  font-weight: 500;
}

.decor-grid::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: repeating-linear-gradient(90deg, transparent 0 15%, color-mix(in srgb, var(--preview-secondary) 22%, transparent) 15% calc(15% + 1px));
  pointer-events: none;
}

.decor-executive .preview-cover {
  border-bottom: 1px solid color-mix(in srgb, var(--preview-secondary) 65%, transparent);
}

.decor-organic::after {
  content: '';
  position: absolute;
  top: -30%;
  right: -12%;
  z-index: -1;
  width: 52%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: color-mix(in srgb, var(--preview-secondary) 35%, transparent);
}

.decor-bold::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 9%;
  height: 12%;
  background: var(--preview-accent);
}

.decor-bold .preview-cover strong {
  font-weight: 800;
  text-transform: uppercase;
}
</style>

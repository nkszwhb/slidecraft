<script setup lang="ts">
import { computed } from 'vue'
import { getTheme } from '~~/shared/theme/catalog'
import type { SlideSpec } from '~~/shared/domain/schemas'

const props = withDefaults(defineProps<{
  slide: SlideSpec
  themeId: string
  index?: number
  total?: number
  animated?: boolean
  showPageNumbers?: boolean
  showFooter?: boolean
}>(), {
  index: 0,
  total: 1,
  animated: false,
  showPageNumbers: true,
  showFooter: true,
})

const theme = computed(() => getTheme(props.themeId) ?? getTheme('modern-minimal')!)
const vars = computed(() => ({
  '--slide-bg': theme.value.tokens.colors.background,
  '--slide-surface': theme.value.tokens.colors.surface,
  '--slide-ink': theme.value.tokens.colors.ink,
  '--slide-muted': theme.value.tokens.colors.muted,
  '--slide-accent': theme.value.tokens.colors.accent,
  '--slide-secondary': theme.value.tokens.colors.secondary,
  '--slide-radius': `${theme.value.tokens.radius}px`,
  '--slide-display': theme.value.tokens.displayFont,
  '--slide-title-pt': String(theme.value.tokens.titleSize),
  '--slide-body-pt': String(theme.value.tokens.bodySize),
}))

const content = computed(() => props.slide.content)
const bullets = computed(() => {
  if (props.slide.bullets?.length) return props.slide.bullets
  const raw = content.value.items ?? content.value.cards ?? content.value.steps
    ?? content.value.milestones ?? content.value.members ?? content.value.takeaways
  return Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []
})
const subtitle = computed(() => String(content.value.subtitle ?? content.value.body ?? ''))
const asStrings = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : []
const contentEyebrow = computed(() => {
  if (props.slide.layoutId === 'statement') return 'KEY MESSAGE'
  if (props.slide.layoutId === 'metric') return 'KEY METRIC'
  return ''
})

const activeMotion = computed(() => props.animated ? (props.slide.animations ?? []) : [])
const motionTargets = computed(() => new Set(activeMotion.value.flatMap(animation => animation.targets)))
const motionClasses = computed(() => {
  if (!activeMotion.value.length) return {}
  const classes: Record<string, boolean> = {
    'motion-enabled': true,
    'motion-sequence': activeMotion.value.some(animation => animation.sequence === 'sequence'),
  }
  for (const target of motionTargets.value) classes[`motion-target-${target}`] = true
  return classes
})
const motionVars = computed(() => {
  const first = activeMotion.value[0]
  const names = {
    fade: 'slideMotionFade',
    fly: 'slideMotionFly',
    zoom: 'slideMotionZoom',
    wipe: 'slideMotionWipe',
    appear: 'slideMotionAppear',
  }
  return {
    '--element-motion-name': names[first?.effect ?? 'fade'],
    '--element-duration': `${first?.durationMs ?? 450}ms`,
    '--element-delay': `${first?.delayMs ?? 0}ms`,
  }
})
const isDark = computed(() => {
  const bg = theme.value.tokens.colors.background.replace('#', '')
  const r = Number.parseInt(bg.slice(0, 2), 16)
  const g = Number.parseInt(bg.slice(2, 4), 16)
  const b = Number.parseInt(bg.slice(4, 6), 16)
  return r * 0.299 + g * 0.587 + b * 0.114 < 128
})
</script>

<template>
  <div
    class="slide-canvas"
    :class="[`layout-${slide.layoutId}`, `decor-${theme.decoration}`, { dark: isDark }, motionClasses]"
    :style="[vars, motionVars]"
  >
    <template v-if="slide.layoutId === 'cover'">
      <div class="cover-copy">
        <span class="slide-eyebrow">{{ content.eyebrow || 'PRESENTATION' }}</span>
        <h2>{{ slide.title }}</h2>
        <p>{{ subtitle }}</p>
        <span class="cover-meta">{{ content.meta }}</span>
      </div>
      <div class="cover-art">
        <span /><span /><span /><span />
      </div>
    </template>

    <template v-else-if="slide.layoutId === 'section'">
      <div class="section-copy">
        <span class="section-number">{{ content.number || String(index + 1).padStart(2, '0') }}</span>
        <h2>{{ slide.title }}</h2>
        <p>{{ subtitle }}</p>
      </div>
    </template>

    <template v-else-if="slide.layoutId === 'closing'">
      <div class="closing-copy">
        <h2>{{ slide.title }}</h2>
        <p>{{ subtitle }}</p>
      </div>
    </template>

    <template v-else>
      <header v-if="slide.layoutId !== 'metric'" class="slide-head" :class="{ 'no-eyebrow': !contentEyebrow }">
        <span v-if="contentEyebrow" class="slide-eyebrow">{{ contentEyebrow }}</span>
        <h2>{{ slide.title }}</h2>
      </header>

      <div v-if="slide.layoutId === 'agenda'" class="agenda-list">
        <div v-for="(item, itemIndex) in bullets" :key="itemIndex">
          <span>{{ String(itemIndex + 1).padStart(2, '0') }}</span>
          <strong>{{ item }}</strong>
        </div>
      </div>

      <div v-else-if="['three-cards', 'team'].includes(slide.layoutId)" class="mini-cards">
        <article v-for="(item, itemIndex) in bullets.slice(0, 3)" :key="itemIndex">
          <span>0{{ itemIndex + 1 }}</span>
          <i />
          <strong>{{ item }}</strong>
        </article>
      </div>

      <div v-else-if="slide.layoutId === 'four-points'" class="four-grid">
        <article v-for="(item, itemIndex) in bullets.slice(0, 4)" :key="itemIndex">
          <span>0{{ itemIndex + 1 }}</span>
          <strong>{{ item }}</strong>
        </article>
      </div>

      <div v-else-if="slide.layoutId === 'chart'" class="mini-chart">
        <div class="mini-chart-stage">
          <div
            v-for="(value, valueIndex) in (slide.chart?.series[0]?.values ?? [42, 64, 52, 78])"
            :key="valueIndex"
            class="mini-bar"
            :style="{ height: `${Math.max(10, (value / Math.max(...(slide.chart?.series[0]?.values ?? [100]))) * 100)}%` }"
          />
        </div>
        <p>{{ content.insight || slide.notes }}</p>
      </div>

      <div v-else-if="slide.layoutId === 'table'" class="mini-table">
        <div v-for="(row, rowIndex) in slide.table?.rows.slice(0, 4)" :key="rowIndex">
          <span v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</span>
        </div>
      </div>

      <div
        v-else-if="['process', 'timeline'].includes(slide.layoutId)"
        class="mini-process"
        :style="{ gridTemplateColumns: `repeat(${Math.min(Math.max(bullets.length, 1), 5)}, 1fr)` }"
      >
        <div v-for="(item, itemIndex) in bullets.slice(0, 5)" :key="itemIndex">
          <span>{{ String(itemIndex + 1).padStart(2, '0') }}</span>
          <i />
          <strong>{{ item }}</strong>
        </div>
      </div>

      <div v-else-if="slide.layoutId === 'metric'" class="mini-metric">
        <strong>{{ content.metric }}</strong>
        <p>{{ content.label || slide.title }}</p>
        <span>{{ content.context }}</span>
      </div>

      <div v-else-if="slide.layoutId === 'comparison'" class="mini-comparison">
        <article>
          <span>{{ content.leftLabel }}</span>
          <p v-for="item in asStrings(content.leftItems)" :key="item">{{ item }}</p>
        </article>
        <article class="accent-panel">
          <span>{{ content.rightLabel }}</span>
          <p v-for="item in asStrings(content.rightItems)" :key="item">{{ item }}</p>
        </article>
      </div>

      <div v-else-if="slide.layoutId === 'quote'" class="mini-quote">
        <span>“</span>
        <blockquote>{{ content.quote || slide.title }}</blockquote>
        <small>{{ content.source }}</small>
      </div>

      <div v-else-if="['split-image', 'image-top', 'full-image'].includes(slide.layoutId)" class="mini-visual">
        <div class="visual-block"><span>IMAGE</span></div>
        <div>
          <p>{{ subtitle || content.caption || '上传素材后，这里会使用真实图片。' }}</p>
          <ul v-if="bullets.length">
            <li v-for="item in bullets.slice(0, 3)" :key="item">{{ item }}</li>
          </ul>
        </div>
      </div>

      <div v-else-if="slide.layoutId === 'two-column'" class="mini-columns">
        <article>
          <strong>{{ content.leftTitle }}</strong>
          <p>{{ content.leftBody }}</p>
        </article>
        <article>
          <strong>{{ content.rightTitle }}</strong>
          <p>{{ content.rightBody }}</p>
        </article>
      </div>

      <div v-else class="mini-text">
        <p>{{ subtitle }}</p>
        <ul v-if="bullets.length">
          <li v-for="item in bullets.slice(0, 5)" :key="item">{{ item }}</li>
        </ul>
      </div>
    </template>

    <footer class="slide-footer">
      <span v-if="showFooter">SLIDECRAFT</span>
      <span v-else />
      <span v-if="showPageNumbers">{{ String(index + 1).padStart(2, '0') }} / {{ String(total).padStart(2, '0') }}</span>
    </footer>
  </div>
</template>

<style scoped>
.slide-canvas {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  width: 100%;
  padding: 6.5% 7%;
  display: flex;
  flex-direction: column;
  background: var(--slide-bg);
  color: var(--slide-ink);
  border-radius: var(--slide-radius);
  container-type: inline-size;
  isolation: isolate;

  /*
   * 1pt on a 13.333in-wide slide equals 0.1041667% of the full slide width.
   * cqw measures the content box, which is 86% of the slide after 7% side
   * padding, so divide by 0.86. This keeps web type scaling exactly like the
   * pt sizes in the generated PPTX at every screen size.
   */
  --slide-pt: 0.121124cqw;
}

h2,
strong,
blockquote {
  font-family: var(--slide-display), Georgia, sans-serif;
}

.slide-eyebrow {
  color: var(--slide-accent);
  font-size: calc(var(--slide-pt) * 10);
  font-weight: 700;
  letter-spacing: 0.12em;
}

.cover-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 76%;
  z-index: 2;
}

.cover-copy h2 {
  margin: 3.5% 0 2.8%;
  max-width: 95%;
  font-size: calc(var(--slide-pt) * 42);
  font-weight: 700;
  line-height: 0.98;
  letter-spacing: 0;
}

.cover-copy p {
  max-width: 72%;
  margin: 0;
  color: var(--slide-muted);
  font-size: calc(var(--slide-pt) * 19);
}

.cover-meta {
  margin-top: 8%;
  color: var(--slide-muted);
  font-size: calc(var(--slide-pt) * 11);
  letter-spacing: 0.07em;
}

.cover-art {
  position: absolute;
  right: -2%;
  bottom: -8%;
  width: 33%;
  aspect-ratio: 1;
  transform: rotate(-9deg);
  opacity: 0.85;
}

.cover-art span {
  position: absolute;
  inset: 0;
  border: 1px solid var(--slide-accent);
}

.cover-art span:nth-child(2) { inset: 12%; }
.cover-art span:nth-child(3) { inset: 24%; background: var(--slide-accent); opacity: 0.15; }
.cover-art span:nth-child(4) { inset: 38%; border-radius: 50%; background: var(--slide-accent); }

.section-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.section-number {
  color: var(--slide-accent);
  font-size: calc(var(--slide-pt) * 70);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
}

.section-copy h2 {
  margin: 3% 0 2%;
  max-width: 80%;
  font-size: calc(var(--slide-pt) * 34);
  line-height: 1.03;
  letter-spacing: 0;
}

.section-copy p,
.closing-copy p {
  color: var(--slide-muted);
  font-size: calc(var(--slide-pt) * 17);
}

.slide-head {
  display: flex;
  flex-direction: column;
  gap: 2.8%;
  margin-bottom: 5%;
}

.slide-head.no-eyebrow {
  margin-top: 0;
}

.slide-head h2 {
  margin: 0;
  max-width: 88%;
  font-size: calc(var(--slide-pt) * var(--slide-title-pt));
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: 0;
}

.agenda-list,
.four-grid,
.mini-process {
  flex: 1;
  display: grid;
  align-content: start;
  gap: 0;
}

.agenda-list > div {
  display: grid;
  grid-template-columns: 8% 1fr;
  gap: 3%;
  align-items: center;
  padding: 2.2% 0;
  border-top: 1px solid color-mix(in srgb, var(--slide-muted) 22%, transparent);
}

.agenda-list span,
.mini-cards span,
.four-grid span,
.mini-process span {
  color: var(--slide-accent);
  font-size: calc(var(--slide-pt) * 13);
  font-weight: 700;
}

.mini-cards span {
  font-size: calc(var(--slide-pt) * 14);
}

.mini-process span {
  font-size: calc(var(--slide-pt) * 12);
}

.agenda-list strong {
  font-size: calc(var(--slide-pt) * 18);
  font-weight: 400;
}

.mini-cards {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3%;
}

.mini-cards article {
  padding: 7%;
  display: flex;
  flex-direction: column;
  gap: 12%;
  border: 1px solid color-mix(in srgb, var(--slide-muted) 20%, transparent);
  border-radius: var(--slide-radius);
  background: var(--slide-surface);
}

.mini-cards i {
  width: 16%;
  height: 1px;
  background: var(--slide-accent);
}

.mini-cards strong {
  font-size: calc(var(--slide-pt) * 17);
  line-height: 1.25;
  font-weight: 700;
}

.four-grid {
  grid-template-columns: 1fr 1fr;
  gap: 5% 7%;
}

.four-grid article {
  display: grid;
  grid-template-columns: 10% 1fr;
  gap: 5%;
  align-items: start;
  padding-top: 3%;
  border-top: 1px solid color-mix(in srgb, var(--slide-muted) 22%, transparent);
}

.four-grid strong {
  font-size: calc(var(--slide-pt) * 18);
  font-weight: 400;
}

.mini-chart {
  flex: 1;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 5%;
  min-height: 0;
}

.mini-chart-stage {
  display: flex;
  align-items: flex-end;
  gap: 7%;
  padding: 2% 5% 0;
  border-bottom: 1px solid color-mix(in srgb, var(--slide-muted) 30%, transparent);
}

.mini-bar {
  flex: 1;
  min-height: 5%;
  border-radius: calc(var(--slide-radius) / 2) calc(var(--slide-radius) / 2) 0 0;
  background: var(--slide-accent);
}

.mini-bar:nth-child(even) {
  background: var(--slide-secondary);
}

.mini-chart p {
  align-self: center;
  margin: 0;
  padding: 8%;
  border: 1px solid color-mix(in srgb, var(--slide-muted) 22%, transparent);
  border-radius: var(--slide-radius);
  background: var(--slide-surface);
  font-size: calc(var(--slide-pt) * 15);
  line-height: 1.55;
}

.mini-table {
  flex: 1;
  display: grid;
  align-content: start;
  border-top: 1px solid color-mix(in srgb, var(--slide-ink) 50%, transparent);
}

.mini-table > div {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4%;
  padding: 2.5% 2%;
  border-bottom: 1px solid color-mix(in srgb, var(--slide-muted) 20%, transparent);
}

.mini-table span {
  font-size: calc(var(--slide-pt) * 11);
}

.mini-process {
  grid-template-columns: repeat(4, 1fr);
  gap: 3%;
  align-items: start;
  margin-top: 3%;
}

.mini-process > div {
  display: flex;
  flex-direction: column;
  gap: 6%;
  padding: 7%;
  min-height: 100%;
  border: 1px solid color-mix(in srgb, var(--slide-accent) 32%, transparent);
  border-radius: var(--slide-radius);
  background: var(--slide-surface);
}

.mini-process i {
  width: 20%;
  height: 1px;
  background: var(--slide-accent);
}

.mini-process strong {
  font-size: calc(var(--slide-pt) * 13);
  font-weight: 400;
}

.layout-timeline .mini-process span {
  font-size: calc(var(--slide-pt) * 10);
}

.layout-timeline .mini-process strong {
  font-size: calc(var(--slide-pt) * 11);
}

.mini-metric {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.mini-metric > strong {
  color: var(--slide-accent);
  font-size: calc(var(--slide-pt) * 80);
  font-weight: 700;
  line-height: 0.9;
  letter-spacing: 0;
}

.mini-metric p {
  margin: 3% 0 1.5%;
  font-size: calc(var(--slide-pt) * 24);
  font-weight: 700;
}

.mini-metric span {
  max-width: 65%;
  color: var(--slide-muted);
  font-size: calc(var(--slide-pt) * 16);
}

.mini-comparison {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4%;
}

.mini-comparison article {
  padding: 7%;
  border: 1px solid color-mix(in srgb, var(--slide-muted) 20%, transparent);
  border-radius: var(--slide-radius);
  background: var(--slide-surface);
}

.mini-comparison article.accent-panel {
  border-color: var(--slide-accent);
  background: var(--slide-accent);
  color: var(--slide-bg);
}

.mini-comparison span {
  font-size: calc(var(--slide-pt) * 19);
  font-weight: 700;
}

.mini-comparison p {
  margin: 5% 0 0;
  font-size: calc(var(--slide-pt) * 14);
}

.mini-quote {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 88%;
}

.mini-quote > span {
  color: var(--slide-accent);
  font-family: Georgia, serif;
  font-size: calc(var(--slide-pt) * 80);
  line-height: 0.6;
}

.mini-quote blockquote {
  margin: 0;
  font-size: calc(var(--slide-pt) * 27);
  line-height: 1.2;
  letter-spacing: 0;
}

.mini-quote small {
  margin-top: 5%;
  color: var(--slide-muted);
  font-size: calc(var(--slide-pt) * 13);
}

.mini-visual {
  flex: 1;
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 5%;
  align-items: stretch;
}

.visual-block {
  display: grid;
  place-items: center;
  min-height: 100%;
  border-radius: var(--slide-radius);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--slide-accent) 25%, transparent), transparent),
    var(--slide-surface);
  border: 1px solid color-mix(in srgb, var(--slide-muted) 22%, transparent);
}

.visual-block span {
  color: var(--slide-muted);
  font-size: calc(var(--slide-pt) * 8);
  letter-spacing: 0.14em;
}

.mini-visual > div:last-child {
  align-self: center;
}

.mini-visual p {
  color: var(--slide-muted);
  font-size: calc(var(--slide-pt) * 17);
  line-height: 1.6;
}

.mini-visual ul {
  padding-left: 4%;
  font-size: calc(var(--slide-pt) * 17);
}

.mini-columns {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5%;
}

.mini-columns article {
  padding: 5%;
  border-top: 2px solid var(--slide-accent);
}

.mini-columns strong {
  font-size: calc(var(--slide-pt) * 20);
}

.mini-columns p,
.mini-text p {
  color: var(--slide-muted);
  font-size: calc(var(--slide-pt) * 18);
  line-height: 1.65;
}

.mini-columns p {
  font-size: calc(var(--slide-pt) * 15);
}

.mini-text {
  flex: 1;
}

.mini-text ul {
  margin-top: 4%;
  padding-left: 3%;
  display: grid;
  gap: 3%;
}

.mini-text li {
  padding-left: 2%;
  font-size: calc(var(--slide-pt) * 18);
}

.closing-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 2;
}

.layout-closing {
  background: var(--slide-accent);
  color: var(--slide-bg);
}

.layout-closing .slide-eyebrow,
.layout-closing p {
  color: color-mix(in srgb, var(--slide-bg) 78%, transparent);
}

.closing-copy h2 {
  margin: 3% 0;
  max-width: 78%;
  font-size: calc(var(--slide-pt) * 43);
  line-height: 1;
  letter-spacing: 0;
}

.slide-footer {
  position: absolute;
  right: 7%;
  bottom: 4.5%;
  left: 7%;
  display: flex;
  justify-content: space-between;
  color: var(--slide-muted);
  font-size: calc(var(--slide-pt) * 7);
  letter-spacing: 0.2em;
}

.slide-footer span:last-child {
  font-size: calc(var(--slide-pt) * 8);
}

.layout-closing .slide-footer {
  color: color-mix(in srgb, var(--slide-bg) 65%, transparent);
}

.decor-editorial {
  border-left: 1.3cqw solid var(--slide-accent);
}

.decor-grid::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: repeating-linear-gradient(90deg, transparent 0 16%, color-mix(in srgb, var(--slide-secondary) 18%, transparent) 16% calc(16% + 1px));
}

.decor-executive .slide-head {
  padding-bottom: 3%;
  border-bottom: 1px solid color-mix(in srgb, var(--slide-secondary) 45%, transparent);
}

.decor-organic::after {
  content: '';
  position: absolute;
  right: -15%;
  bottom: -35%;
  z-index: -1;
  width: 50%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: color-mix(in srgb, var(--slide-secondary) 28%, transparent);
}

.decor-bold::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 7%;
  height: 10%;
  background: var(--slide-accent);
}

.decor-bold .slide-head h2,
.decor-bold .cover-copy h2 {
  text-transform: uppercase;
}

.motion-target-title .cover-copy h2,
.motion-target-title .section-copy h2,
.motion-target-title .slide-head h2,
.motion-target-title .closing-copy h2,
.motion-target-title .mini-quote blockquote,
.motion-target-title .mini-metric > strong {
  animation-name: var(--element-motion-name);
  animation-duration: var(--element-duration);
  animation-delay: var(--element-delay);
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-fill-mode: both;
}

.motion-target-eyebrow .slide-eyebrow,
.motion-target-eyebrow .section-number {
  animation-name: var(--element-motion-name);
  animation-duration: var(--element-duration);
  animation-delay: var(--element-delay);
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-fill-mode: both;
}

.motion-target-body .cover-copy p,
.motion-target-body .section-copy p,
.motion-target-body .closing-copy p,
.motion-target-body .mini-text p,
.motion-target-body .mini-chart p,
.motion-target-body .mini-columns p,
.motion-target-body .mini-metric p,
.motion-target-body .mini-metric span,
.motion-target-body .mini-visual p,
.motion-target-body .mini-quote small,
.motion-target-body .mini-comparison span {
  animation-name: var(--element-motion-name);
  animation-duration: var(--element-duration);
  animation-delay: calc(var(--element-delay) + 90ms);
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-fill-mode: both;
}

.motion-target-items .agenda-list > div,
.motion-target-items .mini-cards article,
.motion-target-items .four-grid article,
.motion-target-items .mini-process > div,
.motion-target-items .mini-comparison article,
.motion-target-items .mini-text li,
.motion-target-items .mini-visual ul li,
.motion-target-items .mini-table > div {
  animation-name: var(--element-motion-name);
  animation-duration: var(--element-duration);
  animation-delay: calc(var(--element-delay) + 170ms);
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-fill-mode: both;
}

.motion-target-media .visual-block,
.motion-target-chart .mini-chart-stage {
  animation-name: var(--element-motion-name);
  animation-duration: var(--element-duration);
  animation-delay: calc(var(--element-delay) + 140ms);
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-fill-mode: both;
}

.motion-sequence .agenda-list > div:nth-child(2),
.motion-sequence .mini-cards article:nth-child(2),
.motion-sequence .four-grid article:nth-child(2),
.motion-sequence .mini-process > div:nth-child(2),
.motion-sequence .mini-text li:nth-child(2),
.motion-sequence .mini-table > div:nth-child(2) {
  animation-delay: calc(var(--element-delay) + 250ms);
}

.motion-sequence .agenda-list > div:nth-child(3),
.motion-sequence .mini-cards article:nth-child(3),
.motion-sequence .four-grid article:nth-child(3),
.motion-sequence .mini-process > div:nth-child(3),
.motion-sequence .mini-text li:nth-child(3),
.motion-sequence .mini-table > div:nth-child(3) {
  animation-delay: calc(var(--element-delay) + 330ms);
}

.motion-sequence .agenda-list > div:nth-child(4),
.motion-sequence .four-grid article:nth-child(4),
.motion-sequence .mini-process > div:nth-child(4),
.motion-sequence .mini-text li:nth-child(4),
.motion-sequence .mini-table > div:nth-child(4) {
  animation-delay: calc(var(--element-delay) + 410ms);
}

.motion-sequence .mini-text li:nth-child(5),
.motion-sequence .mini-table > div:nth-child(5) {
  animation-delay: calc(var(--element-delay) + 490ms);
}

@keyframes slideMotionFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideMotionFly {
  from { opacity: 0; transform: translateY(22px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideMotionZoom {
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slideMotionWipe {
  from { opacity: 0; clip-path: inset(0 100% 0 0); }
  to { opacity: 1; clip-path: inset(0); }
}

@keyframes slideMotionAppear {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>

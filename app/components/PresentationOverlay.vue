<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import { clampSlideIndex, slideIndexForKey } from '~~/shared/presentation/navigation'
import { getTheme } from '~~/shared/theme/catalog'
import type { SlideSpec } from '~~/shared/domain/schemas'

const props = withDefaults(defineProps<{
  slides: SlideSpec[]
  themeId: string
  title: string
  initialIndex?: number
  ratio?: string
}>(), {
  initialIndex: 0,
  ratio: '16:9',
})

const emit = defineEmits<{ close: [] }>()

const root = ref<HTMLElement>()
const currentIndex = ref(clampSlideIndex(props.initialIndex, props.slides.length))
const controlsVisible = ref(true)
const enteredFullscreen = ref(false)
const closed = ref(false)
const theme = computed(() => getTheme(props.themeId))
const currentSlide = computed(() => props.slides[currentIndex.value])

let previousFocus: HTMLElement | null = null
let previousOverflow = ''
let hideTimer: ReturnType<typeof setTimeout> | undefined
let pointerStartX: number | null = null

function scheduleHide() {
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    controlsVisible.value = false
  }, 2200)
}

function revealControls() {
  controlsVisible.value = true
  scheduleHide()
}

function moveBy(delta: number) {
  currentIndex.value = clampSlideIndex(currentIndex.value + delta, props.slides.length)
  revealControls()
}

function close() {
  if (closed.value) return
  closed.value = true
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => undefined)
  }
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  const target = slideIndexForKey(event.key, currentIndex.value, props.slides.length)
  if (target === null) return
  event.preventDefault()
  currentIndex.value = target
  revealControls()
}

function onPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement
  if (target.closest('button, a')) return
  pointerStartX = event.clientX
}

function onPointerUp(event: PointerEvent) {
  if (pointerStartX === null) return
  const distance = event.clientX - pointerStartX
  pointerStartX = null
  if (Math.abs(distance) < 48) return
  moveBy(distance < 0 ? 1 : -1)
}

function onFullscreenChange() {
  if (document.fullscreenElement) {
    enteredFullscreen.value = true
    return
  }
  if (enteredFullscreen.value) close()
}

onMounted(async () => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  scheduleHide()

  const fullscreenRequest = (async () => {
    try {
      if (document.fullscreenEnabled && root.value && !document.fullscreenElement) {
        await root.value.requestFullscreen()
        enteredFullscreen.value = true
      }
    }
    catch {
      // Keyboard, click zones and Esc still work in the fallback overlay.
    }
  })()

  await nextTick()
  root.value?.focus({ preventScroll: true })
  await fullscreenRequest
})

onBeforeUnmount(() => {
  clearTimeout(hideTimer)
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.body.style.overflow = previousOverflow
  previousFocus?.focus({ preventScroll: true })
})
</script>

<template>
  <div
    ref="root"
    class="presentation-overlay"
    :class="{ 'controls-hidden': !controlsVisible }"
    role="dialog"
    aria-modal="true"
    :aria-label="`${title} 全屏演示`"
    tabindex="-1"
    @pointermove="revealControls"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @focusin="revealControls"
  >
    <header class="presentation-controls" data-controls>
      <div class="presentation-identity">
        <span class="presentation-dot" />
        <div>
          <strong>{{ title }}</strong>
          <span>{{ theme?.name || 'SlideCraft' }} · {{ ratio }}</span>
        </div>
      </div>
      <div class="presentation-counter" aria-live="polite" aria-atomic="true">
        {{ currentIndex + 1 }} <span>/ {{ slides.length }}</span>
      </div>
      <button type="button" class="presentation-close" aria-label="退出演示" @click="close">
        <X :size="20" />
      </button>
    </header>

    <main class="presentation-stage">
      <button type="button" class="nav-zone nav-prev" aria-label="上一页" @click="moveBy(-1)">
        <ChevronLeft :size="26" />
      </button>

      <div class="presentation-slide-frame">
        <Transition name="presentation-fade" mode="out-in">
          <SlideCanvas
            v-if="currentSlide"
            :key="currentSlide.id"
            :slide="currentSlide"
            :theme-id="themeId"
            :index="currentIndex"
            :total="slides.length"
          />
        </Transition>
      </div>

      <button type="button" class="nav-zone nav-next" aria-label="下一页" @click="moveBy(1)">
        <ChevronRight :size="26" />
      </button>
    </main>

    <footer class="presentation-progress" aria-hidden="true">
      <span :style="{ width: `${((currentIndex + 1) / slides.length) * 100}%` }" />
    </footer>
  </div>
</template>

<style scoped>
.presentation-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0b0b0a;
  color: #fff;
  outline: none;
  user-select: none;
}

.presentation-controls {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 4;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
  padding: 18px 24px;
  background: linear-gradient(to bottom, rgb(0 0 0 / 72%), transparent);
  transition: opacity 220ms ease, transform 220ms ease;
}

.controls-hidden .presentation-controls {
  opacity: 0;
  transform: translateY(-8px);
  pointer-events: none;
}

.presentation-identity {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.presentation-dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #43d7c3;
  box-shadow: 0 0 18px rgb(67 215 195 / 65%);
}

.presentation-identity div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.presentation-identity strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.presentation-identity span:last-child {
  color: rgb(255 255 255 / 50%);
  font-size: 9px;
  letter-spacing: 0.05em;
}

.presentation-counter {
  color: #fff;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  font-weight: 650;
}

.presentation-counter span {
  color: rgb(255 255 255 / 44%);
  font-weight: 400;
}

.presentation-close {
  justify-self: end;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 50%;
  background: rgb(255 255 255 / 8%);
  color: #fff;
  transition: background 160ms ease, border-color 160ms ease;
}

.presentation-close:hover {
  border-color: rgb(255 255 255 / 34%);
  background: rgb(255 255 255 / 16%);
}

.presentation-stage {
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  touch-action: pan-y;
}

.presentation-slide-frame {
  width: min(calc(100vw - 32px), calc((100dvh - 32px) * 16 / 9));
  max-width: none;
  filter: drop-shadow(0 26px 80px rgb(0 0 0 / 55%));
}

.presentation-slide-frame :deep(.slide-canvas) {
  border-radius: 2px;
}

.nav-zone {
  position: absolute;
  top: 15%;
  bottom: 13%;
  z-index: 3;
  display: grid;
  place-items: center;
  width: clamp(64px, 11vw, 160px);
  border: 0;
  background: transparent;
  color: rgb(255 255 255 / 0%);
  transition: color 180ms ease, background 180ms ease;
}

.nav-zone:hover,
.nav-zone:focus-visible {
  color: rgb(255 255 255 / 74%);
  background: linear-gradient(to right, rgb(255 255 255 / 4%), transparent);
}

.nav-prev {
  left: 0;
}

.nav-next {
  right: 0;
  background: linear-gradient(to left, rgb(255 255 255 / 3%), transparent);
}

.nav-next:hover,
.nav-next:focus-visible {
  background: linear-gradient(to left, rgb(255 255 255 / 4%), transparent);
}

.presentation-progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  background: rgb(255 255 255 / 9%);
}

.presentation-progress span {
  display: block;
  height: 100%;
  background: #43d7c3;
  transition: width 220ms ease;
}

.controls-hidden {
  cursor: none;
}

.controls-hidden .nav-zone {
  color: transparent;
}

.presentation-fade-enter-active,
.presentation-fade-leave-active {
  transition: opacity 140ms ease, transform 180ms ease;
}

.presentation-fade-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.presentation-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

@media (max-width: 720px) {
  .presentation-controls {
    grid-template-columns: 1fr auto;
    padding: 14px 14px;
  }

  .presentation-counter {
    display: none;
  }

  .presentation-stage {
    padding: max(6px, env(safe-area-inset-top)) 4px max(6px, env(safe-area-inset-bottom));
  }

  .presentation-slide-frame {
    width: min(calc(100vw - 8px), calc((100dvh - 12px) * 16 / 9));
  }

  .nav-zone {
    width: 54px;
    color: rgb(255 255 255 / 38%);
  }

  .presentation-identity strong {
    max-width: 210px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .presentation-fade-enter-active,
  .presentation-fade-leave-active,
  .presentation-controls,
  .presentation-progress span {
    transition: none;
  }
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Wand2 } from 'lucide-vue-next'
import type {
  AnimationEffect,
  AnimationTarget,
  DeckMotion,
  SlideAnimation,
} from '~~/shared/domain/schemas'

const props = defineProps<{
  modelValue: SlideAnimation[]
  motion: DeckMotion
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SlideAnimation[]]
}>()

const targets = ref<AnimationTarget[]>([])
const effect = ref<AnimationEffect | 'none'>('none')
const sequence = ref<DeckMotion['elementSequence']>('group')

const targetOptions: Array<{ value: AnimationTarget; label: string }> = [
  { value: 'title', label: '标题' },
  { value: 'body', label: '正文' },
  { value: 'items', label: '要点' },
  { value: 'media', label: '图片' },
  { value: 'chart', label: '图表' },
]

const effectOptions: Array<{ value: AnimationEffect | 'none'; label: string }> = [
  { value: 'none', label: '无动效' },
  { value: 'fade', label: '淡入' },
  { value: 'fly', label: '上浮飞入' },
  { value: 'zoom', label: '缩放进入' },
  { value: 'wipe', label: '擦除显示' },
  { value: 'appear', label: '直接出现' },
]

const effectLabels = Object.fromEntries(effectOptions.map(option => [option.value, option.label]))
const targetLabels = Object.fromEntries(targetOptions.map(option => [option.value, option.label]))

const disabled = computed(() => props.motion.style === 'none')

const summary = computed(() => {
  if (disabled.value) return '全局动画已关闭'
  if (!props.modelValue.length) return '无动效'
  const targetNames = [...new Set(props.modelValue.flatMap(animation => animation.targets))]
    .map(target => targetLabels[target])
    .filter(Boolean)
  const mainEffect = effectLabels[props.modelValue[0]?.effect ?? 'none']
  const mode = props.modelValue.some(animation => animation.sequence === 'sequence') ? '逐项' : '整组'
  const allTargets = props.modelValue.flatMap(animation => animation.targets)
  const hasSeries = targetNames.length > 1 || allTargets.some(target => ['items', 'media', 'chart'].includes(target))
  return `${mainEffect} · ${targetNames.join('、')}${hasSeries ? ` · ${mode}` : ''}`
})

function syncFromModel() {
  if (!props.modelValue.length) {
    effect.value = 'none'
    targets.value = []
    sequence.value = props.motion.elementSequence
    return
  }
  effect.value = props.modelValue[0]?.effect ?? 'fade'
  targets.value = [...new Set(props.modelValue.flatMap(animation => animation.targets))]
  sequence.value = props.modelValue[0]?.sequence ?? props.motion.elementSequence
}

watch(() => props.modelValue, syncFromModel, { deep: true, immediate: true })

function commit() {
  if (disabled.value || effect.value === 'none' || targets.value.length === 0) {
    emit('update:modelValue', [])
    return
  }
  const existing = props.modelValue[0]
  const duration = existing?.effect === effect.value ? existing.durationMs : effect.value === 'appear' ? 200 : 450
  const direction = effect.value === 'fly' ? 'up' as const : effect.value === 'wipe' ? 'left' as const : undefined
  emit('update:modelValue', [{
    targets: [...targets.value],
    effect: effect.value,
    ...(direction ? { direction } : {}),
    durationMs: duration,
    delayMs: existing?.delayMs ?? 0,
    trigger: existing?.trigger ?? 'after',
    sequence: sequence.value,
  }])
}

function toggleTarget(target: AnimationTarget) {
  if (targets.value.includes(target)) {
    if (targets.value.length === 1) return
    targets.value = targets.value.filter(item => item !== target)
  }
  else {
    targets.value = [...targets.value, target]
  }
  if (targets.value.length && effect.value === 'none') effect.value = 'fade'
  commit()
}

function setEffect(value: AnimationEffect | 'none') {
  effect.value = value
  if (value !== 'none' && targets.value.length === 0) targets.value = ['title']
  commit()
}

function setSequence(value: DeckMotion['elementSequence']) {
  sequence.value = value
  commit()
}
</script>

<template>
  <details class="slide-motion-editor" :class="{ disabled }">
    <summary>
      <span class="motion-icon"><Wand2 :size="12" /></span>
      <span class="motion-summary">{{ summary }}</span>
      <span v-if="!disabled" class="motion-edit-label">调整</span>
    </summary>

    <div v-if="!disabled" class="motion-controls">
      <label>
        <span>效果</span>
        <select :value="effect" class="motion-select" @change="setEffect(($event.target as HTMLSelectElement).value as AnimationEffect | 'none')">
          <option v-for="option in effectOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>

      <div class="target-field">
        <span>元素</span>
        <div class="target-chips">
          <button
            v-for="option in targetOptions"
            :key="option.value"
            type="button"
            :class="{ selected: targets.includes(option.value) }"
            :disabled="targets.length === 1 && targets.includes(option.value)"
            @click="toggleTarget(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <label>
        <span>出场</span>
        <select :value="sequence" class="motion-select" @change="setSequence(($event.target as HTMLSelectElement).value as DeckMotion['elementSequence'])">
          <option value="group">整组出现</option>
          <option value="sequence">逐项出现</option>
        </select>
      </label>
    </div>
  </details>
</template>

<style scoped>
.slide-motion-editor {
  margin: 0 3px 9px 44px;
  border: 1px solid #e7e2d8;
  border-radius: 9px;
  background: #fbfaf7;
}

.slide-motion-editor.disabled {
  opacity: 0.62;
}

summary {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 5px 9px;
  color: var(--color-ink-soft);
  font-size: 9px;
  cursor: pointer;
  list-style: none;
}

summary::-webkit-details-marker {
  display: none;
}

.motion-icon {
  display: grid;
  place-items: center;
  width: 21px;
  height: 21px;
  border-radius: 6px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.motion-summary {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.motion-edit-label {
  color: var(--color-accent);
  font-weight: 650;
}

.motion-controls {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  padding: 9px;
  border-top: 1px solid #e7e2d8;
}

.motion-controls label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.motion-controls label > span,
.target-field > span {
  color: var(--color-ink-faint);
  font-size: 8px;
  font-weight: 650;
  letter-spacing: 0.05em;
}

.motion-select {
  min-height: 29px;
  padding: 4px 7px;
  border: 1px solid var(--color-line);
  border-radius: 7px;
  background: #fff;
  color: var(--color-ink);
  font-size: 10px;
}

.target-field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
}

.target-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.target-chips button {
  min-height: 27px;
  padding: 3px 8px;
  border: 1px solid var(--color-line);
  border-radius: 6px;
  background: #fff;
  color: var(--color-ink-faint);
  font-size: 9px;
}

.target-chips button.selected {
  border-color: #cfc6fb;
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
  font-weight: 650;
}

.target-chips button:disabled {
  cursor: default;
  opacity: 0.7;
}

@media (max-width: 640px) {
  .slide-motion-editor {
    margin-left: 0;
  }

  .motion-controls {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

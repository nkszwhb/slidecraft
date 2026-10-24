<script setup lang="ts">
const { items } = useToast()
</script>

<template>
  <div class="toast-stack" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div v-for="item in items" :key="item.id" class="toast" :class="`toast-${item.tone}`">
        {{ item.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  z-index: 1000;
  right: 24px;
  bottom: 24px;
  display: grid;
  gap: 10px;
  width: min(380px, calc(100vw - 32px));
  pointer-events: none;
}

.toast {
  padding: 12px 16px;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  color: var(--color-ink);
  font-size: 14px;
}

.toast-success { border-color: #b9d8c9; background: #f1faf5; }
.toast-error { border-color: #ecc8c8; background: #fff6f5; color: #7d2929; }

.toast-enter-active,
.toast-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>

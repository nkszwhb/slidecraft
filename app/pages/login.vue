<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { ArrowRight, LockKeyhole } from 'lucide-vue-next'

definePageMeta({ layout: false })

const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)
const configured = ref(true)

onMounted(async () => {
  const status = await $fetch<{ required: boolean; authenticated: boolean; email: string }>('/api/auth/status').catch(() => null)
  if (status) {
    configured.value = status.required
    form.email = status.email
    if (status.authenticated) await navigateTo('/')
  }
})

async function login() {
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: form })
    await navigateTo('/')
  }
  catch (cause) {
    error.value = apiErrorMessage(cause, '登录失败')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-aside">
      <AppLogo />
      <div class="login-message">
        <span class="eyebrow">A calmer presentation workflow</span>
        <h1>先从一套<br>好设计开始。</h1>
        <p>预制主题、真实大纲、两页试稿，最后才是整套生成。每一步都能检查。</p>
      </div>
      <span class="login-version">SlideCraft · self-hosted</span>
    </div>

    <div class="login-panel">
      <form class="login-card" @submit.prevent="login">
        <span class="login-icon"><LockKeyhole :size="18" /></span>
        <h2>进入工作台</h2>
        <p v-if="configured">此实例已启用管理员登录。</p>
        <p v-else>当前实例未配置管理员密码，可直接进入。</p>

        <template v-if="configured">
          <label>
            <span class="field-label">管理员邮箱</span>
            <input v-model="form.email" type="email" class="text-input" autocomplete="username" required>
          </label>
          <label>
            <span class="field-label">密码</span>
            <input v-model="form.password" type="password" class="text-input" autocomplete="current-password" required>
          </label>
          <p v-if="error" class="error-box">{{ error }}</p>
          <button class="button button-ink login-submit" :disabled="loading">
            <span v-if="loading" class="spinner" />
            登录
            <ArrowRight :size="15" />
          </button>
        </template>

        <NuxtLink v-else to="/" class="button button-ink login-submit">
          打开工作台
          <ArrowRight :size="15" />
        </NuxtLink>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  background: var(--color-canvas);
}

.login-aside {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 36px 42px;
  background: #1a1918;
  color: #f7f6f3;
}

.login-aside::after {
  content: '';
  position: absolute;
  right: -18%;
  bottom: -24%;
  width: 64%;
  aspect-ratio: 1;
  border: 1px solid #4d4a45;
  transform: rotate(18deg);
  box-shadow:
    60px -60px 0 -1px #242321,
    60px -60px 0 0 #3e3b37,
    120px -120px 0 -1px #242321,
    120px -120px 0 0 #33312d;
}

.login-aside :deep(.brand-name) {
  color: #fff;
}

.login-aside :deep(.brand-mark) {
  background: #f7f6f3;
}

.login-aside :deep(.brand-mark span) {
  background: #1a1918;
}

.login-aside :deep(.brand-mark span:nth-child(3)) {
  background: var(--color-accent);
}

.login-message {
  position: relative;
  z-index: 2;
  max-width: 520px;
}

.login-message h1 {
  margin: 18px 0 20px;
  font-size: clamp(46px, 5.8vw, 76px);
  line-height: 0.98;
  letter-spacing: -0.06em;
}

.login-message p {
  max-width: 380px;
  color: #aaa59d;
  font-size: 14px;
  line-height: 1.75;
}

.login-version {
  color: #757169;
  font-size: 10px;
  letter-spacing: 0.08em;
}

.login-panel {
  display: grid;
  place-items: center;
  padding: 30px;
}

.login-card {
  width: min(390px, 100%);
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.login-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin-bottom: 5px;
  border: 1px solid var(--color-line);
  border-radius: 50%;
  background: #fff;
  color: var(--color-accent);
}

.login-card h2 {
  margin: 0;
  font-size: 28px;
  letter-spacing: -0.04em;
}

.login-card > p {
  margin: -5px 0 8px;
  color: var(--color-ink-soft);
  font-size: 12px;
}

.login-submit {
  width: 100%;
  margin-top: 5px;
}

@media (max-width: 800px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-aside {
    min-height: 280px;
    padding: 24px;
  }

  .login-message h1 {
    font-size: 44px;
  }

  .login-message p,
  .login-version {
    display: none;
  }

  .login-panel {
    place-items: start center;
    padding: 40px 24px;
  }
}
</style>

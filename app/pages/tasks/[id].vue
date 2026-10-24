<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  FileText,
  LoaderCircle,
  Paperclip,
  Play,
  Sparkles,
  UploadCloud,
} from 'lucide-vue-next'
import { getTheme, THEMES, LAYOUT_DEFINITIONS } from '~~/shared/theme/catalog'
import { clampSlideIndex } from '~~/shared/presentation/navigation'
import type { TaskView } from '~~/shared/domain/task-view'
import type { DeckOutline } from '~~/shared/domain/schemas'

const route = useRoute()
const id = String(route.params.id)
const task = ref<TaskView | null>(null)
const loading = ref(true)
const pending = ref('')
const error = ref('')
const outlineDraft = ref<DeckOutline | null>(null)
const selectedTheme = ref('modern-minimal')
const presentationIndex = ref<number | null>(null)
const uploadInput = ref<HTMLInputElement>()
const toast = useToast()
let eventSource: EventSource | null = null
let reloadTimer: ReturnType<typeof setTimeout> | undefined

const requirements = reactive({
  topic: '',
  audience: '',
  goal: '',
  language: 'zh-CN' as 'zh-CN' | 'en-US',
  pageCount: 10,
  ratio: '16:9' as '16:9' | '4:3',
  tone: '清晰、专业、结论先行',
  constraints: '',
})

const theme = computed(() => getTheme(task.value?.themeId ?? selectedTheme.value) ?? THEMES[0]!)
const activeStep = computed(() => task.value?.currentStep ?? 'requirements')
const statusLabel = computed(() => ({
  draft: '草稿',
  waiting_input: '等待确认',
  queued: '排队中',
  running: '生成中',
  succeeded: '已完成',
  failed: '需要处理',
  canceled: '已取消',
}[task.value?.status ?? 'draft']))
const isWorking = computed(() => ['queued', 'running'].includes(task.value?.status ?? ''))
const finalArtifact = computed(() => task.value?.artifacts.find(artifact => artifact.kind === 'pptx'))
const proofArtifact = computed(() => task.value?.artifacts.find(artifact => artifact.kind === 'proof'))

function stepIcon(state: string) {
  if (state === 'succeeded') return Check
  if (state === 'running' || state === 'waiting_input') return LoaderCircle
  if (state === 'failed') return AlertCircle
  return Circle
}

function initializeFromTask(value: TaskView) {
  selectedTheme.value = value.themeId
  if (value.requirements) {
    Object.assign(requirements, value.requirements)
  }
  else {
    requirements.topic = value.title
    requirements.audience = '业务团队与管理者'
    requirements.goal = value.prompt.slice(0, 180)
    requirements.language = value.language as 'zh-CN' | 'en-US'
    requirements.pageCount = value.pageCount
    requirements.ratio = value.ratio as '16:9' | '4:3'
    requirements.constraints = value.prompt
  }
  if (value.outline) outlineDraft.value = structuredClone(value.outline)
}

async function load() {
  try {
    const data = await $fetch<TaskView>(`/api/tasks/${id}`)
    const firstLoad = !task.value
    task.value = data
    if (firstLoad || !outlineDraft.value) initializeFromTask(data)
    error.value = ''
  }
  catch (cause) {
    const status = (cause as { statusCode?: number }).statusCode
    if (status === 401) await navigateTo('/login')
    else error.value = apiErrorMessage(cause, '无法读取任务')
  }
  finally {
    loading.value = false
  }
}

function scheduleReload() {
  clearTimeout(reloadTimer)
  reloadTimer = setTimeout(() => { void load() }, 240)
}

onMounted(async () => {
  await load()
  if (!task.value) return
  eventSource = new EventSource(`/api/tasks/${id}/events`)
  eventSource.addEventListener('task', scheduleReload)
  eventSource.onerror = () => {
    // Browser retries automatically; polling remains available after reload.
  }
})

onBeforeUnmount(() => {
  eventSource?.close()
  clearTimeout(reloadTimer)
})

async function act(name: string, url: string, body?: Record<string, unknown> | FormData) {
  pending.value = name
  error.value = ''
  try {
    await $fetch(url, {
      method: 'POST',
      body,
    })
    await load()
    return true
  }
  catch (cause) {
    error.value = apiErrorMessage(cause)
    toast.error(error.value)
    return false
  }
  finally {
    pending.value = ''
  }
}

async function confirmRequirements() {
  await act('requirements', `/api/tasks/${id}/requirements`, requirements)
}

async function confirmTheme() {
  await act('theme', `/api/tasks/${id}/theme`, { themeId: selectedTheme.value })
}

async function chooseFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return
  pending.value = 'uploads'
  try {
    for (const file of files) {
      const form = new FormData()
      form.append('file', file)
      await $fetch(`/api/tasks/${id}/assets`, { method: 'POST', body: form })
    }
    toast.success('素材已添加')
    await load()
  }
  catch (cause) {
    error.value = apiErrorMessage(cause, '素材上传失败')
    toast.error(error.value)
  }
  finally {
    pending.value = ''
  }
}

async function skipAssets() {
  const ok = await act('skip', `/api/tasks/${id}/assets/skip`)
  if (ok) toast.info('已选择仅根据需求创作，可以继续生成大纲')
}

async function generateOutline() {
  const ok = await act('outline', `/api/tasks/${id}/outline/generate`)
  if (ok) toast.info('大纲生成任务已提交')
}

async function confirmOutline() {
  if (!outlineDraft.value) return
  const ok = await act('outline-confirm', `/api/tasks/${id}/outline/confirm`, outlineDraft.value)
  if (ok) toast.info('大纲已确认，正在生成两页设计试稿')
}

async function confirmProof() {
  const ok = await act('proof', `/api/tasks/${id}/proof/confirm`)
  if (ok) toast.info('试稿已确认，正在生成整套演示文稿')
}

async function retryCurrent() {
  const ok = await act('retry', `/api/tasks/${id}/retry`)
  if (ok) toast.info('已重新提交当前步骤')
}

function artifactUrl(artifactId: string) {
  return `/api/tasks/${id}/artifacts/${artifactId}`
}

function startPresentation(index = 0) {
  const slideCount = task.value?.outline?.slides.length ?? 0
  if (!slideCount) return
  presentationIndex.value = clampSlideIndex(index, slideCount)
}

function closePresentation() {
  presentationIndex.value = null
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}
</script>

<template>
  <div class="task-page shell">
    <div class="task-topbar">
      <NuxtLink to="/" class="back-link">
        <ArrowLeft :size="15" />
        工作台
      </NuxtLink>
      <div class="task-title-row">
        <div>
          <span class="eyebrow">Presentation workspace</span>
          <h1>{{ task?.title || '正在读取任务…' }}</h1>
        </div>
        <span v-if="task" class="task-status" :class="task.status">
          <span v-if="isWorking" class="spinner" />
          {{ statusLabel }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="loading-state surface-card">
      <span class="spinner" />
      正在打开工作台…
    </div>

    <div v-else-if="error && !task" class="error-state surface-card">
      <AlertCircle :size="24" />
      <h2>无法打开任务</h2>
      <p>{{ error }}</p>
      <NuxtLink to="/" class="button">返回首页</NuxtLink>
    </div>

    <div v-else-if="task" class="workspace-grid">
      <aside class="step-rail" aria-label="任务步骤">
        <div class="rail-heading">制作流程</div>
        <ol>
          <li
            v-for="step in task.steps"
            :key="step.id"
            :class="[step.state, { current: step.id === activeStep }]"
          >
            <span class="step-dot">
              <component :is="stepIcon(step.state)" :size="13" :class="{ spin: step.state === 'running' }" />
            </span>
            <div>
              <strong>{{ step.label }}</strong>
              <span>{{ step.description }}</span>
            </div>
          </li>
        </ol>
        <div class="rail-restart">
          <NuxtLink to="/" class="button button-ghost button-small">
            创建新演示
          </NuxtLink>
        </div>
      </aside>

      <section class="task-stage">
        <div v-if="error" class="error-box stage-error" role="alert">
          {{ error }}
          <NuxtLink v-if="error.includes('模型')" to="/settings/providers" class="inline-link">前往模型设置</NuxtLink>
        </div>

        <article v-if="activeStep === 'requirements'" class="stage-card surface-card">
          <div class="stage-head">
            <div>
              <span class="stage-kicker">01 / Brief</span>
              <h2>先把需求说准确</h2>
              <p>这些答案会约束内容、页数和设计选择。你可以直接修改默认值。</p>
            </div>
            <span class="stage-mark">A</span>
          </div>

          <form class="requirements-form" @submit.prevent="confirmRequirements">
            <label class="span-2">
              <span class="field-label">演示主题</span>
              <input v-model="requirements.topic" class="text-input" maxlength="120" required>
            </label>
            <label>
              <span class="field-label">受众</span>
              <input v-model="requirements.audience" class="text-input" maxlength="120" required>
            </label>
            <label>
              <span class="field-label">表达语气</span>
              <input v-model="requirements.tone" class="text-input" maxlength="80" required>
            </label>
            <label class="span-2">
              <span class="field-label">希望达成什么</span>
              <textarea v-model="requirements.goal" class="textarea-input" rows="3" maxlength="200" required />
            </label>
            <label>
              <span class="field-label">页数</span>
              <select v-model.number="requirements.pageCount" class="select-input">
                <option v-for="count in [6, 8, 10, 12, 15, 20]" :key="count" :value="count">{{ count }} 页</option>
              </select>
            </label>
            <label>
              <span class="field-label">语言与比例</span>
              <div class="inline-fields">
                <select v-model="requirements.language" class="select-input">
                  <option value="zh-CN">中文</option>
                  <option value="en-US">English</option>
                </select>
                <select v-model="requirements.ratio" class="select-input">
                  <option value="16:9">16:9</option>
                  <option value="4:3">4:3</option>
                </select>
              </div>
            </label>
            <label class="span-2">
              <span class="field-label">内容约束 <span class="field-hint">可选</span></span>
              <textarea v-model="requirements.constraints" class="textarea-input" rows="3" maxlength="1000" placeholder="例如：不要虚构数据；必须包含实施路线图；面向非技术受众…" />
            </label>
            <div class="span-2 form-actions">
              <button class="button button-ink" :disabled="pending === 'requirements'">
                <span v-if="pending === 'requirements'" class="spinner" />
                确认需求
                <ArrowRight :size="15" />
              </button>
            </div>
          </form>
        </article>

        <article v-else-if="activeStep === 'theme'" class="stage-card surface-card">
          <div class="stage-head">
            <div>
              <span class="stage-kicker">02 / Direction</span>
              <h2>选择一套视觉语言</h2>
              <p>AI 不从零发明设计。先选主题，内容会进入这套主题的页面模板。</p>
            </div>
            <span class="stage-mark">B</span>
          </div>

          <div class="theme-selector">
            <button
              v-for="item in THEMES"
              :key="item.id"
              type="button"
              class="theme-choice"
              :class="{ selected: selectedTheme === item.id }"
              @click="selectedTheme = item.id"
            >
              <ThemePreview :theme-id="item.id" :variant="item.id === 'editorial-magazine' ? 'content' : item.id === 'tech-utility' ? 'chart' : 'cover'" />
              <span class="theme-choice-copy">
                <strong>{{ item.name }}</strong>
                <small>{{ item.tagline }}</small>
              </span>
              <span v-if="selectedTheme === item.id" class="choice-check"><Check :size="12" /></span>
            </button>
          </div>

          <div class="selection-summary">
            <span class="theme-swatches">
              <i v-for="swatch in [theme.tokens.colors.background, theme.tokens.colors.ink, theme.tokens.colors.accent]" :key="swatch" :style="{ background: swatch }" />
            </span>
            <span>将使用 <strong>{{ theme.name }}</strong>，包含 {{ theme.layoutIds.length }} 种页面模板与字体降级规则。</span>
            <button class="button button-ink" :disabled="pending === 'theme'" @click="confirmTheme">
              <span v-if="pending === 'theme'" class="spinner" />
              使用这套主题
              <ArrowRight :size="15" />
            </button>
          </div>
        </article>

        <article v-else-if="activeStep === 'assets'" class="stage-card surface-card">
          <div class="stage-head">
            <div>
              <span class="stage-kicker">03 / Material</span>
              <h2>有资料，就放进故事里</h2>
              <p>支持 PPTX、PDF、DOCX、表格、文本和图片。没有素材也可以仅根据需求创作。</p>
            </div>
            <span class="stage-mark">C</span>
          </div>

          <input ref="uploadInput" type="file" class="sr-only" multiple accept=".pptx,.pdf,.docx,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp" @change="chooseFiles">
          <button type="button" class="upload-zone" :disabled="pending === 'uploads'" @click="uploadInput?.click()">
            <span class="upload-icon">
              <span v-if="pending === 'uploads'" class="spinner" />
              <UploadCloud v-else :size="22" />
            </span>
            <strong>{{ pending === 'uploads' ? '正在上传…' : '拖入或选择一个素材' }}</strong>
            <span>单文件不超过 50MB。PPTX 将作为内容与版式参考。</span>
          </button>

          <div v-if="task.assets.length" class="asset-list">
            <div v-for="asset in task.assets" :key="asset.id" class="asset-row">
              <FileText :size="16" />
              <div>
                <strong>{{ asset.name }}</strong>
                <span>{{ (asset.sizeBytes / 1024 / 1024).toFixed(1) }} MB · {{ asset.purpose === 'style' ? '风格参考' : '内容素材' }}</span>
              </div>
              <CheckCircle2 :size="15" class="success-icon" />
            </div>
          </div>

          <div class="stage-actions split">
            <button class="button button-ghost" @click="skipAssets">
              没有素材，仅根据需求创作
              <ArrowRight :size="14" />
            </button>
            <button class="button button-ink" :disabled="!task.hasAssets" @click="generateOutline">
              <Sparkles :size="15" />
              生成大纲
            </button>
          </div>
        </article>

        <article v-else-if="activeStep === 'outline'" class="stage-card surface-card">
          <div class="stage-head">
            <div>
              <span class="stage-kicker">04 / Structure</span>
              <h2>{{ task.outline ? '检查故事线' : '正在搭建故事线' }}</h2>
              <p>{{ task.outline ? '逐页检查标题与版式。确认后才会进入试稿。' : '模型会先规划目录、页面角色和每页模板。' }}</p>
            </div>
            <span class="stage-mark">D</span>
          </div>

          <div v-if="isWorking" class="working-panel">
            <div class="working-orbit"><span /><span /><span /></div>
            <strong>正在生成大纲</strong>
            <p>{{ task.events.at(-1)?.message || '正在读取需求与素材，安排每一页的叙事角色。' }}</p>
            <div class="working-log">
              <span v-for="event in task.events.slice(-4)" :key="event.id">
                <Clock3 :size="12" />
                {{ event.message }}
                <small>{{ timeLabel(event.createdAt) }}</small>
              </span>
            </div>
          </div>

          <div v-else-if="task.status === 'failed'" class="failed-panel">
            <AlertCircle :size="22" />
            <div>
              <strong>大纲没有生成成功</strong>
              <p>{{ task.errorMessage }}</p>
              <div class="failed-actions">
                <NuxtLink v-if="task.errorMessage?.includes('模型')" to="/settings/providers" class="button button-small">检查模型设置</NuxtLink>
                <button type="button" class="button button-small" :disabled="pending === 'retry'" @click="retryCurrent">
                  <span v-if="pending === 'retry'" class="spinner" />
                  重试本步骤
                </button>
              </div>
            </div>
          </div>

          <template v-else-if="outlineDraft">
            <div class="outline-summary">
              <div>
                <span class="field-hint">演示标题</span>
                <strong>{{ outlineDraft.title }}</strong>
                <p>{{ outlineDraft.summary }}</p>
              </div>
              <span class="outline-count">{{ outlineDraft.slides.length }} 页</span>
            </div>

            <div class="outline-list">
              <div v-for="(slide, index) in outlineDraft.slides" :key="slide.id" class="outline-row">
                <span class="outline-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <div class="outline-main">
                  <strong>{{ slide.title }}</strong>
                  <span>{{ slide.bullets?.slice(0, 3).join(' · ') || Object.values(slide.content).flat().slice(0, 3).join(' · ') }}</span>
                </div>
                <select v-model="slide.layoutId" class="select-input layout-select" :aria-label="`第 ${index + 1} 页版式`">
                  <option v-for="layout in LAYOUT_DEFINITIONS" :key="layout.id" :value="layout.id">{{ layout.name }}</option>
                </select>
              </div>
            </div>

            <div class="stage-actions">
              <button class="button button-ink" :disabled="pending === 'outline-confirm'" @click="confirmOutline">
                <span v-if="pending === 'outline-confirm'" class="spinner" />
                确认大纲并生成试稿
                <ArrowRight :size="15" />
              </button>
            </div>
          </template>

          <div v-else class="empty-action">
            <p>素材已准备好，下一步让模型根据需求生成逐页大纲。</p>
            <button class="button button-ink" :disabled="pending === 'outline'" @click="generateOutline">
              <span v-if="pending === 'outline'" class="spinner" />
              <Sparkles v-else :size="15" />
              生成大纲
            </button>
          </div>
        </article>

        <article v-else-if="activeStep === 'proof'" class="stage-card surface-card">
          <div class="stage-head">
            <div>
              <span class="stage-kicker">05 / Design proof</span>
              <h2>{{ task.status === 'waiting_input' ? '先看两页，再扩展整套' : '正在生成设计试稿' }}</h2>
              <p>封面与典型内容页会验证主题、字号、留白和内容容量。</p>
            </div>
            <span class="stage-mark">E</span>
          </div>

          <div v-if="isWorking" class="working-panel compact">
            <span class="spinner" />
            <strong>正在渲染试稿</strong>
            <p>{{ task.events.at(-1)?.message }}</p>
          </div>

          <div v-else-if="task.status === 'failed'" class="failed-panel">
            <AlertCircle :size="22" />
            <div>
              <strong>试稿生成失败</strong>
              <p>{{ task.errorMessage }}</p>
              <button type="button" class="button button-small" :disabled="pending === 'retry'" @click="retryCurrent">
                <span v-if="pending === 'retry'" class="spinner" />
                重试试稿
              </button>
            </div>
          </div>

          <template v-else-if="task.outline">
            <div class="proof-grid">
              <SlideCanvas
                v-for="(slide, index) in task.outline.slides.slice(0, 2)"
                :key="slide.id"
                :slide="slide"
                :theme-id="task.themeId"
                :index="index"
                :total="task.outline.slides.length"
              />
            </div>
            <div class="proof-meta">
              <div>
                <strong>{{ theme.name }}</strong>
                <span>试稿仅包含前两页，完整演示仍为 {{ task.outline.slides.length }} 页。</span>
              </div>
              <a v-if="proofArtifact" :href="artifactUrl(proofArtifact.id)" class="button button-small">
                <Download :size="14" />
                下载试稿 PPTX
              </a>
            </div>
            <div class="stage-actions">
              <button class="button button-ink" :disabled="pending === 'proof'" @click="confirmProof">
                <span v-if="pending === 'proof'" class="spinner" />
                <Play v-else :size="14" />
                确认设计，生成整套
              </button>
            </div>
          </template>
        </article>

        <article v-else class="stage-card surface-card delivery-stage">
          <div class="stage-head">
            <div>
              <span class="stage-kicker">06 / Delivery</span>
              <h2>{{ task.status === 'succeeded' ? '演示文稿已经准备好' : '正在生成整套演示' }}</h2>
              <p>{{ task.status === 'succeeded' ? '下载可编辑 PPTX，或继续检查每一页的版式。' : '正在逐页填充内容、生成 PPTX 并执行结构检查。' }}</p>
            </div>
            <span class="stage-mark">F</span>
          </div>

          <div v-if="task.status === 'failed'" class="failed-panel">
            <AlertCircle :size="22" />
            <div>
              <strong>整套生成失败</strong>
              <p>{{ task.errorMessage }}</p>
              <button type="button" class="button button-small" :disabled="pending === 'retry'" @click="retryCurrent">
                <span v-if="pending === 'retry'" class="spinner" />
                重试生成
              </button>
            </div>
          </div>

          <div v-else-if="isWorking" class="working-panel">
            <div class="working-orbit"><span /><span /><span /></div>
            <strong>正在生成完整演示</strong>
            <p>{{ task.events.at(-1)?.message }}</p>
            <div class="progress-track"><span /></div>
          </div>

          <template v-else-if="task.outline">
            <div class="delivery-banner">
              <div>
                <span class="eyebrow">Ready to present</span>
                <strong>{{ task.outline.title }}</strong>
                <span>{{ task.outline.slides.length }} 页 · {{ theme.name }} · {{ task.ratio }}</span>
              </div>
              <div class="delivery-actions">
                <button type="button" class="button" @click="startPresentation(0)">
                  <Play :size="15" />
                  全屏演示
                </button>
                <a v-if="finalArtifact" :href="artifactUrl(finalArtifact.id)" class="button button-ink">
                  <Download :size="16" />
                  下载 PPTX
                </a>
              </div>
            </div>
            <div class="deck-grid">
              <button
                v-for="(slide, index) in task.outline.slides"
                :key="slide.id"
                type="button"
                class="deck-slide"
                :aria-label="`从第 ${index + 1} 页开始全屏演示：${slide.title}`"
                @click="startPresentation(index)"
              >
                <SlideCanvas :slide="slide" :theme-id="task.themeId" :index="index" :total="task.outline.slides.length" />
                <span>{{ String(index + 1).padStart(2, '0') }} · {{ slide.title }}</span>
              </button>
            </div>
          </template>
        </article>

        <div class="event-stream">
          <span class="event-label">任务日志</span>
          <div class="event-items">
            <span v-for="event in task.events.slice(-5)" :key="event.id">
              <i />
              {{ event.message }}
              <small>{{ timeLabel(event.createdAt) }}</small>
            </span>
          </div>
        </div>
      </section>

      <aside class="task-aside">
        <div class="aside-card">
          <span class="aside-label">CURRENT DIRECTION</span>
          <ThemePreview :theme-id="task.themeId" variant="cover" :title="task.outline?.title || task.title" />
          <div class="aside-theme">
            <strong>{{ theme.name }}</strong>
            <span>{{ theme.tagline }}</span>
          </div>
          <dl>
            <div><dt>页数</dt><dd>{{ task.outline?.slides.length || task.pageCount }}</dd></div>
            <div><dt>比例</dt><dd>{{ task.ratio }}</dd></div>
            <div><dt>语言</dt><dd>{{ task.language === 'zh-CN' ? '中文' : 'English' }}</dd></div>
            <div><dt>素材</dt><dd>{{ task.assets.length || (task.assetsSkipped ? '未使用' : '待添加') }}</dd></div>
          </dl>
        </div>
        <div class="aside-note">
          <Sparkles :size="15" />
          <p>所有页面均使用预制主题与语义模板。AI 只选择版式并填充内容，因此整份演示更一致。</p>
        </div>
      </aside>
    </div>

    <PresentationOverlay
      v-if="task?.outline && presentationIndex !== null"
      :slides="task.outline.slides"
      :theme-id="task.themeId"
      :title="task.outline.title"
      :initial-index="presentationIndex"
      :ratio="task.ratio"
      @close="closePresentation"
    />
  </div>
</template>

<style scoped>
.task-page {
  padding-top: 28px;
}

.task-topbar {
  margin-bottom: 24px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-ink-faint);
  font-size: 12px;
  font-weight: 550;
}

.back-link:hover {
  color: var(--color-ink);
}

.task-title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-top: 16px;
}

.task-title-row h1 {
  max-width: 820px;
  margin: 6px 0 0;
  font-size: clamp(24px, 3.2vw, 38px);
  font-weight: 620;
  line-height: 1.15;
  letter-spacing: -0.04em;
}

.task-status {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 11px;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-ink-soft);
  font-size: 11px;
  font-weight: 600;
}

.task-status.running,
.task-status.queued {
  border-color: #d9d1f5;
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
}

.task-status.succeeded {
  border-color: #c4ddcf;
  background: #edf8f1;
  color: var(--color-success);
}

.task-status.failed {
  border-color: #edcbc7;
  background: #fff5f3;
  color: var(--color-danger);
}

.loading-state,
.error-state {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: var(--color-ink-soft);
  font-size: 13px;
}

.error-state {
  flex-direction: column;
  text-align: center;
}

.error-state h2 {
  margin: 0;
  color: var(--color-ink);
}

.error-state p {
  margin: 0;
  max-width: 500px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 218px minmax(0, 1fr) 262px;
  gap: 22px;
  align-items: start;
}

.step-rail {
  position: sticky;
  top: 88px;
  padding: 8px 0;
}

.rail-heading {
  padding: 0 12px 12px;
  color: var(--color-ink-faint);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.step-rail ol {
  list-style: none;
  margin: 0;
  padding: 0;
  border-left: 1px solid var(--color-line);
}

.step-rail li {
  position: relative;
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 9px;
  padding: 9px 0 9px 13px;
  color: var(--color-ink-faint);
}

.step-rail li.current {
  color: var(--color-ink);
}

.step-rail li.current::before {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: -1px;
  width: 2px;
  background: var(--color-ink);
}

.step-dot {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--color-line);
  border-radius: 50%;
  background: var(--color-canvas);
}

.step-rail li.succeeded .step-dot {
  border-color: #bdd8c8;
  background: #eef8f2;
  color: var(--color-success);
}

.step-rail li.running .step-dot {
  border-color: #cfc5fa;
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.step-rail li.failed .step-dot {
  border-color: #ecc5c1;
  background: #fff5f3;
  color: var(--color-danger);
}

.step-rail li.skipped .step-dot {
  border-style: dashed;
}

.spin {
  animation: spin 900ms linear infinite;
}

.step-rail li strong {
  display: block;
  font-size: 12px;
  font-weight: 600;
}

.step-rail li div span {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  line-height: 1.45;
}

.rail-restart {
  margin-top: 16px;
  padding-left: 8px;
}

.task-stage {
  min-width: 0;
}

.stage-error {
  margin-bottom: 12px;
}

.inline-link {
  margin-left: 8px;
  text-decoration: underline;
  font-weight: 650;
}

.stage-card {
  padding: 28px;
}

.stage-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 26px;
}

.stage-kicker {
  color: var(--color-accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.stage-head h2 {
  margin: 7px 0 8px;
  font-size: clamp(23px, 2.8vw, 31px);
  font-weight: 620;
  letter-spacing: -0.045em;
  line-height: 1.12;
}

.stage-head p {
  max-width: 620px;
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 13px;
  line-height: 1.65;
}

.stage-mark {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-line);
  border-radius: 50%;
  color: var(--color-ink-faint);
  font-family: Georgia, serif;
  font-size: 12px;
}

.requirements-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.span-2 {
  grid-column: span 2;
}

.inline-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.form-actions,
.stage-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.stage-actions.split {
  justify-content: space-between;
}

.theme-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.theme-choice {
  position: relative;
  padding: 5px;
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: 13px;
  background: #fbfaf7;
  text-align: left;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.theme-choice:hover {
  transform: translateY(-2px);
  border-color: #c9c2b7;
}

.theme-choice.selected {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgb(91 75 219 / 10%);
}

.theme-choice :deep(.theme-preview) {
  border-radius: 9px;
}

.theme-choice-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 7px 6px;
}

.theme-choice-copy strong {
  font-size: 11px;
  font-weight: 650;
}

.theme-choice-copy small {
  overflow: hidden;
  color: var(--color-ink-faint);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.choice-check {
  position: absolute;
  top: 11px;
  right: 11px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  box-shadow: 0 2px 8px rgb(91 75 219 / 35%);
}

.selection-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--color-line);
}

.selection-summary > span:nth-child(2) {
  flex: 1;
  color: var(--color-ink-soft);
  font-size: 11px;
}

.theme-swatches {
  display: inline-flex;
  overflow: hidden;
  flex: none;
  width: 42px;
  height: 24px;
  border: 1px solid rgb(0 0 0 / 8%);
  border-radius: 6px;
}

.theme-swatches i {
  flex: 1;
}

.upload-zone {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 200px;
  padding: 30px;
  border: 1px dashed #cbc4b8;
  border-radius: 16px;
  background: #fbfaf7;
  color: var(--color-ink-soft);
  text-align: center;
  transition: border-color 160ms ease, background 160ms ease;
}

.upload-zone:hover {
  border-color: var(--color-accent);
  background: #faf8ff;
}

.upload-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin-bottom: 4px;
  border: 1px solid var(--color-line);
  border-radius: 50%;
  background: #fff;
  color: var(--color-accent);
}

.upload-zone strong {
  color: var(--color-ink);
  font-size: 14px;
}

.upload-zone > span:last-child {
  font-size: 11px;
}

.asset-list {
  display: grid;
  gap: 7px;
  margin-top: 14px;
}

.asset-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-line);
  border-radius: 10px;
  background: #fff;
}

.asset-row > svg:first-child {
  color: var(--color-ink-faint);
}

.asset-row div {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.asset-row strong {
  font-size: 11px;
  font-weight: 600;
}

.asset-row span {
  color: var(--color-ink-faint);
  font-size: 9px;
}

.success-icon {
  color: var(--color-success);
}

.stage-actions {
  margin-top: 22px;
}

.working-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 34px 20px;
  border: 1px solid #e5e1f9;
  border-radius: 15px;
  background: #faf9ff;
  text-align: center;
}

.working-panel.compact {
  padding: 24px;
}

.working-panel > strong {
  margin-top: 14px;
  font-size: 15px;
}

.working-panel > p {
  margin: 5px 0 0;
  color: var(--color-ink-soft);
  font-size: 12px;
}

.working-orbit {
  position: relative;
  width: 44px;
  height: 44px;
  border: 1px solid #d9d2fa;
  border-radius: 50%;
  animation: spin 3.5s linear infinite;
}

.working-orbit span {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
}

.working-orbit span:nth-child(1) { top: -3px; left: 18px; }
.working-orbit span:nth-child(2) { right: 1px; bottom: 7px; background: #a99ff1; }
.working-orbit span:nth-child(3) { bottom: 6px; left: 2px; background: #d2cbfa; }

.working-log {
  width: 100%;
  max-width: 560px;
  display: grid;
  gap: 6px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e6e1f5;
  text-align: left;
}

.working-log span {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--color-ink-soft);
  font-size: 10px;
}

.working-log small {
  margin-left: auto;
  color: var(--color-ink-faint);
}

.progress-track {
  width: min(420px, 80%);
  height: 3px;
  margin-top: 20px;
  overflow: hidden;
  border-radius: 99px;
  background: #e3ddfb;
}

.progress-track span {
  display: block;
  width: 38%;
  height: 100%;
  border-radius: inherit;
  background: var(--color-accent);
  animation: progress 1.8s ease-in-out infinite alternate;
}

@keyframes progress {
  from { transform: translateX(-30%); }
  to { transform: translateX(190%); }
}

.failed-panel {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 1px solid #eccbc7;
  border-radius: 12px;
  background: #fff8f6;
  color: var(--color-danger);
}

.failed-panel strong {
  color: #732b27;
  font-size: 13px;
}

.failed-panel p {
  margin: 5px 0 10px;
  color: #8b4540;
  font-size: 11px;
  line-height: 1.6;
}

.failed-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.outline-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 12px;
  padding: 14px;
  border-radius: 12px;
  background: #f8f7f3;
}

.outline-summary div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.outline-summary strong {
  font-size: 16px;
}

.outline-summary p {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 11px;
}

.outline-count {
  flex: none;
  padding: 3px 8px;
  border-radius: 5px;
  background: #fff;
  color: var(--color-ink-soft);
  font-size: 10px;
}

.outline-list {
  border-top: 1px solid var(--color-line);
}

.outline-row {
  display: grid;
  grid-template-columns: 34px 1fr 112px;
  gap: 10px;
  align-items: center;
  padding: 11px 3px;
  border-bottom: 1px solid var(--color-line);
}

.outline-index {
  color: var(--color-ink-faint);
  font-size: 10px;
  font-weight: 700;
}

.outline-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.outline-main strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-main span {
  overflow: hidden;
  color: var(--color-ink-faint);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-select {
  min-height: 32px;
  padding: 5px 8px;
  font-size: 10px;
}

.empty-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 30px;
  text-align: center;
}

.empty-action p {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 12px;
}

.proof-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.proof-grid :deep(.slide-canvas) {
  border: 1px solid var(--color-line);
}

.proof-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f8f7f3;
}

.proof-meta div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.proof-meta strong {
  font-size: 12px;
}

.proof-meta span {
  color: var(--color-ink-soft);
  font-size: 10px;
}

.delivery-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px;
  border-radius: 14px;
  background: linear-gradient(120deg, #f3f0ff, #faf9f6);
  border: 1px solid #e2ddf6;
}

.delivery-banner div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.delivery-actions {
  flex: none;
  flex-direction: row !important;
  align-items: center;
  gap: 8px !important;
}

.delivery-banner strong {
  font-size: 18px;
  letter-spacing: -0.03em;
}

.delivery-banner div > span:last-child {
  color: var(--color-ink-soft);
  font-size: 10px;
}

.deck-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 18px;
}

.deck-slide {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.deck-slide :deep(.slide-canvas) {
  border: 1px solid var(--color-line);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.deck-slide:hover :deep(.slide-canvas) {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgb(25 24 23 / 15%);
}

.deck-slide:focus-visible {
  outline: none;
}

.deck-slide:focus-visible :deep(.slide-canvas) {
  outline: 3px solid color-mix(in srgb, var(--color-accent) 55%, white);
  outline-offset: 3px;
}

.deck-slide > span {
  overflow: hidden;
  color: var(--color-ink-faint);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-stream {
  display: grid;
  gap: 7px;
  margin-top: 20px;
  padding: 14px 3px;
}

.event-label {
  color: var(--color-ink-faint);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.event-items {
  display: grid;
  gap: 4px;
}

.event-items > span {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--color-ink-soft);
  font-size: 10px;
}

.event-items i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #b8b0a4;
}

.event-items small {
  margin-left: auto;
  color: var(--color-ink-faint);
}

.task-aside {
  position: sticky;
  top: 88px;
  display: grid;
  gap: 12px;
}

.aside-card {
  padding: 11px;
  border: 1px solid var(--color-line);
  border-radius: 17px;
  background: rgb(255 255 255 / 65%);
}

.aside-label {
  display: block;
  padding: 2px 2px 9px;
  color: var(--color-ink-faint);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.13em;
}

.aside-theme {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 11px 3px 12px;
}

.aside-theme strong {
  font-size: 13px;
}

.aside-theme span {
  color: var(--color-ink-faint);
  font-size: 10px;
}

.aside-card dl {
  display: grid;
  gap: 0;
  margin: 0;
  border-top: 1px solid var(--color-line);
}

.aside-card dl div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 3px;
  border-bottom: 1px solid var(--color-line);
}

.aside-card dt {
  color: var(--color-ink-faint);
  font-size: 10px;
}

.aside-card dd {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
}

.aside-note {
  display: flex;
  gap: 8px;
  padding: 13px;
  border: 1px solid #e4def6;
  border-radius: 13px;
  background: #faf9ff;
  color: var(--color-accent);
}

.aside-note p {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 10px;
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .workspace-grid {
    grid-template-columns: 190px minmax(0, 1fr);
  }

  .task-aside {
    display: none;
  }
}

@media (max-width: 820px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .step-rail {
    position: static;
    overflow-x: auto;
    padding-bottom: 10px;
  }

  .step-rail ol {
    display: flex;
    gap: 4px;
    border-left: 0;
    border-bottom: 1px solid var(--color-line);
    padding-bottom: 9px;
  }

  .step-rail li {
    flex: none;
    grid-template-columns: 24px auto;
    padding: 4px 9px;
    border: 1px solid var(--color-line);
    border-radius: 999px;
    background: #fff;
  }

  .step-rail li.current::before {
    display: none;
  }

  .step-rail li div span {
    display: none;
  }

  .rail-heading,
  .rail-restart {
    display: none;
  }

  .theme-selector {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .task-page {
    padding-top: 18px;
  }

  .task-title-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .stage-card {
    padding: 18px;
  }

  .stage-head {
    margin-bottom: 20px;
  }

  .stage-mark {
    display: none;
  }

  .requirements-form,
  .theme-selector,
  .proof-grid,
  .deck-grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: auto;
  }

  .selection-summary,
  .delivery-banner,
  .proof-meta {
    align-items: flex-start;
    flex-direction: column;
  }

  .selection-summary .button,
  .delivery-banner .button {
    width: 100%;
  }

  .delivery-actions {
    width: 100%;
    align-items: stretch !important;
    flex-direction: column !important;
  }

  .stage-actions.split {
    align-items: stretch;
    flex-direction: column;
  }

  .outline-row {
    grid-template-columns: 26px 1fr;
  }

  .layout-select {
    grid-column: 2;
  }
}
</style>

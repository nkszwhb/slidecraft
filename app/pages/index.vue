<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  FileText,
  Paperclip,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-vue-next'
import { THEMES } from '~~/shared/theme/catalog'

const prompt = ref('')
const selectedTheme = ref(THEMES[0]!.id)
const files = ref<File[]>([])
const showAdvanced = ref(false)
const pageCount = ref(10)
const language = ref<'zh-CN' | 'en-US'>('zh-CN')
const ratio = ref<'16:9' | '4:3'>('16:9')
const settings = reactive({
  motion: {
    style: 'subtle' as 'none' | 'subtle' | 'dynamic' | 'cinematic',
    transition: 'fade' as 'none' | 'fade' | 'push' | 'wipe',
    elementSequence: 'group' as 'group' | 'sequence',
  },
  contentDensity: 'standard' as 'concise' | 'standard' | 'detailed',
  showPageNumbers: true,
  showFooter: true,
})
const submitting = ref(false)
const error = ref('')
const fileInput = ref<HTMLInputElement>()
const recent = ref<Array<{ id: string; title: string; status: string; themeId: string; updatedAt: string }>>([])
const toast = useToast()

const suggestions = [
  '为一家 AI 初创公司制作 10 页种子轮路演，强调产品差异化和增长证据',
  '把这次季度复盘整理成简洁的管理层汇报，突出三个关键结论',
  '制作一套面向新员工的 AI 工具使用培训，包含流程、示例和练习',
]

const statusLabels: Record<string, string> = {
  draft: '草稿',
  waiting_input: '待确认',
  queued: '排队中',
  running: '生成中',
  succeeded: '已完成',
  failed: '失败',
  canceled: '已取消',
}

onMounted(async () => {
  try {
    const response = await $fetch<{ tasks: typeof recent.value }>('/api/tasks')
    recent.value = response.tasks.slice(0, 4)
  }
  catch {
    // An empty or unconfigured workspace is a valid first-run state.
  }
})

function chooseFile(event: Event) {
  const target = event.target as HTMLInputElement
  addFiles(Array.from(target.files ?? []))
  target.value = ''
}

function addFiles(incoming: File[]) {
  const merged = [...files.value, ...incoming]
  files.value = merged.slice(0, 10)
  if (merged.length > 10) toast.info('首版单个任务最多上传 10 个素材')
}

function removeFile(index: number) {
  files.value = files.value.filter((_, itemIndex) => itemIndex !== index)
}

function useSuggestion(text: string) {
  prompt.value = text
  document.querySelector<HTMLTextAreaElement>('#brief')?.focus()
}

async function submit() {
  if (prompt.value.trim().length < 10) {
    error.value = '请再具体一点描述你需要的演示，至少 10 个字符。'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const response = await $fetch<{ id: string }>('/api/tasks', {
      method: 'POST',
      body: {
        prompt: prompt.value.trim(),
        themeId: selectedTheme.value,
        pageCount: pageCount.value,
        language: language.value,
        ratio: ratio.value,
        settings,
      },
    })

    for (const file of files.value) {
      const form = new FormData()
      form.append('file', file)
      await $fetch(`/api/tasks/${response.id}/assets`, { method: 'POST', body: form })
    }

    await navigateTo(`/tasks/${response.id}`)
  }
  catch (cause) {
    const status = (cause as { statusCode?: number })?.statusCode
    if (status === 401) {
      await navigateTo('/login')
      return
    }
    error.value = apiErrorMessage(cause, '创建任务失败，请检查数据库与模型设置。')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="home">
    <section class="hero shell">
      <div class="hero-copy">
        <span class="eyebrow">AI presentation studio</span>
        <h1>把想法，变成一场<br><em>清晰的演示。</em></h1>
        <p class="hero-sub">先选一个成熟主题，再让 AI 整理内容、匹配版式并生成可编辑 PPTX。不是从零画每一页，而是从好的设计开始。</p>
      </div>

      <div class="composer-wrap">
        <div class="composer surface-card">
          <div class="composer-top">
            <label for="brief" class="sr-only">描述你需要的演示</label>
            <textarea
              id="brief"
              v-model="prompt"
              class="brief-textarea"
              rows="4"
              placeholder="例如：为一家 AI 初创公司制作 10 页种子轮路演，强调产品差异化、市场机会和增长证据…"
              @keydown.meta.enter="submit"
              @keydown.ctrl.enter="submit"
            />
            <div v-if="files.length" class="attachments">
              <span v-for="(file, index) in files" :key="`${file.name}-${index}`" class="attachment">
                <FileText :size="13" />
                <span>{{ file.name }}</span>
                <button type="button" :aria-label="`移除 ${file.name}`" @click="removeFile(index)">
                  <X :size="12" />
                </button>
              </span>
            </div>
          </div>

          <div class="theme-strip" aria-label="选择主题">
            <span class="theme-strip-label">主题</span>
            <div class="theme-options">
              <button
                v-for="theme in THEMES"
                :key="theme.id"
                type="button"
                class="theme-chip"
                :class="{ selected: selectedTheme === theme.id }"
                @click="selectedTheme = theme.id"
              >
                <span class="theme-swatches">
                  <i :style="{ background: theme.tokens.colors.background }" />
                  <i :style="{ background: theme.tokens.colors.ink }" />
                  <i :style="{ background: theme.tokens.colors.accent }" />
                </span>
                {{ theme.name === 'Bold Experimental' ? 'Bold' : theme.name.replace('Editorial ', '') }}
              </button>
            </div>
            <NuxtLink to="/themes" class="theme-all">
              全部主题
              <ArrowUpRight :size="13" />
            </NuxtLink>
          </div>

          <div class="composer-bottom">
            <div class="composer-tools">
              <input ref="fileInput" type="file" multiple class="sr-only" accept=".pptx,.pdf,.docx,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp" @change="chooseFile">
              <button type="button" class="tool-button" @click="fileInput?.click()">
                <Paperclip :size="15" />
                添加素材
              </button>
              <button type="button" class="tool-button" :aria-expanded="showAdvanced" @click="showAdvanced = !showAdvanced">
                <SlidersHorizontal :size="15" />
                页面设置
                <ChevronDown :size="13" :class="{ rotate: showAdvanced }" />
              </button>
            </div>
            <button type="button" class="generate-button" :disabled="submitting" @click="submit">
              <span v-if="submitting" class="spinner" />
              <Sparkles v-else :size="16" />
              {{ submitting ? '正在创建…' : '开始制作' }}
              <ArrowRight v-if="!submitting" :size="15" />
            </button>
          </div>

          <div v-if="showAdvanced" class="advanced-panel">
            <section class="advanced-group">
              <span class="advanced-section-title">页面与内容</span>
              <div class="advanced-fields page-fields">
                <label>
                  <span class="field-label">页数</span>
                  <select v-model="pageCount" class="select-input">
                    <option v-for="count in [6, 8, 10, 12, 15, 20]" :key="count" :value="count">{{ count }} 页</option>
                  </select>
                </label>
                <label>
                  <span class="field-label">语言</span>
                  <select v-model="language" class="select-input">
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                  </select>
                </label>
                <label>
                  <span class="field-label">比例</span>
                  <select v-model="ratio" class="select-input">
                    <option value="16:9">16:9 宽屏</option>
                    <option value="4:3">4:3 经典</option>
                  </select>
                </label>
                <label>
                  <span class="field-label">内容密度</span>
                  <select v-model="settings.contentDensity" class="select-input">
                    <option value="concise">精简</option>
                    <option value="standard">标准</option>
                    <option value="detailed">详细</option>
                  </select>
                </label>
              </div>
            </section>

            <section class="advanced-group">
              <span class="advanced-section-title">动画与切换</span>
              <div class="advanced-fields motion-fields">
                <label>
                  <span class="field-label">动画风格</span>
                  <select v-model="settings.motion.style" class="select-input">
                    <option value="none">无动画</option>
                    <option value="subtle">克制</option>
                    <option value="dynamic">活力</option>
                    <option value="cinematic">电影感</option>
                  </select>
                </label>
                <label>
                  <span class="field-label">页面切换</span>
                  <select v-model="settings.motion.transition" class="select-input">
                    <option value="none">无切换</option>
                    <option value="fade">淡入</option>
                    <option value="push">推入</option>
                    <option value="wipe">擦除</option>
                  </select>
                </label>
                <label>
                  <span class="field-label">元素出场</span>
                  <select v-model="settings.motion.elementSequence" class="select-input">
                    <option value="group">整组出现</option>
                    <option value="sequence">逐项出现</option>
                  </select>
                </label>
              </div>
              <p class="motion-hint">AI 会按页面内容分配标题、正文、要点、图表和图片的入场顺序；进入大纲后仍可逐页调整。</p>
            </section>

            <section class="advanced-group detail-group">
              <span class="advanced-section-title">页面细节</span>
              <div class="advanced-fields detail-fields">
                <label class="advanced-toggle">
                  <input v-model="settings.showPageNumbers" type="checkbox">
                  <span>显示页码</span>
                </label>
                <label class="advanced-toggle">
                  <input v-model="settings.showFooter" type="checkbox">
                  <span>显示页脚品牌</span>
                </label>
              </div>
            </section>
          </div>

          <p v-if="error" class="error-box composer-error" role="alert">{{ error }}</p>
        </div>

        <div class="suggestions">
          <span>试试</span>
          <button v-for="suggestion in suggestions" :key="suggestion" type="button" @click="useSuggestion(suggestion)">
            {{ suggestion }}
          </button>
        </div>
      </div>
    </section>

    <section class="theme-showcase shell">
      <div class="section-head">
        <div>
          <span class="eyebrow">Curated directions</span>
          <h2>不是随机生成风格，<br>而是从六种成熟方向开始。</h2>
        </div>
        <NuxtLink to="/themes" class="text-link">
          浏览完整主题库 <ArrowRight :size="15" />
        </NuxtLink>
      </div>

      <div class="theme-grid">
        <NuxtLink v-for="(theme, index) in THEMES.slice(0, 3)" :key="theme.id" to="/themes" class="theme-card">
          <ThemePreview :theme-id="theme.id" :variant="index === 1 ? 'content' : index === 2 ? 'chart' : 'cover'" />
          <div class="theme-card-meta">
            <div>
              <strong>{{ theme.name }}</strong>
              <span>{{ theme.tagline }}</span>
            </div>
            <span class="badge">{{ theme.tags[0] }}</span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section v-if="recent.length" class="recent-section shell">
      <div class="section-head compact">
        <div>
          <span class="eyebrow">Continue</span>
          <h2>最近的演示</h2>
        </div>
      </div>
      <div class="recent-list">
        <NuxtLink v-for="task in recent" :key="task.id" :to="`/tasks/${task.id}`" class="recent-row">
          <span class="recent-index">{{ THEMES.find(item => item.id === task.themeId)?.name ?? 'SlideCraft' }}</span>
          <strong>{{ task.title }}</strong>
          <span class="recent-status" :class="task.status">{{ statusLabels[task.status] ?? task.status }}</span>
          <ArrowUpRight :size="16" />
        </NuxtLink>
      </div>
    </section>

    <section class="process-section shell">
      <div class="process-intro">
        <span class="eyebrow">A calmer workflow</span>
        <h2>像资深设计师一样，<br>先确认真实内容。</h2>
        <p>需求、主题、素材、大纲和两页试稿都可以先确认。你看到的不是黑盒等待，而是一条可检查的创作路径。</p>
      </div>
      <div class="process-steps">
        <article>
          <span>01</span>
          <h3>需求表单</h3>
          <p>用结构化问题锁定受众、目标和约束，避免一句提示词决定所有设计。</p>
        </article>
        <article>
          <span>02</span>
          <h3>主题与模板</h3>
          <p>从预制主题中选择视觉方向，AI 只负责内容与版式匹配。</p>
        </article>
        <article>
          <span>03</span>
          <h3>试稿后生成</h3>
          <p>先确认封面与典型内容页，再扩展整套，减少最后才发现方向错误。</p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  overflow: clip;
}

.hero {
  padding: 74px 0 40px;
}

.hero-copy {
  text-align: center;
  max-width: 820px;
  margin: 0 auto 38px;
}

h1 {
  margin: 20px 0 20px;
  font-family: var(--font-display);
  font-size: clamp(44px, 6vw, 78px);
  font-weight: 630;
  line-height: 0.98;
  letter-spacing: -0.065em;
}

h1 em {
  color: var(--color-ink-soft);
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 400;
}

.hero-sub {
  max-width: 620px;
  margin: 0 auto;
  color: var(--color-ink-soft);
  font-size: 17px;
  line-height: 1.7;
}

.composer-wrap {
  max-width: 940px;
  margin: 0 auto;
}

.composer {
  padding: 8px;
  border-radius: 26px;
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 1px 0 rgb(255 255 255 / 90%) inset, 0 20px 60px rgb(36 32 27 / 8%);
}

.composer-top {
  position: relative;
}

.brief-textarea {
  width: 100%;
  min-height: 134px;
  padding: 22px 24px 12px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--color-ink);
  font-family: var(--font-sans);
  font-size: 17px;
  line-height: 1.65;
  resize: none;
}

.brief-textarea::placeholder {
  color: #9a948a;
}

.attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 20px 10px;
}

.attachment {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 240px;
  padding: 5px 7px 5px 9px;
  border: 1px solid var(--color-line);
  border-radius: 8px;
  background: #f7f6f2;
  color: var(--color-ink-soft);
  font-size: 11px;
}

.attachment span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment button {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--color-ink-faint);
}

.attachment button:hover {
  background: #e9e6df;
  color: var(--color-ink);
}

.theme-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 12px;
  padding: 10px 10px;
  border: 1px solid #e8e4dd;
  border-radius: 15px;
  background: #faf9f6;
}

.theme-strip-label {
  flex: none;
  padding-left: 6px;
  color: var(--color-ink-faint);
  font-size: 11px;
  font-weight: 600;
}

.theme-options {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.theme-options::-webkit-scrollbar {
  display: none;
}

.theme-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 5px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--color-ink-soft);
  font-size: 11px;
  font-weight: 550;
  white-space: nowrap;
  transition: background 150ms ease, border-color 150ms ease;
}

.theme-chip:hover {
  background: #fff;
}

.theme-chip.selected {
  border-color: #d7d1c7;
  background: #fff;
  color: var(--color-ink);
  box-shadow: 0 1px 3px rgb(25 24 23 / 5%);
}

.theme-swatches {
  display: inline-flex;
  overflow: hidden;
  width: 24px;
  height: 16px;
  border: 1px solid rgb(0 0 0 / 8%);
  border-radius: 4px;
}

.theme-swatches i {
  flex: 1;
}

.theme-all {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--color-ink-soft);
  font-size: 11px;
  font-weight: 600;
}

.theme-all:hover {
  color: var(--color-accent);
}

.composer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 12px 6px;
}

.composer-tools {
  display: flex;
  align-items: center;
  gap: 3px;
}

.tool-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--color-ink-soft);
  font-size: 12px;
  font-weight: 550;
}

.tool-button:hover {
  background: #f2f0eb;
  color: var(--color-ink);
}

.tool-button svg {
  transition: transform 160ms ease;
}

.tool-button svg.rotate {
  transform: rotate(180deg);
}

.generate-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 9px 16px 9px 18px;
  border: 1px solid var(--color-ink);
  border-radius: 12px;
  background: var(--color-ink);
  color: #fff;
  font-size: 13px;
  font-weight: 620;
  box-shadow: 0 5px 14px rgb(25 24 23 / 18%);
  transition: background 160ms ease, transform 160ms ease;
}

.generate-button:hover {
  background: #35322e;
}

.generate-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.advanced-panel {
  display: grid;
  gap: 16px;
  margin: 8px 12px 10px;
  padding: 16px 4px 4px;
  border-top: 1px solid var(--color-line);
}

.advanced-group {
  display: grid;
  gap: 9px;
}

.advanced-section-title {
  color: var(--color-ink-faint);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.advanced-fields {
  display: grid;
  gap: 10px;
}

.page-fields {
  grid-template-columns: repeat(4, 1fr);
}

.motion-fields {
  grid-template-columns: repeat(3, 1fr);
}

.detail-fields {
  grid-template-columns: repeat(2, max-content);
  gap: 18px;
}

.motion-hint {
  margin: 0;
  color: var(--color-ink-faint);
  font-size: 10px;
  line-height: 1.55;
}

.advanced-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--color-ink-soft);
  font-size: 11px;
  cursor: pointer;
}

.advanced-toggle input {
  width: 14px;
  height: 14px;
  accent-color: var(--color-accent);
}

.composer-error {
  margin: 8px 12px 10px;
}

.suggestions {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
  color: var(--color-ink-faint);
  font-size: 11px;
}

.suggestions > span {
  margin-right: 2px;
}

.suggestions button {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 4px 9px;
  border: 1px solid #e4e0d8;
  border-radius: 999px;
  background: rgb(255 255 255 / 40%);
  color: var(--color-ink-soft);
  font-size: 11px;
}

.suggestions button:hover {
  border-color: #d3cdc2;
  background: #fff;
  color: var(--color-ink);
}

.theme-showcase {
  padding-top: 86px;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.section-head h2,
.process-intro h2 {
  margin: 13px 0 0;
  font-size: clamp(27px, 3.4vw, 42px);
  font-weight: 620;
  line-height: 1.12;
  letter-spacing: -0.045em;
}

.section-head.compact {
  margin-bottom: 18px;
}

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding-bottom: 4px;
  border-bottom: 1px solid #bdb6aa;
  font-size: 12px;
  font-weight: 600;
}

.text-link:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.theme-grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr 1fr;
  gap: 14px;
  align-items: start;
}

.theme-card {
  display: block;
  padding: 7px;
  border: 1px solid var(--color-line);
  border-radius: 18px;
  background: rgb(255 255 255 / 62%);
  transition: transform 220ms ease, box-shadow 220ms ease, background 220ms ease;
}

.theme-card:hover {
  transform: translateY(-3px);
  background: #fff;
  box-shadow: var(--shadow-card);
}

.theme-card:nth-child(2) {
  margin-top: 28px;
}

.theme-card:nth-child(3) {
  margin-top: 56px;
}

.theme-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 7px 6px;
}

.theme-card-meta div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.theme-card-meta strong {
  font-size: 13px;
  font-weight: 650;
}

.theme-card-meta div span {
  overflow: hidden;
  color: var(--color-ink-faint);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  flex: none;
  padding: 3px 7px;
  border-radius: 5px;
  background: var(--color-surface-muted);
  color: var(--color-ink-soft);
  font-size: 9px;
  font-weight: 600;
}

.recent-section {
  padding-top: 72px;
}

.recent-list {
  border-top: 1px solid var(--color-line);
}

.recent-row {
  display: grid;
  grid-template-columns: 170px 1fr auto auto;
  align-items: center;
  gap: 16px;
  padding: 15px 4px;
  border-bottom: 1px solid var(--color-line);
}

.recent-row:hover strong {
  color: var(--color-accent);
}

.recent-index {
  overflow: hidden;
  color: var(--color-ink-faint);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.recent-row strong {
  overflow: hidden;
  font-size: 14px;
  font-weight: 550;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 150ms ease;
}

.recent-status {
  padding: 3px 8px;
  border-radius: 999px;
  background: #efede8;
  color: var(--color-ink-soft);
  font-size: 10px;
}

.recent-status.succeeded {
  background: #e8f4ed;
  color: var(--color-success);
}

.recent-status.failed {
  background: #fff0ed;
  color: var(--color-danger);
}

.process-section {
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 80px;
  padding-top: 104px;
}

.process-intro p {
  max-width: 390px;
  color: var(--color-ink-soft);
  font-size: 14px;
  line-height: 1.75;
}

.process-steps {
  display: grid;
  gap: 0;
  border-top: 1px solid var(--color-line);
}

.process-steps article {
  display: grid;
  grid-template-columns: 50px 140px 1fr;
  gap: 20px;
  padding: 22px 0;
  border-bottom: 1px solid var(--color-line);
}

.process-steps article > span {
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.process-steps h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}

.process-steps p {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 13px;
  line-height: 1.65;
}

@media (max-width: 900px) {
  .theme-grid {
    grid-template-columns: 1fr 1fr;
  }

  .theme-card:nth-child(3) {
    display: none;
  }

  .process-section {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}

@media (max-width: 720px) {
  .hero {
    padding: 48px 0 26px;
  }

  h1 {
    font-size: 46px;
  }

  .hero-sub {
    font-size: 15px;
  }

  .theme-strip {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .theme-options {
    order: 3;
    flex-basis: 100%;
  }

  .theme-all {
    margin-left: auto;
  }

  .composer-bottom {
    align-items: stretch;
    flex-direction: column;
  }

  .generate-button {
    justify-content: center;
  }

  .page-fields,
  .motion-fields {
    grid-template-columns: 1fr 1fr;
  }

  .detail-fields {
    grid-template-columns: 1fr;
  }

  .suggestions {
    justify-content: flex-start;
  }

  .suggestions button:nth-of-type(n+2) {
    display: none;
  }

  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .theme-grid {
    grid-template-columns: 1fr;
  }

  .theme-card:nth-child(2) {
    margin-top: 0;
  }

  .recent-row {
    grid-template-columns: 1fr auto auto;
  }

  .recent-index {
    display: none;
  }

  .process-section {
    padding-top: 72px;
  }

  .process-steps article {
    grid-template-columns: 34px 1fr;
  }

  .process-steps p {
    grid-column: 2;
  }
}
</style>

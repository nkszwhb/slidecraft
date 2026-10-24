# SlideCraft

一个自托管的 AI 演示文稿工作台。先选择预制主题，再通过需求确认、素材、大纲、两页设计试稿，最终生成可编辑的 `.pptx`。

## 目前包含

- Nuxt 4 + Vue 3 + TypeScript 前端。
- 6 套预制主题、20 种语义页面模板、4 种演示配方。
- Open Design 式任务工作台和 SSE 实时进度。
- 两页设计试稿确认后生成整套。
- 模型设置支持：
  - OpenAI Chat Completions
  - OpenAI Completions
  - OpenAI Responses
  - Anthropic Messages
- PostgreSQL 持久任务、pg-boss Worker 队列、断线恢复与步骤重试。
- PptxGenJS 确定性渲染，OfficeCLI 可用时执行 PPTX 结构验证。
- API Key AES-256-GCM 加密，配置读取接口不回显密钥。
- 素材上传、PPTX 下载、响应式界面。

## 本地启动

要求 Node.js 24+、pnpm 11+、Docker。

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
```

先启动 PostgreSQL：

```bash
docker compose up -d db
```

然后在两个终端分别运行：

```bash
pnpm dev
pnpm worker
```

打开 `http://localhost:3000`。首次使用先到 `/settings/providers` 配置提供商、API Key、模型 ID，并把一个模型设为默认文本模型。

`ADMIN_PASSWORD` 为空时，单机开发环境不要求登录；生产部署应设置 `ADMIN_EMAIL`、`ADMIN_PASSWORD` 和高强度 `APP_SECRET`。

## Docker Compose

```bash
cp .env.example .env
# 修改 APP_SECRET 与 ADMIN_PASSWORD
docker compose up --build
```

服务：

- `web`：Nuxt 页面与 API，默认 `http://localhost:3000`
- `worker`：生成任务和 OfficeCLI 验证
- `db`：PostgreSQL
- `migrate`：启动前执行数据库迁移

## 生成流程

```text
需求表单
→ 选择主题
→ 上传或跳过素材
→ AI 生成大纲与逐页模板
→ 确认大纲
→ 生成封面 + 典型内容页试稿
→ 确认试稿
→ 生成整套 PPTX
→ 预览与下载
```

任务状态和事件保存在 PostgreSQL。刷新页面或重启 Worker 后仍可继续查看任务。

## 常用命令

```bash
pnpm test          # 领域、协议、PPTX 渲染测试
pnpm typecheck     # Nuxt / Vue 类型检查
pnpm build         # 生产构建
pnpm db:migrate    # 应用数据库结构
pnpm worker        # 启动后台 Worker
pnpm office:check  # 检查 OfficeCLI 安装
```

## 目录

```text
app/                  Nuxt 页面、组件和样式
server/api/            REST / SSE API
server/services/      模型、任务、渲染、OfficeCLI
server/database/      PostgreSQL schema 与迁移
shared/               领域 Schema、主题与协议类型
worker/               pg-boss 后台生成 Worker
tests/                Vitest 测试
```

## 设计边界

- AI 只能选择已注册主题、演示配方、页面模板和槽位内容，不能任意注入坐标、样式或 Shell 命令。
- 上传的 PPTX 作为内容与版式参考，不保证原文件的动画、SmartArt 或全部母版无损保留。
- 未配置视觉模型时仍执行结构与自动检查，但不会宣称完成视觉审查。
- 首版为单工作区，不包含多租户、计费与浏览器拖拽编辑器。

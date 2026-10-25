# SlideCraft

自托管的 AI 演示文稿工作台。先选择成熟主题，再通过需求确认、素材、大纲、两页设计试稿，最终生成可编辑的 `.pptx`。

[English summary](README.en.md) · [架构](docs/architecture.md) · [自托管](docs/self-hosting.md) · [API](docs/api.md) · [能力路线](docs/ppt-capability-roadmap.md)

![License: MIT](https://img.shields.io/badge/license-MIT-blue)
![Status: alpha](https://img.shields.io/badge/status-alpha-orange)
![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen)

![SlideCraft 首页](docs/images/home.png)

## 为什么是 SlideCraft

大多数 AI PPT 工具把模型生成的页面直接渲染成图片或不可维护的 HTML。SlideCraft 的方向不同：

- **先选设计，再填内容**：AI 只能选择已注册主题、演示配方和语义页面模板，不随意发明坐标与样式。
- **交付可编辑 PPTX**：由 PptxGenJS 确定性渲染，OfficeCLI 写入 PowerPoint 原生动画和页面切换。
- **过程可检查**：需求、主题、素材、大纲、两页试稿、整套生成，每一步都能人工确认。
- **自托管**：模型提供商、API Key、任务数据和生成文件都留在自己的环境中。
- **不是黑盒**：任务状态、事件、轮次、失败原因和生成产物保存在 PostgreSQL 与 `DATA_DIR`。

## 功能

- Nuxt 4 + Vue 3 + TypeScript 前端
- 6 套预制主题、20 种语义版式、4 种演示配方
- OpenAI Chat Completions、OpenAI Completions、OpenAI Responses、Anthropic Messages
- 需求确认 → 主题 → 素材 → 大纲 → 两页试稿 → 整套交付
- PostgreSQL 持久任务、pg-boss Worker 队列、SSE 实时进度、失败重试、断线恢复
- 首页动画风格、页面切换、元素出场、内容密度、页码和页脚设置
- AI 按页面语义分配标题、正文、要点、图片、图表动效；大纲阶段逐页调整
- PowerPoint 原生入场动画与切页，可在 PowerPoint 动画窗格中继续编辑
- 全屏 Web 演示：键盘、点击、滑动翻页与元素入场动效
- 素材上传、PPTX 下载、响应式界面
- API Key AES-256-GCM 加密，接口不回显密钥
- 单管理员 Cookie 会话、登录限流、上传文件头校验、健康检查

## 界面

| 首页与动效设置 | 大纲逐页动效 |
| --- | --- |
| ![首页](docs/images/home.png) | ![大纲](docs/images/outline-motion.png) |

| 全屏演示 | 内容页 |
| --- | --- |
| ![全屏](docs/images/fullscreen.png) | ![内容页](docs/images/content-page.png) |

## 快速开始

要求：Node.js 24+、pnpm 11+、Docker。

### Docker Compose（推荐）

```bash
cp .env.example .env
```

编辑 `.env`，至少替换：

```dotenv
POSTGRES_PASSWORD=一个高强度数据库密码
DATABASE_URL=postgres://slidecraft:一个高强度数据库密码@localhost:5432/slidecraft
APP_SECRET=用下面的命令生成的随机值
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=一个至少 12 位的管理员密码
```

生成 `APP_SECRET`：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

启动：

```bash
docker compose up --build
```

打开 `http://localhost:3000`，进入 `/settings/providers` 配置提供商、API Key、模型 ID，并把一个模型设为默认文本模型。

Docker Compose 会设置 `REQUIRE_SECURE_CONFIG=true`，如果仍使用示例密码、默认数据库密码或空管理员密码，Web 会拒绝启动并给出原因。

### 本地开发

```bash
pnpm install
cp .env.example .env
docker compose up -d db
pnpm db:migrate
```

两个终端分别运行：

```bash
pnpm dev
pnpm worker
```

本地开发可以把 `REQUIRE_SECURE_CONFIG=false`，并让 `ADMIN_PASSWORD` 为空以关闭登录。**不要把这种配置暴露到网络。**

## 配置

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | PostgreSQL 连接串；Docker Compose 内部会自动指向 `db` |
| `POSTGRES_PASSWORD` | Docker | 数据库密码；同时用于 `DATABASE_URL` 和 Compose |
| `APP_SECRET` | 生产必填 | 至少 32 字节随机值，用于会话签名和密钥加密 |
| `ADMIN_EMAIL` | 否 | 单管理员登录邮箱，默认 `admin@example.com` |
| `ADMIN_PASSWORD` | 生产必填 | 至少 12 位；为空时关闭认证，仅适合本地开发 |
| `DATA_DIR` | 否 | 素材、产物和生成文件目录，默认 `./.data` |
| `OFFICECLI_BIN` | 否 | OfficeCLI 可执行文件路径，默认使用随包二进制 |
| `REQUIRE_SECURE_CONFIG` | 否 | 设为 `true` 时启动前校验生产密钥 |
| `WEB_PORT` | 否 | Docker Compose 暴露端口，默认 `3000` |

## 架构

```text
浏览器
  │  REST + SSE
  ▼
Nuxt / Nitro Web ─────── PostgreSQL（任务、事件、提供商、模型）
  │                              ▲
  │ 入队                         │ pg-boss
  ▼                              │
Worker ── 模型提供商（文本/视觉） ─┘
  ├── PptxGenJS 确定性渲染
  ├── OfficeCLI 动画写入与结构验证
  └── DATA_DIR（素材、试稿、PPTX）
```

更完整的模块说明、AI 约束和数据模型见 [docs/architecture.md](docs/architecture.md)。

## 安全模型

- 单租户、单管理员，不提供多用户 RBAC 或公开分享链接。
- 会话 Cookie 为 HttpOnly、SameSite=Lax，并由 `APP_SECRET` 签名。
- 提供商 API Key 使用 AES-256-GCM 加密存储。
- 上传文件限制 50MB，并校验文件头与 Office ZIP 内容类型。
- 登录失败有进程内限流；多实例部署需要外部限流。
- 生产部署必须使用 HTTPS、随机 `APP_SECRET` 和高强度管理员密码。
- AI 提供商可能收到你的提示词与素材文本；请先阅读其隐私政策。

安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。

## 已知边界

- **单租户**：没有用户、团队、RBAC、计费或配额系统。
- **网页预览是语义化预览**：版式、字体比例和动画尽量对齐 PPTX，但不是 PowerPoint 的逐像素渲染。
- **本地文件存储**：默认使用 `DATA_DIR`，尚未内置 S3/对象存储。
- **PowerPoint 兼容性**：生成文件在 Microsoft PowerPoint 16 上验证；WPS、LibreOffice 和旧版 Office 需要额外验证。
- **动效依赖 OfficeCLI**：OfficeCLI 不可用时仍生成可打开的 PPTX，但不写原生动画。
- **单个默认模型**：文本与视觉各有一个默认模型，不做按任务路由或成本优化。
- **PPTX 素材参考**：上传的 PPTX 作为内容与版式参考，不保证保留原文件全部母版、SmartArt 和动画。

## 测试

```bash
pnpm test          # 领域、协议、PPTX 渲染、动画与安全单测
pnpm typecheck     # Nuxt / Vue 类型检查
pnpm build         # 生产构建
pnpm db:migrate    # 应用版本化数据库迁移
pnpm tasks:prune --days=30  # 试运行旧任务清理
pnpm office:check  # 检查 OfficeCLI 安装
```

需要真实 PowerPoint 的验收步骤见 [docs/manual-qa.md](docs/manual-qa.md)。

## 参与贡献

欢迎 Issue 和 PR：

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md)
- [CHANGELOG.md](CHANGELOG.md)

适合第一次贡献的方向：新增语义版式、改进主题对比度、补充 provider preset、增加 PPTX 边界测试、完善文档或翻译。

## 许可证

MIT。第三方依赖与二进制声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

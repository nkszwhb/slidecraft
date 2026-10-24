import type {
  DeckRecipe,
  LayoutDefinition,
  LayoutRole,
  LayoutSlot,
  SlotKind,
  ThemeDefinition,
} from './types'

const slot = (
  key: string,
  label: string,
  kind: SlotKind,
  options: Partial<LayoutSlot> = {},
): LayoutSlot => ({ key, label, kind, ...options })

const layout = (
  id: string,
  name: string,
  role: LayoutRole,
  description: string,
  slots: LayoutSlot[],
  extra: Partial<LayoutDefinition> = {},
): LayoutDefinition => ({ id, name, role, description, slots, ...extra })

export const LAYOUT_DEFINITIONS: LayoutDefinition[] = [
  layout('cover', '封面', 'cover', '标题、副标题与演示者信息', [
    slot('eyebrow', '眉题', 'text', { maxChars: 32 }),
    slot('title', '主标题', 'text', { required: true, maxChars: 42 }),
    slot('subtitle', '副标题', 'text', { maxChars: 80 }),
    slot('meta', '署名/日期', 'text', { maxChars: 40 }),
  ]),
  layout('agenda', '目录', 'structure', '3–6 个章节导览', [
    slot('title', '标题', 'text', { required: true, maxChars: 28 }),
    slot('items', '章节', 'bullets', { required: true }),
  ], { maxBullets: 6 }),
  layout('section', '章节页', 'structure', '章节序号与核心命题', [
    slot('number', '序号', 'text', { maxChars: 4 }),
    slot('title', '章节标题', 'text', { required: true, maxChars: 30 }),
    slot('subtitle', '说明', 'text', { maxChars: 56 }),
  ]),
  layout('statement', '核心陈述', 'content', '一句主张与简短解释', [
    slot('title', '主张', 'text', { required: true, maxChars: 60 }),
    slot('body', '解释', 'text', { maxChars: 180 }),
  ]),
  layout('split-image', '左文右图', 'content', '观点与配图并排', [
    slot('title', '标题', 'text', { required: true, maxChars: 34 }),
    slot('body', '正文', 'text', { maxChars: 220 }),
    slot('image', '图片', 'image', { required: true }),
  ]),
  layout('image-top', '上文下图', 'content', '宽幅视觉与结论', [
    slot('title', '标题', 'text', { required: true, maxChars: 32 }),
    slot('image', '图片', 'image', { required: true }),
    slot('caption', '图注', 'text', { maxChars: 90 }),
  ], { imageRequired: true }),
  layout('full-image', '全图背景', 'content', '视觉主导的叙事页', [
    slot('title', '标题', 'text', { required: true, maxChars: 34 }),
    slot('subtitle', '说明', 'text', { maxChars: 100 }),
    slot('image', '背景图', 'image', { required: true }),
  ], { imageRequired: true }),
  layout('two-column', '双栏', 'content', '两个并列观点或阶段', [
    slot('title', '标题', 'text', { required: true, maxChars: 32 }),
    slot('leftTitle', '左栏标题', 'text', { maxChars: 20 }),
    slot('leftBody', '左栏正文', 'text', { maxChars: 160 }),
    slot('rightTitle', '右栏标题', 'text', { maxChars: 20 }),
    slot('rightBody', '右栏正文', 'text', { maxChars: 160 }),
  ]),
  layout('three-cards', '三卡片', 'content', '三个能力、支柱或结论', [
    slot('title', '标题', 'text', { required: true, maxChars: 32 }),
    slot('cards', '卡片', 'bullets', { required: true }),
  ], { maxBullets: 3 }),
  layout('four-points', '四要点', 'content', '紧凑的信息网格', [
    slot('title', '标题', 'text', { required: true, maxChars: 30 }),
    slot('items', '要点', 'bullets', { required: true }),
  ], { maxBullets: 4 }),
  layout('comparison', '对比', 'content', '两种方案或前后状态', [
    slot('title', '标题', 'text', { required: true, maxChars: 32 }),
    slot('leftLabel', '左侧标签', 'text', { maxChars: 18 }),
    slot('leftItems', '左侧要点', 'bullets'),
    slot('rightLabel', '右侧标签', 'text', { maxChars: 18 }),
    slot('rightItems', '右侧要点', 'bullets'),
  ], { maxBullets: 4 }),
  layout('process', '流程', 'content', '3–5 步连续流程', [
    slot('title', '标题', 'text', { required: true, maxChars: 32 }),
    slot('steps', '步骤', 'bullets', { required: true }),
  ], { maxBullets: 5 }),
  layout('timeline', '时间线', 'content', '里程碑与时间顺序', [
    slot('title', '标题', 'text', { required: true, maxChars: 32 }),
    slot('milestones', '里程碑', 'bullets', { required: true }),
  ], { maxBullets: 5 }),
  layout('metric', '大数字', 'data', '单一关键指标', [
    slot('metric', '指标', 'text', { required: true, maxChars: 12 }),
    slot('label', '说明', 'text', { required: true, maxChars: 50 }),
    slot('context', '背景', 'text', { maxChars: 140 }),
  ]),
  layout('chart', '图表', 'data', '柱状图、折线图或饼图', [
    slot('title', '标题', 'text', { required: true, maxChars: 34 }),
    slot('chart', '图表数据', 'chart', { required: true }),
    slot('insight', '结论', 'text', { maxChars: 110 }),
  ], { chartTypes: ['bar', 'line', 'pie'] }),
  layout('table', '表格', 'data', '结构化对比与数据清单', [
    slot('title', '标题', 'text', { required: true, maxChars: 32 }),
    slot('table', '表格数据', 'table', { required: true }),
  ]),
  layout('quote', '引用', 'content', '关键引言或客户证言', [
    slot('quote', '引文', 'quote', { required: true, maxChars: 160 }),
    slot('source', '来源', 'text', { maxChars: 50 }),
  ]),
  layout('team', '团队', 'content', '核心成员与分工', [
    slot('title', '标题', 'text', { required: true, maxChars: 30 }),
    slot('members', '成员', 'bullets', { required: true }),
  ], { maxBullets: 4 }),
  layout('summary', '总结', 'closing', '3 个关键结论与行动项', [
    slot('title', '标题', 'text', { required: true, maxChars: 30 }),
    slot('takeaways', '结论', 'bullets', { required: true }),
  ], { maxBullets: 4 }),
  layout('closing', '结束页', 'closing', '感谢与联系方式', [
    slot('title', '标题', 'text', { required: true, maxChars: 40 }),
    slot('subtitle', '联系信息', 'text', { maxChars: 90 }),
  ]),
]

export const DECK_RECIPES: DeckRecipe[] = [
  {
    id: 'business-report',
    name: '商务汇报',
    description: '结论先行，适合经营分析、季度复盘与项目汇报。',
    roles: ['cover', 'agenda', 'statement', 'metric', 'chart', 'three-cards', 'timeline', 'summary'],
    pageRange: [8, 14],
  },
  {
    id: 'product-launch',
    name: '产品发布',
    description: '从背景、痛点到能力、证明和下一步。',
    roles: ['cover', 'statement', 'comparison', 'split-image', 'process', 'metric', 'quote', 'closing'],
    pageRange: [8, 12],
  },
  {
    id: 'pitch-deck',
    name: '融资路演',
    description: '面向投资人的问题、方案、市场与团队叙事。',
    roles: ['cover', 'statement', 'metric', 'chart', 'three-cards', 'timeline', 'team', 'closing'],
    pageRange: [10, 14],
  },
  {
    id: 'training',
    name: '培训课程',
    description: '结构化讲解、示例、练习与总结。',
    roles: ['cover', 'agenda', 'section', 'statement', 'split-image', 'process', 'summary', 'closing'],
    pageRange: [10, 20],
  },
]

const allLayoutIds = LAYOUT_DEFINITIONS.map(item => item.id)

export const THEMES: ThemeDefinition[] = [
  {
    id: 'modern-minimal',
    version: '1.0.0',
    name: 'Modern Minimal',
    tagline: '克制、清晰、让内容站到前面',
    description: '暖白画布、深色文字与单一紫罗兰强调色，适合通用汇报和产品介绍。',
    tags: ['通用', '产品', '简洁'],
    recommendedFor: ['产品介绍', '项目复盘', '团队分享'],
    tokens: {
      colors: {
        background: '#f8f7f3',
        surface: '#ffffff',
        ink: '#1c1b19',
        muted: '#777169',
        accent: '#5b4bdb',
        secondary: '#c9c2ff',
        chart: ['#5b4bdb', '#9b8ff2', '#c0b8f8', '#2c2a3d'],
      },
      displayFont: 'Inter Variable',
      bodyFont: 'Inter Variable',
      headingWeight: 650,
      titleSize: 32,
      bodySize: 17,
      radius: 12,
      lineHeight: 1.5,
    },
    layoutIds: allLayoutIds,
    decoration: 'minimal',
  },
  {
    id: 'editorial-magazine',
    version: '1.0.0',
    name: 'Editorial Magazine',
    tagline: '像一本认真编排的杂志',
    description: '衬线标题、纸张质感和大胆留白，适合品牌故事与创意提案。',
    tags: ['杂志', '品牌', '创意'],
    recommendedFor: ['品牌提案', '内容营销', '创意复盘'],
    tokens: {
      colors: {
        background: '#f2eee6',
        surface: '#fbf8f2',
        ink: '#241f1a',
        muted: '#776b5d',
        accent: '#b54327',
        secondary: '#e7cbb8',
        chart: ['#b54327', '#d88362', '#e9b892', '#3f5147'],
      },
      displayFont: 'Georgia',
      bodyFont: 'Inter Variable',
      headingWeight: 500,
      titleSize: 36,
      bodySize: 16,
      radius: 2,
      lineHeight: 1.55,
    },
    layoutIds: allLayoutIds,
    decoration: 'editorial',
  },
  {
    id: 'tech-utility',
    version: '1.0.0',
    name: 'Tech Utility',
    tagline: '为技术内容而生的清晰网格',
    description: '深色框架、等宽标签与电光青强调色，适合技术分享和 AI 主题。',
    tags: ['科技', 'AI', '开发者'],
    recommendedFor: ['技术分享', '架构评审', 'AI 产品'],
    tokens: {
      colors: {
        background: '#0f1518',
        surface: '#172126',
        ink: '#edf5f3',
        muted: '#92a7a5',
        accent: '#43d7c3',
        secondary: '#1f5f5b',
        chart: ['#43d7c3', '#68a7ff', '#d7ef6f', '#f19683'],
      },
      displayFont: 'Inter Variable',
      bodyFont: 'Inter Variable',
      headingWeight: 650,
      titleSize: 32,
      bodySize: 16,
      radius: 6,
      lineHeight: 1.5,
    },
    layoutIds: allLayoutIds,
    decoration: 'grid',
  },
  {
    id: 'executive-business',
    version: '1.0.0',
    name: 'Executive Business',
    tagline: '稳重、有结论、适合决策',
    description: '象牙白、海军蓝与克制的金色点睛，适合经营汇报和管理层材料。',
    tags: ['商务', '金融', '高管'],
    recommendedFor: ['季度汇报', '董事会', '商业计划'],
    tokens: {
      colors: {
        background: '#f6f5f1',
        surface: '#ffffff',
        ink: '#17202b',
        muted: '#66717d',
        accent: '#173b63',
        secondary: '#b08a48',
        chart: ['#173b63', '#416c99', '#b08a48', '#8d9aa8'],
      },
      displayFont: 'Georgia',
      bodyFont: 'Inter Variable',
      headingWeight: 600,
      titleSize: 32,
      bodySize: 16,
      radius: 4,
      lineHeight: 1.5,
    },
    layoutIds: allLayoutIds,
    decoration: 'executive',
  },
  {
    id: 'warm-soft',
    version: '1.0.0',
    name: 'Warm Soft',
    tagline: '温和、亲近、适合学习与分享',
    description: '奶油底色、柔软圆角和珊瑚色，适合培训、教育与生活方式内容。',
    tags: ['教育', '生活方式', '温暖'],
    recommendedFor: ['培训课程', '知识分享', '品牌故事'],
    tokens: {
      colors: {
        background: '#fbf3ea',
        surface: '#fffaf4',
        ink: '#342822',
        muted: '#8c7467',
        accent: '#da7357',
        secondary: '#f0c9aa',
        chart: ['#da7357', '#e8a489', '#8eab85', '#7b6357'],
      },
      displayFont: 'Inter Variable',
      bodyFont: 'Inter Variable',
      headingWeight: 650,
      titleSize: 34,
      bodySize: 17,
      radius: 22,
      lineHeight: 1.6,
    },
    layoutIds: allLayoutIds,
    decoration: 'organic',
  },
  {
    id: 'bold-experimental',
    version: '1.0.0',
    name: 'Bold Experimental',
    tagline: '高对比、敢留白、适合舞台',
    description: '黑白高对比、荧光黄强调色与粗体大标题，适合发布会和视觉提案。',
    tags: ['发布', '活动', '大胆'],
    recommendedFor: ['产品发布', '活动开场', '视觉提案'],
    tokens: {
      colors: {
        background: '#111111',
        surface: '#1c1c1c',
        ink: '#f4f4ef',
        muted: '#a7a79e',
        accent: '#e7ff45',
        secondary: '#5c5c54',
        chart: ['#e7ff45', '#f4f4ef', '#8e9a45', '#71716a'],
      },
      displayFont: 'Inter Variable',
      bodyFont: 'Inter Variable',
      headingWeight: 800,
      titleSize: 40,
      bodySize: 17,
      radius: 0,
      lineHeight: 1.45,
    },
    layoutIds: allLayoutIds,
    decoration: 'bold',
  },
]

export function getTheme(id: string): ThemeDefinition | undefined {
  return THEMES.find(theme => theme.id === id)
}

export function getLayout(id: string): LayoutDefinition | undefined {
  return LAYOUT_DEFINITIONS.find(layoutDefinition => layoutDefinition.id === id)
}

export function validateThemeCatalog(themes: ThemeDefinition[]): void {
  const knownLayouts = new Set(allLayoutIds)
  const ids = new Set<string>()

  for (const theme of themes) {
    if (ids.has(theme.id)) throw new Error(`Duplicate theme id: ${theme.id}`)
    ids.add(theme.id)

    for (const layoutId of theme.layoutIds) {
      if (!knownLayouts.has(layoutId)) {
        throw new Error(`Theme ${theme.id} references unknown layout ${layoutId}`)
      }
    }

    const { colors } = theme.tokens
    for (const [name, value] of Object.entries(colors)) {
      if (name === 'chart') continue
      if (!/^#[0-9a-f]{6}$/i.test(value)) {
        throw new Error(`Theme ${theme.id} has invalid ${name} color`)
      }
    }
  }
}

validateThemeCatalog(THEMES)

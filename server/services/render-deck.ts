import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import PptxGenJS from 'pptxgenjs'
import type { DeckOutline, SlideSpec } from '../../shared/domain/schemas'
import type { ThemeDefinition } from '../../shared/theme/types'

type Pptx = InstanceType<typeof PptxGenJS>
type Slide = ReturnType<Pptx['addSlide']>
type SlideObject = Pptx['ShapeType'][keyof Pptx['ShapeType']]

export interface RenderDeckInput {
  outline: DeckOutline
  theme: ThemeDefinition
  outputPath: string
  slideLimit?: number
  assetImages?: Array<{ path: string }>
}

function color(value: string): string {
  return value.replace('#', '').toUpperCase()
}

function valueOf(slide: SlideSpec, key: string): string {
  const raw = slide.content[key]
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.join(' · ') : ''
}

function bulletsOf(slide: SlideSpec): string[] {
  if (slide.bullets?.length) return slide.bullets
  const raw = slide.content.items ?? slide.content.cards ?? slide.content.steps
    ?? slide.content.milestones ?? slide.content.members ?? slide.content.takeaways
  return Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []
}

export async function renderDeck(input: RenderDeckInput): Promise<void> {
  const { outline, theme, assetImages = [] } = input
  const tokens = theme.tokens
  const bg = color(tokens.colors.background)
  const surface = color(tokens.colors.surface)
  const ink = color(tokens.colors.ink)
  const muted = color(tokens.colors.muted)
  const accent = color(tokens.colors.accent)
  const secondary = color(tokens.colors.secondary)

  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'SlideCraft'
  pptx.company = 'SlideCraft'
  pptx.subject = outline.title
  pptx.title = outline.title
  pptx.lang = outline.slides.some(slide => /[\u4e00-\u9fff]/.test(slide.title)) ? 'zh-CN' : 'en-US'
  pptx.theme = {
    headFontFace: tokens.displayFont,
    bodyFontFace: tokens.bodyFont,
    lang: pptx.lang,
  }

  const slides = outline.slides.slice(0, input.slideLimit ?? outline.slides.length)

  slides.forEach((slideSpec, index) => {
    const slide = pptx.addSlide()
    slide.background = { color: bg }
    decorateBackground(pptx, slide, theme, index)
    renderSlide(pptx, slide, slideSpec, theme, index, slides.length, assetImages)
    addFooter(slide, theme, index, slides.length)
  })

  await mkdir(dirname(input.outputPath), { recursive: true })
  await pptx.writeFile({ fileName: input.outputPath })

  // Keep these captured tokens referenced so all theme palettes are applied in decorations.
  void surface
  void ink
  void muted
  void accent
  void secondary
}

function decorateBackground(pptx: Pptx, slide: Slide, theme: ThemeDefinition, index: number): void {
  const accent = color(theme.tokens.colors.accent)
  const ink = color(theme.tokens.colors.ink)
  const secondary = color(theme.tokens.colors.secondary)

  if (theme.decoration === 'editorial') {
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: accent }, line: { color: accent } })
    slide.addText(String(index + 1).padStart(2, '0'), {
      x: 12.2, y: 0.18, w: 0.7, h: 0.35, fontSize: 10, color: accent, align: 'right',
    })
  }
  else if (theme.decoration === 'grid') {
    for (let x = 1; x < 13; x += 1.2) {
      slide.addShape(pptx.ShapeType.line, {
        x, y: 0, w: 0, h: 7.5, line: { color: secondary, transparency: 78, width: 0.5 },
      })
    }
  }
  else if (theme.decoration === 'executive') {
    slide.addShape(pptx.ShapeType.line, {
      x: 0.65, y: 7.05, w: 12, h: 0, line: { color: secondary, width: 1 },
    })
  }
  else if (theme.decoration === 'organic') {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 11.2, y: -1.4, w: 3.1, h: 3.1, fill: { color: secondary, transparency: 55 }, line: { color: secondary, transparency: 100 },
    })
  }
  else if (theme.decoration === 'bold') {
    slide.addShape(pptx.ShapeType.rect, {
      x: 12.65, y: 0, w: 0.68, h: 0.68, fill: { color: accent }, line: { color: accent },
    })
  }
  else {
    slide.addShape(pptx.ShapeType.line, {
      x: 0.65, y: 7.04, w: 12.03, h: 0, line: { color: ink, transparency: 88, width: 0.7 },
    })
  }
}

function addFooter(slide: Slide, theme: ThemeDefinition, index: number, total: number): void {
  slide.addText('SLIDECRAFT', {
    x: 0.66, y: 7.12, w: 2.2, h: 0.2, fontFace: theme.tokens.bodyFont,
    fontSize: 7, color: color(theme.tokens.colors.muted), charSpacing: 1.5,
  })
  slide.addText(`${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, {
    x: 11.4, y: 7.1, w: 1.3, h: 0.22, fontFace: theme.tokens.bodyFont,
    fontSize: 8, color: color(theme.tokens.colors.muted), align: 'right',
  })
}

function renderSlide(
  pptx: Pptx,
  slide: Slide,
  spec: SlideSpec,
  theme: ThemeDefinition,
  index: number,
  total: number,
  images: Array<{ path: string }>,
): void {
  const c = theme.tokens.colors
  const baseText = { fontFace: theme.tokens.bodyFont, color: color(c.ink), valign: 'top' as const }
  const title = spec.title
  const image = images[index % Math.max(images.length, 1)]?.path

  const titleBox = (y = 0.75, size = theme.tokens.titleSize) => slide.addText(title, {
    ...baseText, x: 0.66, y, w: 11.9, h: 0.8, fontFace: theme.tokens.displayFont,
    fontSize: size, bold: theme.tokens.headingWeight >= 600, margin: 0,
  })

  const eyebrow = (text: string) => slide.addText(text.toUpperCase(), {
    x: 0.68, y: 0.36, w: 8, h: 0.3, fontFace: theme.tokens.bodyFont,
    fontSize: 10, color: color(c.accent), bold: true, charSpacing: 1.2, margin: 0,
  })

  switch (spec.layoutId) {
    case 'cover': {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.66, y: 1.2, w: 0.09, h: 4.7, fill: { color: color(c.accent) }, line: { color: color(c.accent) },
      })
      eyebrow(valueOf(spec, 'eyebrow') || 'PRESENTATION')
      slide.addText(title, {
        ...baseText, x: 1.02, y: 1.5, w: 10.7, h: 2.2,
        fontFace: theme.tokens.displayFont, fontSize: 42, bold: true, valign: 'mid', margin: 0,
      })
      slide.addText(valueOf(spec, 'subtitle') || valueOf(spec, 'body'), {
        ...baseText, x: 1.04, y: 3.85, w: 8.8, h: 0.8, fontSize: 19, color: color(c.muted), margin: 0,
      })
      slide.addText(valueOf(spec, 'meta'), {
        ...baseText, x: 1.04, y: 5.8, w: 7, h: 0.4, fontSize: 11, color: color(c.muted),
        charSpacing: 0.8, margin: 0,
      })
      break
    }
    case 'section': {
      const number = valueOf(spec, 'number') || String(index + 1).padStart(2, '0')
      slide.addText(number, {
        ...baseText, x: 0.66, y: 0.75, w: 2.5, h: 1.3, fontSize: 70,
        fontFace: theme.tokens.displayFont, color: color(c.accent), bold: true, margin: 0,
      })
      slide.addText(title, {
        ...baseText, x: 0.68, y: 2.65, w: 11.2, h: 1.5, fontSize: 34,
        fontFace: theme.tokens.displayFont, bold: true, margin: 0,
      })
      slide.addText(valueOf(spec, 'subtitle'), {
        ...baseText, x: 0.7, y: 4.4, w: 9.3, h: 0.8, fontSize: 17, color: color(c.muted), margin: 0,
      })
      break
    }
    case 'agenda': {
      titleBox()
      const items = bulletsOf(spec)
      items.slice(0, 6).forEach((item, itemIndex) => {
        const y = 1.95 + itemIndex * 0.7
        slide.addText(String(itemIndex + 1).padStart(2, '0'), {
          x: 0.68, y, w: 0.7, h: 0.4, fontSize: 13, color: color(c.accent), bold: true, margin: 0,
        })
        slide.addText(item, {
          ...baseText, x: 1.45, y, w: 10.4, h: 0.45, fontSize: 18, margin: 0,
        })
        slide.addShape(pptx.ShapeType.line, {
          x: 1.45, y: y + 0.48, w: 10.7, h: 0, line: { color: color(c.muted), transparency: 80, width: 0.7 },
        })
      })
      break
    }
    case 'statement': {
      eyebrow('KEY MESSAGE')
      slide.addText(title, {
        ...baseText, x: 1.0, y: 1.8, w: 11.2, h: 2.1,
        fontFace: theme.tokens.displayFont, fontSize: 35, bold: true, valign: 'mid', margin: 0,
      })
      slide.addText(valueOf(spec, 'body'), {
        ...baseText, x: 1.02, y: 4.2, w: 9.8, h: 1.2, fontSize: 18, color: color(c.muted), margin: 0,
      })
      break
    }
    case 'two-column': {
      titleBox()
      const columns = [
        { x: 0.66, heading: valueOf(spec, 'leftTitle'), body: valueOf(spec, 'leftBody') },
        { x: 6.72, heading: valueOf(spec, 'rightTitle'), body: valueOf(spec, 'rightBody') },
      ]
      columns.forEach(column => {
        slide.addShape(pptx.ShapeType.rect, {
          x: column.x, y: 1.9, w: 5.8, h: 4.2, fill: { color: color(c.surface) },
          line: { color: color(c.muted), transparency: 75, width: 0.7 },
        })
        slide.addText(column.heading, {
          ...baseText, x: column.x + 0.35, y: 2.25, w: 5.1, h: 0.6,
          fontSize: 20, bold: true, margin: 0,
        })
        slide.addText(column.body, {
          ...baseText, x: column.x + 0.35, y: 3.05, w: 5.05, h: 2.6,
          fontSize: 15, color: color(c.muted), margin: 0,
        })
      })
      break
    }
    case 'three-cards':
    case 'team': {
      titleBox()
      const items = bulletsOf(spec).slice(0, 3)
      items.forEach((item, itemIndex) => {
        const x = 0.66 + itemIndex * 4.08
        slide.addShape(pptx.ShapeType.rect, {
          x, y: 2.0, w: 3.78, h: 3.9, fill: { color: color(c.surface) },
          line: { color: color(c.muted), transparency: 78, width: 0.7 },
        })
        slide.addText(String(itemIndex + 1).padStart(2, '0'), {
          x: x + 0.3, y: 2.28, w: 0.7, h: 0.45, fontSize: 14, color: color(c.accent), bold: true, margin: 0,
        })
        slide.addText(item, {
          ...baseText, x: x + 0.3, y: 2.95, w: 3.1, h: 2.1, fontSize: 17, bold: true, margin: 0,
        })
      })
      break
    }
    case 'four-points': {
      titleBox()
      bulletsOf(spec).slice(0, 4).forEach((item, itemIndex) => {
        const x = 0.66 + (itemIndex % 2) * 6.08
        const y = 2.0 + Math.floor(itemIndex / 2) * 2.15
        slide.addText(String(itemIndex + 1).padStart(2, '0'), {
          x, y, w: 0.6, h: 0.35, fontSize: 13, color: color(c.accent), bold: true, margin: 0,
        })
        slide.addText(item, { ...baseText, x: x + 0.65, y, w: 4.95, h: 1.3, fontSize: 18, margin: 0 })
      })
      break
    }
    case 'comparison': {
      titleBox()
      const groups = [
        { x: 0.66, label: valueOf(spec, 'leftLabel'), items: Array.isArray(spec.content.leftItems) ? spec.content.leftItems : [] },
        { x: 6.72, label: valueOf(spec, 'rightLabel'), items: Array.isArray(spec.content.rightItems) ? spec.content.rightItems : [] },
      ]
      groups.forEach((group, groupIndex) => {
        slide.addShape(pptx.ShapeType.rect, {
          x: group.x, y: 1.85, w: 5.8, h: 4.35,
          fill: { color: groupIndex === 1 ? color(c.accent) : color(c.surface) },
          line: { color: groupIndex === 1 ? color(c.accent) : color(c.muted), transparency: 75, width: 0.7 },
        })
        slide.addText(group.label, {
          ...baseText, x: group.x + 0.35, y: 2.15, w: 4.9, h: 0.5, fontSize: 19, bold: true,
          color: groupIndex === 1 ? color(c.background) : color(c.ink), margin: 0,
        })
        group.items.slice(0, 4).forEach((item, itemIndex) => {
          slide.addText(`• ${item}`, {
            ...baseText, x: group.x + 0.35, y: 2.8 + itemIndex * 0.68, w: 4.95, h: 0.5,
            fontSize: 14, color: groupIndex === 1 ? color(c.background) : color(c.muted), margin: 0,
          })
        })
      })
      break
    }
    case 'process':
    case 'timeline': {
      titleBox()
      const items = bulletsOf(spec).slice(0, 5)
      const isTimeline = spec.layoutId === 'timeline'
      items.forEach((item, itemIndex) => {
        if (isTimeline) {
          const x = 0.85 + itemIndex * (11.65 / Math.max(items.length - 1, 1))
          slide.addShape(pptx.ShapeType.ellipse, {
            x: x - 0.12, y: 2.85, w: 0.24, h: 0.24, fill: { color: color(c.accent) }, line: { color: color(c.accent) },
          })
          slide.addText(`0${itemIndex + 1}`, {
            x: x - 0.4, y: 2.3, w: 0.8, h: 0.3, fontSize: 10, color: color(c.accent), align: 'center', margin: 0,
          })
          slide.addText(item, {
            ...baseText, x: x - 0.78, y: 3.25, w: 1.55, h: 1.6, fontSize: 11, align: 'center', margin: 0,
          })
        }
        else {
          const width = 10.9 / Math.max(items.length, 1)
          const x = 0.7 + itemIndex * width
          slide.addShape(pptx.ShapeType.rect, {
            x, y: 2.55, w: Math.max(width - 0.2, 1.2), h: 2.7, fill: { color: color(c.surface) },
            line: { color: color(c.accent), transparency: 55, width: 0.8 },
          })
          slide.addText(`0${itemIndex + 1}`, {
            x: x + 0.2, y: 2.8, w: 0.7, h: 0.35, fontSize: 12, color: color(c.accent), bold: true, margin: 0,
          })
          slide.addText(item, {
            ...baseText, x: x + 0.2, y: 3.3, w: Math.max(width - 0.55, 1), h: 1.5, fontSize: 13, margin: 0,
          })
        }
      })
      if (isTimeline) {
        slide.addShape(pptx.ShapeType.line, {
          x: 0.9, y: 2.97, w: 11.4, h: 0, line: { color: color(c.muted), transparency: 50, width: 1.4 },
        })
      }
      break
    }
    case 'metric': {
      eyebrow('KEY METRIC')
      slide.addText(valueOf(spec, 'metric'), {
        ...baseText, x: 0.68, y: 1.45, w: 8.5, h: 2,
        fontSize: 80, fontFace: theme.tokens.displayFont, color: color(c.accent), bold: true, margin: 0,
      })
      slide.addText(valueOf(spec, 'label') || title, {
        ...baseText, x: 0.7, y: 3.65, w: 8.8, h: 0.8, fontSize: 24, bold: true, margin: 0,
      })
      slide.addText(valueOf(spec, 'context'), {
        ...baseText, x: 0.7, y: 4.65, w: 8.5, h: 1.1, fontSize: 16, color: color(c.muted), margin: 0,
      })
      break
    }
    case 'chart': {
      titleBox()
      if (spec.chart) {
        const chartType = spec.chart.type === 'line'
          ? pptx.ChartType.line
          : spec.chart.type === 'pie' ? pptx.ChartType.pie : pptx.ChartType.bar
        const data = spec.chart.series.map(series => ({
          name: series.name,
          labels: spec.chart!.categories,
          values: series.values,
        }))
        slide.addChart(chartType, data, {
          x: 0.66, y: 1.75, w: 8.2, h: 4.55,
          showLegend: spec.chart.series.length > 1,
          showValue: spec.chart.type !== 'line',
          chartColors: c.chart.map(color),
          catAxisLabelFontFace: theme.tokens.bodyFont,
          valAxisLabelFontFace: theme.tokens.bodyFont,
          catAxisLabelFontSize: 10,
          valAxisLabelFontSize: 10,
          legendFontFace: theme.tokens.bodyFont,
          legendFontSize: 10,
        })
      }
      slide.addText(valueOf(spec, 'insight') || spec.notes || '', {
        ...baseText, x: 9.15, y: 2.0, w: 3.2, h: 3.8, fontSize: 15,
        color: color(c.ink), fill: { color: color(c.surface) }, margin: 0.2,
      })
      break
    }
    case 'table': {
      titleBox()
      if (spec.table) {
        const rows = [
          spec.table.headers.map(header => ({
            text: header,
            options: { bold: true, color: color(c.background), fill: { color: color(c.accent) } },
          })),
          ...spec.table.rows.map(row => row.map(cell => ({
            text: cell,
            options: { color: color(c.ink), fill: { color: color(c.surface) } },
          }))),
        ]
        slide.addTable(rows, {
          x: 0.66, y: 1.9, w: 11.95,
          fontFace: theme.tokens.bodyFont, fontSize: 11,
          border: { type: 'solid', color: color(c.muted), pt: 0.5 },
          margin: 0.08, valign: 'mid', autoPage: false,
        })
      }
      break
    }
    case 'quote': {
      slide.addText('“', {
        ...baseText, x: 0.7, y: 1.0, w: 1.2, h: 1.1, fontSize: 80,
        fontFace: theme.tokens.displayFont, color: color(c.accent), bold: true, margin: 0,
      })
      slide.addText(valueOf(spec, 'quote') || title, {
        ...baseText, x: 1.15, y: 2.0, w: 10.9, h: 2.35,
        fontFace: theme.tokens.displayFont, fontSize: 27, valign: 'mid', margin: 0,
      })
      slide.addText(valueOf(spec, 'source'), {
        ...baseText, x: 1.18, y: 4.75, w: 8, h: 0.4, fontSize: 13, color: color(c.muted), margin: 0,
      })
      break
    }
    case 'summary': {
      titleBox()
      bulletsOf(spec).slice(0, 4).forEach((item, itemIndex) => {
        const y = 1.95 + itemIndex * 1.1
        slide.addText(String(itemIndex + 1).padStart(2, '0'), {
          x: 0.7, y, w: 0.65, h: 0.4, fontSize: 13, color: color(c.accent), bold: true, margin: 0,
        })
        slide.addText(item, {
          ...baseText, x: 1.45, y: y - 0.05, w: 10.3, h: 0.7, fontSize: 18, margin: 0,
        })
      })
      break
    }
    case 'closing': {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 13.333, h: 7.5,
        fill: { color: color(c.accent) }, line: { color: color(c.accent) },
      })
      slide.addText(title || 'Thank you', {
        x: 0.9, y: 2.25, w: 11.3, h: 1.5,
        fontFace: theme.tokens.displayFont, fontSize: 43, bold: true,
        color: color(c.background), valign: 'mid', margin: 0,
      })
      slide.addText(valueOf(spec, 'subtitle'), {
        x: 0.93, y: 4.0, w: 9.5, h: 0.8, fontSize: 17, color: color(c.background), margin: 0,
      })
      break
    }
    case 'split-image':
    case 'image-top':
    case 'full-image': {
      if (image) {
        slide.addImage({
          path: image,
          x: spec.layoutId === 'split-image' ? 7.0 : 0,
          y: spec.layoutId === 'split-image' ? 1.5 : 0,
          w: spec.layoutId === 'split-image' ? 5.7 : 13.333,
          h: spec.layoutId === 'split-image' ? 4.7 : 7.5,
          sizing: { type: 'cover', w: spec.layoutId === 'split-image' ? 5.7 : 13.333, h: spec.layoutId === 'split-image' ? 4.7 : 7.5 },
        })
        if (spec.layoutId === 'split-image') {
          titleBox()
          slide.addText(valueOf(spec, 'body'), {
            ...baseText, x: 0.68, y: 1.95, w: 5.7, h: 3.6, fontSize: 16, color: color(c.muted), margin: 0,
          })
        }
        else {
          slide.addShape(pptx.ShapeType.rect, {
            x: 0, y: 4.65, w: 13.333, h: 2.85, fill: { color: bg, transparency: 8 },
            line: { color: bg, transparency: 100 },
          })
          slide.addText(title, {
            ...baseText, x: 0.66, y: 5.0, w: 11.5, h: 0.8,
            fontFace: theme.tokens.displayFont, fontSize: 30, bold: true, margin: 0,
          })
          slide.addText(valueOf(spec, 'caption') || valueOf(spec, 'subtitle'), {
            ...baseText, x: 0.68, y: 6.0, w: 11, h: 0.7, fontSize: 14, color: color(c.muted), margin: 0,
          })
        }
      }
      else {
        eyebrow('VISUAL STORY')
        slide.addText(title, {
          ...baseText, x: 0.7, y: 1.55, w: 11.6, h: 1.9,
          fontFace: theme.tokens.displayFont, fontSize: 34, bold: true, margin: 0,
        })
        slide.addText(valueOf(spec, 'body') || valueOf(spec, 'subtitle') || '可上传图片素材以启用此版式', {
          ...baseText, x: 0.72, y: 3.6, w: 9.8, h: 1.2, fontSize: 17, color: color(c.muted), margin: 0,
        })
      }
      break
    }
    default: {
      eyebrow('SLIDE')
      slide.addText(title, {
        ...baseText, x: 0.7, y: 1.4, w: 11.5, h: 1.5,
        fontFace: theme.tokens.displayFont, fontSize: 34, bold: true, margin: 0,
      })
      slide.addText(bulletsOf(spec).join('\n'), {
        ...baseText, x: 0.72, y: 3.1, w: 11, h: 2.8, fontSize: 18, color: color(c.muted), margin: 0,
      })
    }
  }
}

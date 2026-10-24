import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import JSZip from 'jszip'
import type { DeckOutline } from '../../shared/domain/schemas'
import { buildMotionBatch, type PptxShapeRef } from '../../shared/presentation/motion'
import { resolveOfficeCliBinary } from './office-cli'

const run = promisify(execFile)

export interface MotionApplyResult {
  available: boolean
  applied: number
  message: string
}

export function extractShapeNamesFromSlideXml(xml: string): PptxShapeRef[] {
  const result: PptxShapeRef[] = []
  const tags = xml.match(/<p:cNvPr\b[^>]*>/g) ?? []
  for (const tag of tags) {
    const id = tag.match(/\bid="([^"]+)"/)?.[1]
    const name = tag.match(/\bname="([^"]*)"/)?.[1]
    if (id && name) result.push({ id, name })
  }
  return result
}

export async function readPptxMotionShapes(filePath: string): Promise<PptxShapeRef[][]> {
  const zip = await JSZip.loadAsync(await readFile(filePath))
  const slidePaths = Object.keys(zip.files)
    .filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => {
      const aIndex = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0)
      const bIndex = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0)
      return aIndex - bIndex
    })

  const shapes: PptxShapeRef[][] = []
  for (const path of slidePaths) {
    const xml = await zip.file(path)!.async('string')
    shapes.push(extractShapeNamesFromSlideXml(xml))
  }
  return shapes
}

export async function applyPresentationMotion(
  filePath: string,
  outline: DeckOutline,
  options: { slideLimit?: number; binary?: string } = {},
): Promise<MotionApplyResult> {
  if (outline.motion.style === 'none') {
    return { available: true, applied: 0, message: '动画已关闭' }
  }

  const binary = resolveOfficeCliBinary(options.binary ?? process.env.OFFICECLI_BIN ?? 'officecli')
  const shapes = await readPptxMotionShapes(filePath)
  const limitedOutline = options.slideLimit
    ? { ...outline, slides: outline.slides.slice(0, options.slideLimit) }
    : outline
  const commands = buildMotionBatch(limitedOutline, shapes)
  if (!commands.length) {
    return { available: true, applied: 0, message: '没有匹配到可动画的语义元素' }
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'slidecraft-motion-'))
  const commandsPath = join(tempDir, 'commands.json')
  await writeFile(commandsPath, JSON.stringify(commands), 'utf8')

  try {
    const { stdout } = await run(binary, ['batch', filePath, '--input', commandsPath, '--json'], {
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, OFFICECLI_SKIP_UPDATE: '1' },
    })
    const payload = JSON.parse(stdout) as {
      success?: boolean
      data?: { summary?: { succeeded?: number; failed?: number } }
    }
    const applied = payload.data?.summary?.succeeded ?? 0
    const failed = payload.data?.summary?.failed ?? 0
    const transitionCount = limitedOutline.motion.transition === 'none' ? 0 : limitedOutline.slides.length
    const animationCount = Math.max(applied - transitionCount, 0)
    if (payload.success !== true || failed > 0) {
      return {
        available: true,
        applied,
        message: `动画只应用了 ${animationCount} 项，${failed} 项失败；PPTX 仍保持可打开`,
      }
    }
    return {
      available: true,
      applied,
      message: `已写入 ${animationCount} 项动画与 ${transitionCount} 页切换效果`,
    }
  }
  catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') {
      return { available: false, applied: 0, message: 'OfficeCLI 未安装，动画未写入' }
    }
    return {
      available: true,
      applied: 0,
      message: `动画写入失败，已保留无动画 PPTX：${err.message}`,
    }
  }
  finally {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => undefined)
    await run(binary, ['close', filePath], {
      timeout: 10_000,
      windowsHide: true,
      env: { ...process.env, OFFICECLI_SKIP_UPDATE: '1' },
    }).catch(() => undefined)
  }
}

import { readFile } from 'node:fs/promises'
import { extractText, getDocumentProxy } from 'unpdf'

export interface ExtractedAsset {
  name: string
  text: string
}

export function buildAssetContext(assets: ExtractedAsset[], maxChars = 14_000): string {
  const parts: string[] = []
  let remaining = maxChars

  for (const asset of assets) {
    const text = asset.text.replace(/\u0000/g, '').trim()
    if (!text || remaining <= 0) continue
    const header = `### ${asset.name}\n`
    const available = remaining - header.length
    if (available <= 50) break
    const body = text.length > available ? `${text.slice(0, available)}\n[素材内容已截断]` : text
    parts.push(`${header}${body}`)
    remaining -= header.length + body.length + 2
  }

  return parts.join('\n\n')
}

export async function readPlainTextAsset(filePath: string, maxChars = 12_000): Promise<string> {
  const contents = await readFile(filePath, 'utf8')
  return contents.slice(0, maxChars)
}

export async function extractInlineText(filePath: string, mimeType: string): Promise<string | null> {
  if (['text/plain', 'text/markdown', 'text/csv'].includes(mimeType)) {
    return readPlainTextAsset(filePath)
  }
  if (mimeType === 'application/pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(await readFile(filePath)))
    const result = await extractText(pdf, { mergePages: true })
    return result.text.slice(0, 12_000)
  }
  return null
}

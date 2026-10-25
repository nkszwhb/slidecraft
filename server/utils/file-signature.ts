import JSZip from 'jszip'

export type UploadKind = 'pdf' | 'zip' | 'png' | 'jpeg' | 'webp' | 'text'

export interface UploadValidation {
  ok: boolean
  mimeType?: string
  extension?: string
  message?: string
}

const MIME_MAP: Record<string, { extension: string; kind: UploadKind; contentType?: string }> = {
  'application/pdf': { extension: '.pdf', kind: 'pdf' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    extension: '.pptx',
    kind: 'zip',
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extension: '.docx',
    kind: 'zip',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    extension: '.xlsx',
    kind: 'zip',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
  },
  'text/plain': { extension: '.txt', kind: 'text' },
  'text/markdown': { extension: '.md', kind: 'text' },
  'text/csv': { extension: '.csv', kind: 'text' },
  'image/png': { extension: '.png', kind: 'png' },
  'image/jpeg': { extension: '.jpg', kind: 'jpeg' },
  'image/webp': { extension: '.webp', kind: 'webp' },
}

const EXTENSION_MAP: Record<string, { mimeType: string; kind: UploadKind; contentType?: string }> = Object.fromEntries(
  Object.entries(MIME_MAP).map(([mimeType, value]) => [value.extension, { mimeType, ...value }]),
)
EXTENSION_MAP['.jpeg'] = EXTENSION_MAP['.jpg']!

export function sniffUploadKind(data: Uint8Array): UploadKind | null {
  if (data.length >= 5
    && data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46 && data[4] === 0x2D) {
    return 'pdf'
  }
  if (data.length >= 8
    && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47
    && data[4] === 0x0D && data[5] === 0x0A && data[6] === 0x1A && data[7] === 0x0A) {
    return 'png'
  }
  if (data.length >= 3 && data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) return 'jpeg'
  if (data.length >= 12
    && String.fromCharCode(...data.subarray(0, 4)) === 'RIFF'
    && String.fromCharCode(...data.subarray(8, 12)) === 'WEBP') {
    return 'webp'
  }
  if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4B) return 'zip'
  if (data.length && !data.subarray(0, Math.min(2048, data.length)).includes(0)) return 'text'
  return null
}

export async function validateUpload(
  data: Uint8Array,
  suppliedMime: string,
  originalExtension: string,
): Promise<UploadValidation> {
  const normalizedExtension = originalExtension === '.jpeg' ? '.jpg' : originalExtension
  const fromExtension = EXTENSION_MAP[normalizedExtension]
  const fromMime = MIME_MAP[suppliedMime]
  const expected = fromExtension ?? fromMime
  if (!expected) return { ok: false, message: '暂不支持这种文件类型' }

  const actualKind = sniffUploadKind(data)
  if (actualKind !== expected.kind) {
    return { ok: false, message: '文件内容与扩展名不匹配' }
  }

  if (expected.kind === 'zip') {
    try {
      const zip = await JSZip.loadAsync(data)
      const contentTypes = await zip.file('[Content_Types].xml')?.async('string')
      if (!contentTypes || !contentTypes.includes(expected.contentType ?? '__never__')) {
        return { ok: false, message: 'Office 文件结构无效或类型不匹配' }
      }
    }
    catch {
      return { ok: false, message: 'Office 文件结构无效' }
    }
  }

  return {
    ok: true,
    mimeType: fromExtension?.mimeType ?? suppliedMime,
    extension: fromExtension ? normalizedExtension : (expected as { extension: string }).extension,
  }
}

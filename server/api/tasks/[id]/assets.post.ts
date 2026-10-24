import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { requireUser } from '../../../utils/auth'
import { useDb } from '../../../utils/database'
import { taskStorageKey, writeStorageFile } from '../../../utils/storage'
import { requireTaskId } from '../../../utils/validation'
import { registerAsset } from '../../../services/tasks'

const ALLOWED = new Map([
  ['application/pdf', '.pdf'],
  ['application/vnd.openxmlformats-officedocument.presentationml.presentation', '.pptx'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'],
  ['text/plain', '.txt'],
  ['text/markdown', '.md'],
  ['text/csv', '.csv'],
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
])

const MAX_FILE_SIZE = 50 * 1024 * 1024

export default defineEventHandler(async (event) => {
  requireUser(event)
  const taskId = requireTaskId(getRouterParam(event, 'id'))
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.filename && part.data)
  if (!file) throw createError({ statusCode: 400, statusMessage: '请选择要上传的文件' })
  if (file.data.length > MAX_FILE_SIZE) {
    throw createError({ statusCode: 413, statusMessage: '单个素材不能超过 50MB' })
  }

  const suppliedMime = file.type?.split(';')[0] ?? 'application/octet-stream'
  const originalExtension = extname(file.filename ?? '').toLowerCase()
  const expectedExtension = ALLOWED.get(suppliedMime)
  const extension = expectedExtension ?? (
    ['.pdf', '.pptx', '.docx', '.xlsx', '.txt', '.md', '.csv', '.png', '.jpg', '.jpeg', '.webp']
      .includes(originalExtension) ? originalExtension : undefined
  )
  if (!extension) {
    throw createError({ statusCode: 415, statusMessage: '暂不支持这种文件类型' })
  }

  const purposePart = parts?.find(part => part.name === 'purpose')
  const purpose = purposePart?.data.toString('utf8') === 'style' ? 'style' : 'content'
  const assetId = randomUUID()
  const storageKey = taskStorageKey(taskId, 'assets', `${assetId}${extension}`)
  await writeStorageFile(storageKey, file.data)

  await registerAsset(useDb(), {
    id: assetId,
    taskId,
    name: file.filename ?? `asset${extension}`,
    storageKey,
    mimeType: suppliedMime,
    sizeBytes: file.data.length,
    purpose,
  })

  return { id: assetId }
})

import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { requireUser } from '../../../utils/auth'
import { useDb } from '../../../utils/database'
import { validateUpload } from '../../../utils/file-signature'
import { taskStorageKey, writeStorageFile } from '../../../utils/storage'
import { requireTaskId } from '../../../utils/validation'
import { registerAsset } from '../../../services/tasks'

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
  const validated = await validateUpload(file.data, suppliedMime, originalExtension)
  if (!validated.ok || !validated.extension || !validated.mimeType) {
    throw createError({ statusCode: 415, statusMessage: validated.message ?? '暂不支持这种文件类型' })
  }

  const purposePart = parts?.find(part => part.name === 'purpose')
  const purpose = purposePart?.data.toString('utf8') === 'style' ? 'style' : 'content'
  const assetId = randomUUID()
  const storageKey = taskStorageKey(taskId, 'assets', `${assetId}${validated.extension}`)
  await writeStorageFile(storageKey, file.data)

  await registerAsset(useDb(), {
    id: assetId,
    taskId,
    name: file.filename ?? `asset${validated.extension}`,
    storageKey,
    mimeType: validated.mimeType,
    sizeBytes: file.data.length,
    purpose,
  })

  return { id: assetId }
})

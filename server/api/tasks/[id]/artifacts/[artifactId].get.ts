import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { requireUser } from '../../../../utils/auth'
import { useDb } from '../../../../utils/database'
import { safeStoragePath } from '../../../../utils/storage'
import { requireTaskId } from '../../../../utils/validation'
import { getArtifact } from '../../../../services/tasks'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const taskId = requireTaskId(getRouterParam(event, 'id'))
  const artifactId = getRouterParam(event, 'artifactId') ?? ''
  const artifact = await getArtifact(useDb(), taskId, artifactId)
  if (!artifact) throw createError({ statusCode: 404, statusMessage: '文件不存在' })

  const path = safeStoragePath(artifact.key)
  const info = await stat(path).catch(() => null)
  if (!info) throw createError({ statusCode: 404, statusMessage: '文件不存在' })

  setHeader(event, 'Content-Type', artifact.mimeType)
  setHeader(event, 'Content-Length', info.size)
  setHeader(event, 'Content-Disposition', `attachment; filename="${artifact.name}"`)
  return sendStream(event, createReadStream(path))
})

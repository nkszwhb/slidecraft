import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, normalize, resolve } from 'node:path'

export function dataRoot(): string {
  return resolve(process.env.DATA_DIR || './.data')
}

export function safeStoragePath(key: string): string {
  const root = dataRoot()
  const target = resolve(root, normalize(key))
  if (!target.startsWith(root + (process.platform === 'win32' ? '\\' : '/'))) {
    throw new Error('Invalid storage key')
  }
  return target
}

export async function writeStorageFile(key: string, contents: Uint8Array | string): Promise<string> {
  const target = safeStoragePath(key)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, contents)
  return target
}

export function taskStorageKey(taskId: string, ...segments: string[]): string {
  return join('tasks', taskId, ...segments.map(segment => {
    if (segment.includes('..') || isAbsolute(segment)) throw new Error('Invalid path segment')
    return segment
  }))
}

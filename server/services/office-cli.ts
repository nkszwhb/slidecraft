import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

function resolveBinary(binary: string): string {
  if (binary !== 'officecli' && existsSync(binary)) return resolve(binary)
  if (binary !== 'officecli') return binary
  const vendor = join(
    process.cwd(),
    'node_modules',
    '@officecli',
    'officecli',
    'vendor',
    process.platform === 'win32' ? 'officecli.exe' : 'officecli',
  )
  return existsSync(vendor) ? vendor : binary
}

export interface OfficeCliResult {
  available: boolean
  valid: boolean
  message: string
}

export async function extractOfficeText(
  filePath: string,
  binary = process.env.OFFICECLI_BIN || 'officecli',
  maxChars = 12_000,
): Promise<string> {
  const executable = resolveBinary(binary)
  try {
    const { stdout } = await run(executable, ['view', filePath, 'text', '--max-lines', '200'], {
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, OFFICECLI_SKIP_UPDATE: '1' },
    })
    return stdout.slice(0, maxChars)
  }
  catch {
    return ''
  }
  finally {
    await run(executable, ['close', filePath], {
      timeout: 10_000,
      windowsHide: true,
      env: { ...process.env, OFFICECLI_SKIP_UPDATE: '1' },
    }).catch(() => undefined)
  }
}

export async function validateWithOfficeCli(
  filePath: string,
  binary = process.env.OFFICECLI_BIN || 'officecli',
): Promise<OfficeCliResult> {
  const executable = resolveBinary(binary)
  try {
    const { stdout, stderr } = await run(executable, ['validate', filePath, '--json'], {
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, OFFICECLI_SKIP_UPDATE: '1' },
    })
    return {
      available: true,
      valid: true,
      message: (stdout || stderr || 'OfficeCLI validation passed').trim().slice(0, 2000),
    }
  }
  catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string }
    if (err.code === 'ENOENT') {
      return {
        available: false,
        valid: false,
        message: 'OfficeCLI 未安装，已跳过结构验证',
      }
    }
    return {
      available: true,
      valid: false,
      message: (err.stderr || err.stdout || err.message || 'OfficeCLI validation failed').trim().slice(0, 2000),
    }
  }
  finally {
    // `validate` may open a resident session that keeps the file locked on Windows.
    await run(executable, ['close', filePath], {
      timeout: 10_000,
      windowsHide: true,
      env: { ...process.env, OFFICECLI_SKIP_UPDATE: '1' },
    }).catch(() => undefined)
  }
}

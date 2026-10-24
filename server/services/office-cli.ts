import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

export function resolveOfficeCliBinary(binary = 'officecli'): string {
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
  const executable = resolveOfficeCliBinary(binary)
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

interface OfficeCliPayload {
  success?: boolean
  data?: unknown
  message?: string
  warnings?: Array<{ message?: string; code?: string }>
}

/**
 * PptxGenJS intentionally emits notesMasterIdLst in a position that Microsoft
 * PowerPoint 16 accepts but XML-schema validators reject. It also emits a third
 * axis id for 2D charts. Rewriting either element makes PowerPoint repair the
 * file, so only these known-compatible PptxGenJS warnings are tolerated.
 */
function hasOnlyPowerPointCompatiblePptxGenjsWarnings(payload: OfficeCliPayload): boolean {
  if (payload.success !== false) return false
  const schemaWarnings = (payload.warnings ?? [])
    .map(warning => warning.message ?? '')
    .filter(message => message.startsWith('[Schema]'))

  if (!schemaWarnings.length) return false
  return schemaWarnings.every(message =>
    message.includes('notesMasterIdLst') || message.includes('chart:axId'),
  )
}

export async function validateWithOfficeCli(
  filePath: string,
  binary = process.env.OFFICECLI_BIN || 'officecli',
): Promise<OfficeCliResult> {
  const executable = resolveOfficeCliBinary(binary)
  try {
    const { stdout, stderr } = await run(executable, ['validate', filePath, '--json'], {
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, OFFICECLI_SKIP_UPDATE: '1' },
    })
    const payload = parsePayload(stdout)
    const warningCount = (payload?.warnings ?? []).filter(item => item.code === 'warning').length
    if (payload?.success === true && warningCount === 0) {
      return {
        available: true,
        valid: true,
        message: 'Validation passed: no errors found.',
      }
    }
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

    const payload = parsePayload(err.stdout)
    if (payload && hasOnlyPowerPointCompatiblePptxGenjsWarnings(payload)) {
      const count = (payload.warnings ?? []).filter(item =>
        (item.message ?? '').startsWith('[Schema]'),
      ).length
      return {
        available: true,
        valid: true,
        message: `PowerPoint compatibility check passed; ignored ${count} known PptxGenJS schema-order warning(s).`,
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

function parsePayload(stdout: string | undefined): OfficeCliPayload | undefined {
  if (!stdout?.trim().startsWith('{')) return undefined
  try {
    return JSON.parse(stdout) as OfficeCliPayload
  }
  catch {
    return undefined
  }
}

export function apiErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (error && typeof error === 'object') {
    const record = error as {
      statusMessage?: string
      data?: { statusMessage?: string; message?: string }
      message?: string
    }
    return record.data?.statusMessage || record.data?.message || record.statusMessage || record.message || fallback
  }
  return fallback
}

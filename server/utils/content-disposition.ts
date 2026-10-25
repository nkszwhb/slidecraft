export function attachmentContentDisposition(filename: string): string {
  const normalized = filename.replace(/[\r\n]/g, ' ').trim() || 'download'
  const asciiFallback = normalized
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_')
    .slice(0, 180) || 'download'
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(normalized)}`
}

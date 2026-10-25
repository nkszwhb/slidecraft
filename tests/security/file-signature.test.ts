import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { sniffUploadKind, validateUpload } from '../../server/utils/file-signature'

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

describe('upload file signatures', () => {
  it('recognizes common binary signatures', () => {
    expect(sniffUploadKind(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]))).toBe('pdf')
    expect(sniffUploadKind(new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))).toBe('png')
    expect(sniffUploadKind(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]))).toBe('jpeg')
    expect(sniffUploadKind(new TextEncoder().encode('RIFF0000WEBP'))).toBe('webp')
  })

  it('rejects content that does not match the declared file type', async () => {
    const result = await validateUpload(new TextEncoder().encode('not a pdf'), 'application/pdf', '.pdf')
    expect(result.ok).toBe(false)
    expect(result.message).toContain('不匹配')
  })

  it('accepts a structurally valid PPTX ZIP package', async () => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>')
    const data = await zip.generateAsync({ type: 'uint8array' })
    const result = await validateUpload(data, PPTX_MIME, '.pptx')
    expect(result).toEqual({ ok: true, mimeType: PPTX_MIME, extension: '.pptx' })
  })

  it('rejects a ZIP whose Office content type is wrong', async () => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    const data = await zip.generateAsync({ type: 'uint8array' })
    const result = await validateUpload(data, PPTX_MIME, '.pptx')
    expect(result.ok).toBe(false)
    expect(result.message).toContain('结构无效')
  })

  it('accepts plain text but rejects text containing NUL bytes', async () => {
    expect((await validateUpload(new TextEncoder().encode('hello'), 'text/plain', '.txt')).ok).toBe(true)
    const binary = new Uint8Array([0x68, 0x00, 0x69])
    expect((await validateUpload(binary, 'text/plain', '.txt')).ok).toBe(false)
  })

  it('normalizes the .jpeg extension to the canonical MIME type', async () => {
    const result = await validateUpload(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]), 'image/jpeg', '.jpeg')
    expect(result.extension).toBe('.jpg')
    expect(result.mimeType).toBe('image/jpeg')
  })

  it('keeps DOCX and PPTX content types distinct', async () => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    const data = await zip.generateAsync({ type: 'uint8array' })
    const result = await validateUpload(data, DOCX_MIME, '.docx')
    expect(result.ok).toBe(true)
  })
})

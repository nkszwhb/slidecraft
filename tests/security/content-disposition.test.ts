import { describe, expect, it } from 'vitest'
import { attachmentContentDisposition } from '../../server/utils/content-disposition'

describe('attachmentContentDisposition', () => {
  it('keeps unicode filenames in the RFC 5987 parameter', () => {
    const value = attachmentContentDisposition('季度汇报.pptx')
    expect(value).toContain('filename="____.pptx"')
    expect(value).toContain("filename*=UTF-8''%E5%AD%A3%E5%BA%A6%E6%B1%87%E6%8A%A5.pptx")
  })

  it('removes header injection characters', () => {
    const value = attachmentContentDisposition('deck"\r\nX-Injected: yes.pptx')
    expect(value).not.toContain('\r')
    expect(value).not.toContain('\n')
    expect(value).not.toContain('"X-Injected')
  })

  it('falls back for an empty filename', () => {
    expect(attachmentContentDisposition('   ')).toContain('filename="download"')
  })
})

import { describe, expect, it } from 'vitest'
import { sanitizePersonHtml, sanitizeRichText } from '@/lib/sanitize'

describe('sanitizeRichText', () => {
  it('strips scripts, event handlers and javascript: links', () => {
    const out = sanitizeRichText(
      '<p onclick="steal()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">x</a><img src=x onerror="alert(1)">',
    )
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i)
    expect(out).toContain('<p>Hi</p>')
  })

  it('keeps TipTap formatting, images and links', () => {
    const html = '<h2>Tiểu sử</h2><p><strong>Cụ</strong> <em>Đàm</em></p><img src="/uploads/a.jpg" alt="a" /><a href="https://x.vn" target="_blank">x</a>'
    const out = sanitizeRichText(html)!
    expect(out).toContain('<h2>Tiểu sử</h2>')
    expect(out).toContain('<strong>Cụ</strong>')
    expect(out).toContain('src="/uploads/a.jpg"')
    expect(out).toContain('rel="noopener noreferrer"')
  })

  it('only allows iframes from known video hosts', () => {
    expect(sanitizeRichText('<iframe src="https://www.youtube.com/embed/abc"></iframe>')).toContain('youtube.com')
    expect(sanitizeRichText('<iframe src="https://evil.example/x"></iframe>')).not.toContain('evil')
  })

  it('passes null and undefined through', () => {
    expect(sanitizeRichText(null)).toBeNull()
    expect(sanitizeRichText(undefined)).toBeUndefined()
  })
})

describe('sanitizePersonHtml', () => {
  it('cleans only the rich-text fields', () => {
    const data = sanitizePersonHtml({ name: '<b>x</b>', fullBiography: '<script>x</script><p>ok</p>' })
    expect(data.name).toBe('<b>x</b>')
    expect(data.fullBiography).toBe('<p>ok</p>')
  })
})

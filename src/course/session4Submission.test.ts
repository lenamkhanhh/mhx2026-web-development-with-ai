import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { describe, expect, it } from 'vitest'

const assignmentDirectory = resolve(cwd(), 'bai-4')

function readAssignmentFile(fileName: string) {
  return readFileSync(resolve(assignmentDirectory, fileName), 'utf8')
}

describe('Buoi 4 standalone submission', () => {
  it('provides a Vietnamese semantic HTML document with a separate stylesheet', () => {
    const html = readAssignmentFile('index.html')

    expect(html).toMatch(/<html\s+lang="vi">/)
    expect(html).toMatch(/<meta\s+name="viewport"/)
    expect(html).toMatch(/<link\s+rel="stylesheet"\s+href="style\.css"/)
    expect(html).toContain('<main')
    expect(html).toMatch(/<h1[^>]*>Đội hình Lập trình Web<\/h1>/)
  })

  it('preserves the supplied course content and exposes meaningful actions', () => {
    const html = readAssignmentFile('index.html')

    expect(html).toContain('MHX UIT 2026')
    expect(html).toContain('Company Tour')
    expect(html.match(/class="action-button /g)).toHaveLength(2)
    expect(html.match(/class="social-link"[^>]+aria-label=/g)).toHaveLength(4)
  })

  it('includes responsive, focus, and reduced-motion safeguards', () => {
    const css = readAssignmentFile('style.css')

    expect(css).toMatch(/@media\s*\(max-width:\s*680px\)/)
    expect(css).toContain(':focus-visible')
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/)
    expect(css).toContain('overflow-x: hidden')
  })
})

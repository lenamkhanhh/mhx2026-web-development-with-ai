import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const assignmentDirectory = resolve(process.cwd(), 'bai-4')

function readAssignmentFile(fileName: string) {
  return readFileSync(resolve(assignmentDirectory, fileName), 'utf8')
}

describe('Buoi 4 standalone submission', () => {
  it('provides a Vietnamese semantic HTML document with a separate stylesheet', () => {
    const html = readAssignmentFile('index.html')
    const document = new JSDOM(html).window.document

    expect(document.documentElement.lang).toBe('vi')
    expect(document.querySelector('meta[name="viewport"]')).not.toBeNull()
    expect(document.querySelector('link[href="style.css"]')).not.toBeNull()
    expect(document.querySelector('main')).not.toBeNull()
    expect(document.querySelector('h1')?.textContent).toContain('Đội hình Lập trình Web')
  })

  it('preserves the supplied course content and exposes meaningful actions', () => {
    const html = readAssignmentFile('index.html')
    const document = new JSDOM(html).window.document
    const pageText = document.body.textContent ?? ''

    expect(pageText).toContain('MHX UIT 2026')
    expect(pageText).toContain('Company Tour')
    expect(document.querySelectorAll('.action-button')).toHaveLength(2)
    expect(document.querySelectorAll('.social-link[aria-label]')).toHaveLength(4)
  })

  it('includes responsive, focus, and reduced-motion safeguards', () => {
    const css = readAssignmentFile('style.css')

    expect(css).toMatch(/@media\s*\(max-width:\s*680px\)/)
    expect(css).toContain(':focus-visible')
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/)
    expect(css).toContain('overflow-x: hidden')
  })
})

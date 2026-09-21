import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')

const ruleBody = (selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = styles.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))
  if (!match?.[1]) throw new Error(`Missing CSS rule for ${selector}`)
  return match[1]
}

const fontSize = (selector: string): number => {
  const match = ruleBody(selector).match(/font-size:\s*(\d+)px/)
  if (!match?.[1]) throw new Error(`Missing pixel font size for ${selector}`)
  return Number(match[1])
}

const relativeLuminance = (hex: string): number => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    )
  return (
    0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
  )
}

describe('final review presentation requirements', () => {
  it('keeps heatmap controls at least 24px while preserving 10px visual cells', () => {
    expect(ruleBody('.heatmap-day')).toMatch(/min-width:\s*(?:2[4-9]|[3-9]\d)px/)
    expect(ruleBody('.heatmap-day')).toMatch(/min-height:\s*(?:2[4-9]|[3-9]\d)px/)
    expect(ruleBody('.heatmap-cell')).toMatch(/width:\s*10px/)
    expect(ruleBody('.heatmap-cell')).toMatch(/height:\s*10px/)
    expect(
      ruleBody('.heatmap-day[aria-pressed="true"] .heatmap-cell'),
    ).not.toContain('transform:')
  })

  it('gives unavailable-link text at least 4.5:1 contrast on white', () => {
    const subtle = styles.match(/--subtle:\s*(#[0-9a-f]{6})/i)?.[1]
    expect(subtle).toBeDefined()
    const contrast = 1.05 / (relativeLuminance(subtle!) + 0.05)
    expect(contrast).toBeGreaterThanOrEqual(4.5)
    expect(ruleBody('.link-unavailable')).toContain('color: var(--subtle)')
  })

  it.each([
    ['.calendar-weekday', 12],
    ['.calendar-cell time', 12],
    ['.calendar-event', 12],
    ['.calendar-event-unavailable small', 11],
    ['.status-pill', 12],
    ['.link-unavailable', 12],
  ])('keeps %s text at or above %ipx', (selector, minimum) => {
    expect(fontSize(selector as string)).toBeGreaterThanOrEqual(minimum as number)
  })

  it('declares a local data favicon', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    expect(html).toMatch(/<link[^>]+rel="icon"[^>]+href="data:/)
    expect(html).not.toMatch(/<link[^>]+rel="icon"[^>]+href="https?:/)
  })

  it('declares the Node versions required by Vite', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { engines?: { node?: string } }
    expect(packageJson.engines?.node).toBe('^20.19.0 || >=22.12.0')
  })
})

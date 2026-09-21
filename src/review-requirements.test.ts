import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')

const ruleBody = (selector: string): string => {
  const matches = [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) =>
      match[1]
        ?.split(',')
        .map((item) => item.trim())
        .includes(selector),
    )
    .map((match) => match[2]!)
  const body = matches.at(-1)
  if (!body) throw new Error(`Missing CSS rule for ${selector}`)
  return body
}

const fontSize = (selector: string): number => {
  const match = ruleBody(selector).match(/font-size:\s*(\d+)px/)
  if (!match?.[1]) throw new Error(`Missing pixel font size for ${selector}`)
  return Number(match[1])
}

const propertyValue = (selector: string, property: string): string => {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = ruleBody(selector).match(
    new RegExp(`(?:^|\\n)\\s*${escaped}:\\s*([^;]+);`),
  )
  if (!match?.[1]) throw new Error(`Missing ${property} for ${selector}`)
  return match[1].trim()
}

const resolveColor = (value: string): string => {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value
  const token = /^var\((--[^)]+)\)$/.exec(value)?.[1]
  if (!token) throw new Error(`Unsupported color value ${value}`)
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const color = styles.match(
    new RegExp(`${escaped}:\\s*(#[0-9a-f]{6})`, 'i'),
  )?.[1]
  if (!color) throw new Error(`Missing color token ${token}`)
  return color
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

const effectiveContrast = (
  foreground: string,
  background: string,
  opacity = 1,
): number => {
  const foregroundChannels = foreground
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16))
  const backgroundChannels = background
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16))
  const effective = foregroundChannels.map(
    (channel, index) =>
      channel * opacity + backgroundChannels[index]! * (1 - opacity),
  )
  const luminance = (channels: number[]) =>
    0.2126 *
      (channels[0]! / 255 <= 0.04045
        ? channels[0]! / 255 / 12.92
        : ((channels[0]! / 255 + 0.055) / 1.055) ** 2.4) +
    0.7152 *
      (channels[1]! / 255 <= 0.04045
        ? channels[1]! / 255 / 12.92
        : ((channels[1]! / 255 + 0.055) / 1.055) ** 2.4) +
    0.0722 *
      (channels[2]! / 255 <= 0.04045
        ? channels[2]! / 255 / 12.92
        : ((channels[2]! / 255 + 0.055) / 1.055) ** 2.4)
  const foregroundLuminance = luminance(effective)
  const backgroundLuminance = luminance(backgroundChannels)
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
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
    ['OA', '.event-oa'],
    ['interview', '.event-interview'],
  ])(
    'gives every effective %s calendar event foreground 4.5:1 contrast',
    (_name, selector) => {
      const foreground = resolveColor(propertyValue(selector, 'color'))
      const background = resolveColor(propertyValue(selector, 'background'))
      const roleOpacity = Number(
        /opacity:\s*([\d.]+)/.exec(ruleBody('.calendar-event-role'))?.[1] ?? 1,
      )
      const unavailableOpacity = Number(
        /opacity:\s*([\d.]+)/.exec(
          ruleBody('.calendar-event-unavailable small'),
        )?.[1] ?? 1,
      )

      expect(effectiveContrast(foreground, background)).toBeGreaterThanOrEqual(
        4.5,
      )
      expect(
        effectiveContrast(foreground, background, roleOpacity),
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        effectiveContrast(foreground, background, unavailableOpacity),
      ).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('does not reduce calendar role or unavailable-status contrast with opacity', () => {
    expect(ruleBody('.calendar-event-role')).not.toContain('opacity:')
    expect(ruleBody('.calendar-event-unavailable small')).not.toContain(
      'opacity:',
    )
  })

  it('gives outside-month dates 4.5:1 contrast against their cell background', () => {
    const selector = '.calendar-cell[data-outside="true"]'
    const foreground = resolveColor(propertyValue(selector, 'color'))
    const background = resolveColor(propertyValue(selector, 'background'))

    expect(effectiveContrast(foreground, background)).toBeGreaterThanOrEqual(
      4.5,
    )
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

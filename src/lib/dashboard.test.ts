import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  BIG_TECH_COMPANIES,
  buildAlerts,
  buildHeatmap,
  buildMonth,
  getNotifiedCompanies,
  loadDashboardData,
  normalizeCompany,
  safeUrl,
} from './dashboard'

const makeSeed = (overrides: Record<string, unknown> = {}) => ({
  generated_at: '2026-09-21T17:20:07.805295-04:00',
  timezone: 'America/New_York',
  notify_only_companies: ['amazon', 'google'],
  daily_applied_counts: {},
  status_totals: {},
  pending_oa: [],
  pending_interviews: [],
  notified_by_company: {},
  notified_count: 0,
  broken_urls: [],
  link_check_codes: {},
  company_blurbs: {},
  ...overrides,
})

const validPendingApplication = {
  company: 'Example',
  role: 'Software Engineer',
  url: 'https://example.com/job',
  notes: '',
  oa_due: null,
  status: 'oa',
  link_status: 'ok',
  blurb: 'Example company.',
}

const validLinkCheck = {
  bad: [],
  codes: {},
  checked: 0,
}

const stubDashboardFetch = (
  seed: unknown,
  linkCheck: unknown = validLinkCheck,
) => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(seed), { status: 200 }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify(linkCheck), { status: 200 }),
    )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('safeUrl', () => {
  it('keeps a valid HTTPS job URL', () => {
    expect(safeUrl('https://example.com/job', new Set())).toBe(
      'https://example.com/job',
    )
  })

  it('rejects URLs listed as broken', () => {
    expect(
      safeUrl(
        'https://bad.example/job',
        new Set(['https://bad.example/job']),
      ),
    ).toBeNull()
  })

  it('rejects unsafe and malformed URLs', () => {
    expect(safeUrl('javascript:alert(1)', new Set())).toBeNull()
    expect(safeUrl('not a URL', new Set())).toBeNull()
    expect(safeUrl(null, new Set())).toBeNull()
  })
})

describe('buildHeatmap', () => {
  it('builds 53 Sunday-start weeks ending with the reference week', () => {
    const weeks = buildHeatmap({ '2026-09-21': 31 }, '2026-09-21')

    expect(weeks).toHaveLength(53)
    expect(weeks.every((week) => week.days.length === 7)).toBe(true)
    expect(weeks[0]?.days[0]?.date).toBe('2025-09-21')
    expect(weeks.at(-1)?.days[0]?.date).toBe('2026-09-20')
    expect(
      weeks
        .at(-1)
        ?.days.some(
          (day) => day.date === '2026-09-21' && day.count === 31,
        ),
    ).toBe(true)
  })

  it('keeps calendar dates consecutive across New York spring DST', () => {
    const previousTimezone = process.env.TZ
    process.env.TZ = 'America/New_York'

    try {
      const finalWeek = buildHeatmap({}, '2026-03-09').at(-1)

      expect(finalWeek?.startDate).toBe('2026-03-08')
      expect(finalWeek?.days.map((day) => day.date)).toEqual([
        '2026-03-08',
        '2026-03-09',
        '2026-03-10',
        '2026-03-11',
        '2026-03-12',
        '2026-03-13',
        '2026-03-14',
      ])
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ
      else process.env.TZ = previousTimezone
    }
  })
})

describe('buildMonth', () => {
  it('builds 42 cells from the Sunday before through the final week', () => {
    const event = {
      id: 'oa-example-2026-09-21',
      type: 'oa' as const,
      company: 'Example',
      role: 'Software Engineer',
      date: '2026-09-21',
      url: 'https://example.com/job',
    }

    const cells = buildMonth(2026, 8, [event])

    expect(cells).toHaveLength(42)
    expect(cells[0]).toMatchObject({
      date: '2026-08-30',
      inCurrentMonth: false,
    })
    expect(cells.at(-1)).toMatchObject({
      date: '2026-10-10',
      inCurrentMonth: false,
    })
    expect(cells.find((cell) => cell.date === '2026-09-21')?.events).toEqual([
      event,
    ])
  })
})

describe('buildAlerts', () => {
  it('uses the generated date to separate tomorrow from days two through seven', () => {
    const seedWithTomorrowAndWeekDeadlines = makeSeed({
      pending_oa: [
        {
          company: 'Tomorrow Co',
          role: 'Engineer',
          url: 'https://example.com/tomorrow',
          notes: '',
          oa_due: '2026-09-22',
          status: 'oa',
          link_status: 'ok',
          blurb: '',
        },
      ],
      pending_interviews: [
        {
          company: 'Week Co',
          role: 'Engineer',
          url: 'https://example.com/week',
          notes: '',
          interview_date: '2026-09-28',
          status: 'interview',
          link_status: 'ok',
          blurb: '',
        },
      ],
    })

    expect(buildAlerts(seedWithTomorrowAndWeekDeadlines).oneDay).toHaveLength(1)
    expect(buildAlerts(seedWithTomorrowAndWeekDeadlines).oneWeek).toHaveLength(
      1,
    )
  })

  it('handles leap-day rollover boundaries and sorts each urgency bucket by date', () => {
    const pending = (company: string, oaDue: string) => ({
      ...validPendingApplication,
      company,
      oa_due: oaDue,
    })
    const seedAtLeapDayBoundary = makeSeed({
      generated_at: '2028-02-28T23:30:00-05:00',
      pending_oa: [
        pending('Eight days away', '2028-03-07'),
        pending('Seven days away', '2028-03-06'),
        pending('Same day', '2028-02-28'),
        pending('Two days away', '2028-03-01'),
        pending('Leap day', '2028-02-29'),
      ],
    })

    const alerts = buildAlerts(seedAtLeapDayBoundary)

    expect(alerts.oneDay.map((event) => event.company)).toEqual(['Leap day'])
    expect(alerts.oneWeek.map((event) => event.company)).toEqual([
      'Two days away',
      'Seven days away',
    ])
    expect(
      [...alerts.oneDay, ...alerts.oneWeek].map((event) => event.company),
    ).not.toContain('Same day')
    expect(
      [...alerts.oneDay, ...alerts.oneWeek].map((event) => event.company),
    ).not.toContain('Eight days away')
  })
})

describe('getNotifiedCompanies', () => {
  it('returns only allowlisted company groups with safe role links', () => {
    const broken = new Set(['https://example.com/broken'])
    const seed = makeSeed({
      notified_by_company: {
        Google: {
          blurb: 'Search and cloud.',
          roles: [
            { role: 'Safe role', url: 'https://example.com/safe' },
            { role: 'Broken role', url: 'https://example.com/broken' },
          ],
        },
        Tailscale: {
          blurb: 'Networking.',
          roles: [{ role: 'Role', url: 'https://example.com/tailscale' }],
        },
      },
    })

    const companies = getNotifiedCompanies(seed, broken)

    expect(
      companies.every((company) =>
        BIG_TECH_COMPANIES.has(normalizeCompany(company.name)),
      ),
    ).toBe(true)
    expect(companies.map((company) => company.name)).toEqual(['Google'])
    expect(companies[0]?.roles).toEqual([
      { role: 'Safe role', url: 'https://example.com/safe' },
      { role: 'Broken role', url: null },
    ])
  })
})

describe('loadDashboardData', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads both fixtures and combines their broken URL lists', async () => {
    const seed = makeSeed({
      broken_urls: ['https://example.com/from-seed'],
    })
    const linkCheck = {
      bad: ['https://example.com/from-check'],
      codes: { 'https://example.com/from-check': '404' },
      checked: 1,
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(seed), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(linkCheck), { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadDashboardData()

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/data/seed.json')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/data/link-check.json')
    expect(result).toEqual({
      seed,
      linkCheck,
      brokenUrls: new Set([
        'https://example.com/from-seed',
        'https://example.com/from-check',
      ]),
    })
  })

  it('rejects an invalid top-level fixture shape', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ generated_at: '2026-09-21' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            bad: [],
            codes: {},
            checked: 0,
          }),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadDashboardData()).rejects.toThrow(
      'Invalid dashboard seed data',
    )
  })

  it.each([
    '2026-02-30T17:20:07-04:00',
    '2026-09-21 17:20:07-04:00',
    '2026-09-21T25:20:07-04:00',
  ])('rejects invalid generated timestamp %s', async (generatedAt) => {
    stubDashboardFetch(makeSeed({ generated_at: generatedAt }))

    await expect(loadDashboardData()).rejects.toThrow(
      'Invalid dashboard seed data',
    )
  })

  it.each([
    {
      field: 'OA due date',
      overrides: {
        pending_oa: [
          { ...validPendingApplication, oa_due: '2026-02-30' },
        ],
      },
    },
    {
      field: 'interview date',
      overrides: {
        pending_interviews: [
          {
            ...validPendingApplication,
            oa_due: undefined,
            interview_date: '2026-04-31',
          },
        ],
      },
    },
  ])('rejects an impossible pending $field', async ({ overrides }) => {
    stubDashboardFetch(makeSeed(overrides))

    await expect(loadDashboardData()).rejects.toThrow(
      'Invalid dashboard seed data',
    )
  })

  it.each([
    {
      name: 'daily applied count',
      overrides: { daily_applied_counts: { '2026-09-21': '31' } },
    },
    {
      name: 'status total',
      overrides: { status_totals: { applied: '140' } },
    },
    {
      name: 'pending OA item',
      overrides: { pending_oa: [null] },
    },
    {
      name: 'pending interview field',
      overrides: {
        pending_interviews: [
          { ...validPendingApplication, role: 42, interview_date: null },
        ],
      },
    },
    {
      name: 'notified company',
      overrides: { notified_by_company: { Google: null } },
    },
    {
      name: 'notified company roles',
      overrides: {
        notified_by_company: {
          Google: { blurb: 'Search and cloud.', roles: null },
        },
      },
    },
    {
      name: 'notified role',
      overrides: {
        notified_by_company: {
          Google: {
            blurb: 'Search and cloud.',
            roles: [{ role: 'Engineer', url: 42 }],
          },
        },
      },
    },
    {
      name: 'link-check code',
      overrides: { link_check_codes: { 'https://example.com/job': 404 } },
    },
    {
      name: 'company blurb',
      overrides: { company_blurbs: { Google: 42 } },
    },
  ])('rejects a malformed nested $name', async ({ overrides }) => {
    stubDashboardFetch(makeSeed(overrides))

    await expect(loadDashboardData()).rejects.toThrow(
      'Invalid dashboard seed data',
    )
  })

  it('rejects malformed nested link-check codes', async () => {
    stubDashboardFetch(makeSeed(), {
      ...validLinkCheck,
      codes: { 'https://example.com/job': 404 },
    })

    await expect(loadDashboardData()).rejects.toThrow(
      'Invalid dashboard link-check data',
    )
  })
})

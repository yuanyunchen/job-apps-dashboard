import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { Heatmap } from './components/Heatmap'
import type { DashboardSeed, LinkCheckData } from './types'

const brokenRoleUrl = 'https://example.com/broken-role'
const pendingRoleUrl = 'https://example.com/oa'

const seed: DashboardSeed = {
  generated_at: '2026-09-21T17:20:07.805295-04:00',
  timezone: 'America/New_York',
  notify_only_companies: ['amazon', 'cursor', 'google'],
  daily_applied_counts: {
    '2026-09-18': 4,
    '2026-09-21': 2,
  },
  status_totals: {
    applied: 6,
    oa: 1,
    notified: 4,
  },
  pending_oa: [
    {
      company: 'Abridge',
      role: 'Software Engineer, Early Career',
      url: pendingRoleUrl,
      notes: 'Assessment received.',
      oa_due: '2026-09-22',
      status: 'oa',
      link_status: 'ok',
      blurb: 'AI clinical documentation for healthcare.',
    },
    {
      company: 'Netic',
      role: 'Software Engineer, Agent Platform',
      url: brokenRoleUrl,
      notes: '',
      oa_due: '2026-09-22',
      status: 'oa',
      link_status: 'unavailable',
      blurb: 'AI agents for business workflows.',
    },
  ],
  pending_interviews: [],
  notified_by_company: {
    Amazon: {
      blurb: 'E-commerce and cloud computing.',
      roles: [{ role: 'Software Development Engineer', url: 'https://example.com/amazon' }],
    },
    Cursor: {
      blurb: 'AI code editor.',
      roles: [
        { role: 'Software Engineer, Generalist', url: 'https://example.com/cursor' },
        { role: 'Broken role', url: brokenRoleUrl },
      ],
    },
    Tailscale: {
      blurb: 'Networking.',
      roles: [{ role: 'Software Engineer', url: 'https://example.com/tailscale' }],
    },
  },
  notified_count: 4,
  broken_urls: [brokenRoleUrl],
  link_check_codes: { [brokenRoleUrl]: '404' },
  company_blurbs: {
    Abridge: 'AI clinical documentation for healthcare.',
    Netic: 'AI agents for business workflows.',
  },
}

const linkCheck: LinkCheckData = {
  bad: [brokenRoleUrl],
  codes: { [brokenRoleUrl]: '404' },
  checked: 6,
}

const initialData = { seed, linkCheck }

describe('Heatmap keyboard and touch targets', () => {
  it('keeps a 10px visual cell inside one roving interactive tab stop', () => {
    const { container } = render(
      <Heatmap
        counts={{ '2026-09-21': 2 }}
        endDate="2026-09-21"
      />,
    )

    const days = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.heatmap-day'),
    )
    expect(days).toHaveLength(371)
    expect(days.filter((day) => day.tabIndex === 0)).toHaveLength(1)
    expect(days.find((day) => day.tabIndex === 0)).toHaveAccessibleName(
      /september 21, 2026: 2 applications/i,
    )
    expect(days[0]).toContainElement(
      days[0]?.querySelector('.heatmap-cell') ?? null,
    )
  })

  it('moves focus and selection by day or week with arrow keys', async () => {
    const user = userEvent.setup()
    render(
      <Heatmap
        counts={{
          '2026-09-13': 4,
          '2026-09-20': 3,
          '2026-09-21': 2,
        }}
        endDate="2026-09-21"
      />,
    )
    const initialDay = screen.getByRole('button', {
      name: /september 21, 2026: 2 applications/i,
    })
    initialDay.focus()

    await user.keyboard('{ArrowUp}')
    const previousDay = screen.getByRole('button', {
      name: /september 20, 2026: 3 applications/i,
    })
    expect(previousDay).toHaveFocus()
    expect(previousDay).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('3 applications')).toBeVisible()

    await user.keyboard('{ArrowLeft}')
    const previousWeek = screen.getByRole('button', {
      name: /september 13, 2026: 4 applications/i,
    })
    expect(previousWeek).toHaveFocus()
    expect(previousWeek).toHaveAttribute('aria-pressed', 'true')

    await user.keyboard('{ArrowRight}{ArrowDown}')
    expect(initialDay).toHaveFocus()
    expect(initialDay).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Job Apps Dashboard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens on activity and navigates across all six views', async () => {
    const user = userEvent.setup()
    render(<App initialData={initialData} />)

    expect(
      screen.getByRole('heading', { name: /application activity/i }),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: /calendar/i }))
    expect(screen.getByRole('heading', { name: /calendar/i })).toBeVisible()

    await user.click(screen.getByRole('button', { name: /pending oa/i }))
    expect(screen.getByRole('heading', { name: /pending assessments/i })).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: /pending interviews/i }),
    )
    expect(screen.getByText(/no interviews scheduled/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: /alerts/i }))
    expect(screen.getByRole('heading', { name: /upcoming alerts/i })).toBeVisible()

    await user.click(screen.getByRole('button', { name: /big-tech notify/i }))
    expect(screen.getByRole('heading', { name: /big-tech notify/i })).toBeVisible()
  })

  it('exposes one current navigation destination', async () => {
    const user = userEvent.setup()
    render(<App initialData={initialData} />)

    const activity = screen.getByRole('button', { name: 'Activity' })
    const calendar = screen.getByRole('button', { name: 'Calendar' })
    expect(activity).toHaveAttribute('aria-current', 'page')
    expect(calendar).not.toHaveAttribute('aria-current')

    await user.click(calendar)

    expect(calendar).toHaveAttribute('aria-current', 'page')
    expect(activity).not.toHaveAttribute('aria-current')
  })

  it('orders the mobile workspace header before the six-control navigation', () => {
    render(<App initialData={initialData} />)

    const mobileHeader = screen.getByRole('banner', {
      name: /mobile workspace header/i,
    })
    const navigation = screen.getByRole('navigation', {
      name: /dashboard views/i,
    })

    expect(
      mobileHeader.compareDocumentPosition(navigation) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(within(navigation).getAllByRole('button')).toHaveLength(6)
  })

  it('formats refresh labels from the seed calendar date', () => {
    render(
      <App
        initialData={{
          linkCheck,
          seed: {
            ...seed,
            generated_at: '2026-09-21T23:30:00-04:00',
          },
        }}
      />,
    )

    expect(screen.getAllByText('Refreshed Sep 21, 2026')).toHaveLength(2)
    expect(screen.queryByText('Refreshed Sep 22, 2026')).not.toBeInTheDocument()
  })

  it('shows the selected activity day and application count', async () => {
    const user = userEvent.setup()
    render(<App initialData={initialData} />)

    const activityDay = screen.getByRole('button', {
      name: /september 18, 2026: 4 applications/i,
    })
    expect(activityDay.querySelector('.heatmap-cell')).not.toBeNull()
    await user.click(activityDay)

    expect(screen.getByText('September 18, 2026')).toBeVisible()
    expect(screen.getByText('4 applications')).toBeVisible()
  })

  it('moves to the next calendar month', async () => {
    const user = userEvent.setup()
    render(<App initialData={initialData} />)

    await user.click(screen.getByRole('button', { name: /calendar/i }))
    expect(screen.getByText('September 2026')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /next month/i }))
    expect(screen.getByText('October 2026')).toBeVisible()
    expect(
      screen.getByText(/no deadlines or interviews this month/i),
    ).toBeVisible()
    expect(screen.getByRole('grid', { name: /october 2026/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /previous month/i })).toBeVisible()
  })

  it('shows unavailable calendar links visibly and secures external anchors', async () => {
    const user = userEvent.setup()
    render(<App initialData={initialData} />)

    await user.click(screen.getByRole('button', { name: /calendar/i }))

    expect(screen.getByText('Link unavailable')).toBeVisible()
    const unavailableEvent = screen.getByLabelText(
      'Netic · Software Engineer, Agent Platform · Link unavailable',
    )
    expect(unavailableEvent).toBeVisible()
    expect(unavailableEvent.tagName).toBe('SPAN')
    expect(
      screen.queryByRole('link', {
        name: /netic · software engineer, agent platform/i,
      }),
    ).not.toBeInTheDocument()
    const safeCalendarLink = screen.getByRole('link', {
      name: /abridge · software engineer, early career/i,
    })
    expect(safeCalendarLink).toHaveAttribute('target', '_blank')
    expect(safeCalendarLink).toHaveAttribute('rel', 'noreferrer')
    expect(
      within(safeCalendarLink).getByText('Software Engineer, Early Career'),
    ).toHaveClass('calendar-event-role')
  })

  it('shows unavailable alert links visibly and secures external anchors', async () => {
    const user = userEvent.setup()
    render(<App initialData={initialData} />)

    await user.click(screen.getByRole('button', { name: /alerts/i }))

    const neticRow = screen.getByText('Netic').closest('article')
    expect(neticRow).not.toBeNull()
    expect(within(neticRow!).getByText('Link unavailable')).toHaveClass(
      'link-unavailable',
    )
    const safeAlertLink = screen.getByRole('link', {
      name: /view abridge alert role/i,
    })
    expect(safeAlertLink).toHaveAttribute('target', '_blank')
    expect(safeAlertLink).toHaveAttribute('rel', 'noreferrer')
  })

  it('renders safe links and labels unavailable links without unsafe anchors', async () => {
    const user = userEvent.setup()
    render(<App initialData={initialData} />)

    await user.click(screen.getByRole('button', { name: /pending oa/i }))

    const safePendingLink = screen.getByRole('link', {
      name: /view abridge role/i,
    })
    expect(safePendingLink).toHaveAttribute('href', pendingRoleUrl)
    expect(safePendingLink).toHaveAttribute('target', '_blank')
    expect(safePendingLink).toHaveAttribute('rel', 'noreferrer')
    expect(screen.getByText('Link unavailable')).toBeVisible()
    expect(
      screen.queryByRole('link', { name: /software engineer, agent platform/i }),
    ).not.toBeInTheDocument()
  })

  it('keeps notify results allowlisted, safe, and searchable', async () => {
    const user = userEvent.setup()
    render(<App initialData={initialData} />)

    await user.click(screen.getByRole('button', { name: /big-tech notify/i }))
    expect(screen.queryByText('Tailscale')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /broken role/i }),
    ).not.toBeInTheDocument()

    await user.type(screen.getByRole('searchbox'), 'cursor')
    expect(screen.getByText('Cursor')).toBeVisible()
    expect(screen.queryByText('Amazon')).not.toBeInTheDocument()
    const safeNotifyLink = screen.getByRole('link', {
      name: /software engineer, generalist/i,
    })
    expect(safeNotifyLink).toHaveAttribute('target', '_blank')
    expect(safeNotifyLink).toHaveAttribute('rel', 'noreferrer')
  })

  it('shows a no-results state for notify search', async () => {
    const user = userEvent.setup()
    render(<App initialData={initialData} />)

    await user.click(screen.getByRole('button', { name: /big-tech notify/i }))
    await user.type(screen.getByRole('searchbox'), 'no matching company')

    expect(screen.getByText(/no matching roles/i)).toBeVisible()
  })

  it('offers a retry when dashboard loading fails', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(seed), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(linkCheck), { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(
      await screen.findByRole('heading', { name: /couldn’t load your dashboard/i }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: /try again/i }))

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /application activity/i }),
      ).toBeVisible(),
    )
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})

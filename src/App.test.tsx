import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
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
      oa_due: null,
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

  it('shows the selected activity day and application count', async () => {
    const user = userEvent.setup()
    render(<App initialData={initialData} />)

    await user.click(
      screen.getByRole('button', {
        name: /september 18, 2026: 4 applications/i,
      }),
    )

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
  })

  it('renders safe links and labels unavailable links without unsafe anchors', async () => {
    const user = userEvent.setup()
    render(<App initialData={initialData} />)

    await user.click(screen.getByRole('button', { name: /pending oa/i }))

    expect(
      screen.getByRole('link', { name: /view abridge role/i }),
    ).toHaveAttribute('href', pendingRoleUrl)
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

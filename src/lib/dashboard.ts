import type {
  AlertBuckets,
  CalendarCell,
  CalendarEvent,
  CalendarEventType,
  DashboardData,
  DashboardSeed,
  HeatmapWeek,
  LinkCheckData,
  NotifiedCompany,
  PendingApplication,
} from '../types'

const BIG_TECH_NAMES = [
  'adobe',
  'amazon',
  'anthropic',
  'apple',
  'cursor',
  'databricks',
  'deepmind',
  'doordash',
  'facebook',
  'google',
  'linkedin',
  'meta',
  'microsoft',
  'netflix',
  'nvidia',
  'openai',
  'scale',
  'scale ai',
  'snowflake',
  'stripe',
  'tesla',
  'uber',
  'xai',
]

export const normalizeCompany = (company: string): string =>
  company.toLowerCase().replace(/[^a-z0-9]/g, '')

export const BIG_TECH_COMPANIES = new Set(BIG_TECH_NAMES.map(normalizeCompany))

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const isNumberRecord = (value: unknown): value is Record<string, number> =>
  isRecord(value) &&
  Object.values(value).every(
    (item) => typeof item === 'number' && Number.isFinite(item),
  )

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) &&
  Object.values(value).every((item) => typeof item === 'string')

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string'

const isOptionalNullableString = (
  value: unknown,
): value is string | null | undefined =>
  value === undefined || isNullableString(value)

const isPendingApplication = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.company === 'string' &&
  typeof value.role === 'string' &&
  isNullableString(value.url) &&
  typeof value.notes === 'string' &&
  isOptionalNullableString(value.oa_due) &&
  isOptionalNullableString(value.interview_date) &&
  typeof value.status === 'string' &&
  typeof value.link_status === 'string' &&
  typeof value.blurb === 'string'

const isNotifiedRole = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.role === 'string' &&
  isNullableString(value.url)

const isNotifiedCompany = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.blurb === 'string' &&
  Array.isArray(value.roles) &&
  value.roles.every(isNotifiedRole)

const isNotifiedCompanyRecord = (value: unknown): boolean =>
  isRecord(value) && Object.values(value).every(isNotifiedCompany)

const isDashboardSeed = (value: unknown): value is DashboardSeed => {
  if (!isRecord(value)) return false

  return (
    typeof value.generated_at === 'string' &&
    typeof value.timezone === 'string' &&
    isStringArray(value.notify_only_companies) &&
    isNumberRecord(value.daily_applied_counts) &&
    isNumberRecord(value.status_totals) &&
    Array.isArray(value.pending_oa) &&
    value.pending_oa.every(isPendingApplication) &&
    Array.isArray(value.pending_interviews) &&
    value.pending_interviews.every(isPendingApplication) &&
    isNotifiedCompanyRecord(value.notified_by_company) &&
    typeof value.notified_count === 'number' &&
    Number.isFinite(value.notified_count) &&
    isStringArray(value.broken_urls) &&
    isStringRecord(value.link_check_codes) &&
    isStringRecord(value.company_blurbs)
  )
}

const isLinkCheckData = (value: unknown): value is LinkCheckData => {
  if (!isRecord(value)) return false

  return (
    isStringArray(value.bad) &&
    isStringRecord(value.codes) &&
    typeof value.checked === 'number' &&
    Number.isFinite(value.checked)
  )
}

export const loadDashboardData = async (): Promise<DashboardData> => {
  const [seedResponse, linkCheckResponse] = await Promise.all([
    fetch('/data/seed.json'),
    fetch('/data/link-check.json'),
  ])

  if (!seedResponse.ok || !linkCheckResponse.ok) {
    throw new Error('Unable to load dashboard data')
  }

  const [seed, linkCheck]: [unknown, unknown] = await Promise.all([
    seedResponse.json(),
    linkCheckResponse.json(),
  ])

  if (!isDashboardSeed(seed)) {
    throw new Error('Invalid dashboard seed data')
  }
  if (!isLinkCheckData(linkCheck)) {
    throw new Error('Invalid dashboard link-check data')
  }

  return {
    seed,
    linkCheck,
    brokenUrls: new Set([...seed.broken_urls, ...linkCheck.bad]),
  }
}

export const safeUrl = (
  url: string | null | undefined,
  broken: Set<string>,
): string | null => {
  if (!url) return null

  const candidate = url.trim()
  if (!candidate || broken.has(url) || broken.has(candidate)) return null

  try {
    const parsed = new URL(candidate)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? candidate
      : null
  } catch {
    return null
  }
}

const parseDateOnly = (value: string): Date => {
  const dateOnly = value.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly)
  if (!match) throw new Error(`Invalid date: ${value}`)

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid date: ${value}`)
  }

  return date
}

const formatDateOnly = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const startOfWeek = (date: Date): Date => addDays(date, -date.getDay())

export const buildHeatmap = (
  counts: Record<string, number>,
  endDate: string,
): HeatmapWeek[] => {
  const finalWeekStart = startOfWeek(parseDateOnly(endDate))
  const firstWeekStart = addDays(finalWeekStart, -52 * 7)

  return Array.from({ length: 53 }, (_, weekIndex) => {
    const weekStart = addDays(firstWeekStart, weekIndex * 7)
    return {
      startDate: formatDateOnly(weekStart),
      days: Array.from({ length: 7 }, (_, dayIndex) => {
        const date = formatDateOnly(addDays(weekStart, dayIndex))
        return { date, count: counts[date] ?? 0 }
      }),
    }
  })
}

export const buildMonth = (
  year: number,
  month: number,
  events: CalendarEvent[],
): CalendarCell[] => {
  const firstCell = startOfWeek(new Date(year, month, 1))
  const eventsByDate = new Map<string, CalendarEvent[]>()

  for (const event of events) {
    const dateEvents = eventsByDate.get(event.date) ?? []
    dateEvents.push(event)
    eventsByDate.set(event.date, dateEvents)
  }

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = addDays(firstCell, index)
    const date = formatDateOnly(cellDate)
    return {
      date,
      day: cellDate.getDate(),
      inCurrentMonth:
        cellDate.getFullYear() === year && cellDate.getMonth() === month,
      events: eventsByDate.get(date) ?? [],
    }
  })
}

const toCalendarEvent = (
  item: PendingApplication,
  type: CalendarEventType,
  date: string,
  index: number,
): CalendarEvent => ({
  id: `${type}-${normalizeCompany(item.company)}-${date}-${index}`,
  type,
  company: item.company,
  role: item.role,
  date,
  url: item.url,
})

export const buildAlerts = (data: DashboardSeed): AlertBuckets => {
  const reference = parseDateOnly(data.generated_at.slice(0, 10))
  const alerts: AlertBuckets = { oneDay: [], oneWeek: [] }

  const datedItems = [
    ...data.pending_oa.map((item, index) => ({
      item,
      index,
      type: 'oa' as const,
      date: item.oa_due,
    })),
    ...data.pending_interviews.map((item, index) => ({
      item,
      index,
      type: 'interview' as const,
      date: item.interview_date,
    })),
  ]

  for (const { item, index, type, date } of datedItems) {
    if (!date) continue

    const calendarDate = parseDateOnly(date)
    const daysAway = Math.round(
      (calendarDate.getTime() - reference.getTime()) / 86_400_000,
    )
    const event = toCalendarEvent(item, type, formatDateOnly(calendarDate), index)

    if (daysAway === 1) alerts.oneDay.push(event)
    if (daysAway >= 2 && daysAway <= 7) alerts.oneWeek.push(event)
  }

  return alerts
}

export const getNotifiedCompanies = (
  data: DashboardSeed,
  broken: Set<string>,
): NotifiedCompany[] =>
  Object.entries(data.notified_by_company)
    .filter(([name]) => BIG_TECH_COMPANIES.has(normalizeCompany(name)))
    .map(([name, company]) => ({
      name,
      blurb: company.blurb,
      roles: company.roles.map((role) => ({
        role: role.role,
        url: safeUrl(role.url, broken),
      })),
    }))

export interface PendingApplication {
  company: string
  role: string
  url: string | null
  notes: string
  oa_due?: string | null
  interview_date?: string | null
  status: string
  link_status: string
  blurb: string
}

export interface NotifiedRoleSeed {
  role: string
  url: string | null
}

export interface NotifiedCompanySeed {
  blurb: string
  roles: NotifiedRoleSeed[]
}

export interface DashboardSeed {
  generated_at: string
  timezone: string
  notify_only_companies: string[]
  daily_applied_counts: Record<string, number>
  status_totals: Record<string, number>
  pending_oa: PendingApplication[]
  pending_interviews: PendingApplication[]
  notified_by_company: Record<string, NotifiedCompanySeed>
  notified_count: number
  broken_urls: string[]
  link_check_codes: Record<string, string>
  company_blurbs: Record<string, string>
}

export interface LinkCheckData {
  bad: string[]
  codes: Record<string, string>
  checked: number
}

export interface DashboardData {
  seed: DashboardSeed
  linkCheck: LinkCheckData
  brokenUrls: Set<string>
}

export interface HeatmapDay {
  date: string
  count: number
}

export interface HeatmapWeek {
  startDate: string
  days: HeatmapDay[]
}

export type CalendarEventType = 'oa' | 'interview'

export interface CalendarEvent {
  id: string
  type: CalendarEventType
  company: string
  role: string
  date: string
  url: string | null
}

export interface CalendarCell {
  date: string
  day: number
  inCurrentMonth: boolean
  events: CalendarEvent[]
}

export interface AlertBuckets {
  oneDay: CalendarEvent[]
  oneWeek: CalendarEvent[]
}

export interface NotifiedRole {
  role: string
  url: string | null
}

export interface NotifiedCompany {
  name: string
  blurb: string
  roles: NotifiedRole[]
}

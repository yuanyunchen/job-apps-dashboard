import { MonthCalendar } from '../components/MonthCalendar'
import type { CalendarEvent, DashboardSeed } from '../types'

interface CalendarViewProps {
  brokenUrls: Set<string>
  seed: DashboardSeed
}

const calendarEvents = (seed: DashboardSeed): CalendarEvent[] => [
  ...seed.pending_oa.flatMap((application, index) =>
    application.oa_due
      ? [
          {
            id: `oa-${index}-${application.oa_due}`,
            type: 'oa' as const,
            company: application.company,
            role: application.role,
            date: application.oa_due.slice(0, 10),
            url: application.url,
          },
        ]
      : [],
  ),
  ...seed.pending_interviews.flatMap((application, index) =>
    application.interview_date
      ? [
          {
            id: `interview-${index}-${application.interview_date}`,
            type: 'interview' as const,
            company: application.company,
            role: application.role,
            date: application.interview_date.slice(0, 10),
            url: application.url,
          },
        ]
      : [],
  ),
]

export const CalendarView = ({ brokenUrls, seed }: CalendarViewProps) => (
  <div className="view">
    <header className="view-header">
      <div>
        <p className="eyebrow">Your schedule</p>
        <h1>Calendar</h1>
        <p>Assessment deadlines and interviews, together in one calm view.</p>
      </div>
    </header>
    <MonthCalendar
      brokenUrls={brokenUrls}
      events={calendarEvents(seed)}
      initialDate={seed.generated_at}
    />
  </div>
)

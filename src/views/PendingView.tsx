import { CalendarCheck2, Clock3 } from 'lucide-react'

import { JobCards } from '../components/JobCards'
import type { DashboardSeed } from '../types'

interface PendingViewProps {
  brokenUrls: Set<string>
  kind: 'oa' | 'interviews'
  seed: DashboardSeed
}

export const PendingView = ({ brokenUrls, kind, seed }: PendingViewProps) => {
  const isAssessment = kind === 'oa'
  const applications = isAssessment
    ? seed.pending_oa
    : seed.pending_interviews

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">In progress</p>
          <h1>
            {isAssessment ? 'Pending assessments' : 'Pending interviews'}
          </h1>
          <p>
            {isAssessment
              ? 'Keep every active assessment visible and within reach.'
              : 'Upcoming conversations and the roles behind them.'}
          </p>
        </div>
        <span className="count-badge">
          {applications.length} {applications.length === 1 ? 'item' : 'items'}
        </span>
      </header>

      {applications.length ? (
        <JobCards
          applications={applications}
          brokenUrls={brokenUrls}
          dateField={isAssessment ? 'oa_due' : 'interview_date'}
        />
      ) : (
        <section className="empty-state">
          <span className="empty-icon">
            {isAssessment ? (
              <Clock3 aria-hidden="true" size={25} />
            ) : (
              <CalendarCheck2 aria-hidden="true" size={25} />
            )}
          </span>
          <h2>
            {isAssessment
              ? 'No assessments waiting'
              : 'No interviews scheduled'}
          </h2>
          <p>
            {isAssessment
              ? 'New online assessments will appear here when they arrive.'
              : 'Your calendar is clear. New interview invitations will appear here.'}
          </p>
        </section>
      )}
    </div>
  )
}

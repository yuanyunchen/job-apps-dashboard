import { ArrowUpRight, CalendarClock } from 'lucide-react'

import { safeUrl } from '../lib/dashboard'
import type { PendingApplication } from '../types'

interface JobCardsProps {
  applications: PendingApplication[]
  brokenUrls: Set<string>
  dateField: 'oa_due' | 'interview_date'
}

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value.slice(0, 10)}T12:00:00`))

const initials = (company: string): string =>
  company
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export const JobCards = ({
  applications,
  brokenUrls,
  dateField,
}: JobCardsProps) => (
  <div className="job-grid">
    {applications.map((application, index) => {
      const url = safeUrl(application.url, brokenUrls)
      const dueDate = application[dateField]
      return (
        <article
          className="job-card"
          key={`${application.company}-${application.role}-${index}`}
        >
          <div className="job-card-top">
            <span className="company-mark" aria-hidden="true">
              {initials(application.company)}
            </span>
            <span className="status-pill">
              <i aria-hidden="true" />
              {dateField === 'oa_due' ? 'Assessment' : 'Interview'}
            </span>
          </div>
          <div className="job-card-copy">
            <p className="company-name">{application.company}</p>
            <h2>{application.role}</h2>
            <p>{application.blurb || 'Company details are not yet available.'}</p>
          </div>
          <div className="job-card-footer">
            <span className="due-date">
              <CalendarClock aria-hidden="true" size={16} />
              {dueDate ? formatDate(dueDate) : 'Date not set'}
            </span>
            {url ? (
              <a
                aria-label={`View ${application.company} role`}
                className="card-link"
                href={url}
                rel="noreferrer"
                target="_blank"
              >
                View role <ArrowUpRight aria-hidden="true" size={16} />
              </a>
            ) : (
              <span className="link-unavailable">Link unavailable</span>
            )}
          </div>
        </article>
      )
    })}
  </div>
)

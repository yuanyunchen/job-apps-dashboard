import { ArrowUpRight, BellRing, CalendarCheck2 } from 'lucide-react'

import { buildAlerts, safeUrl } from '../lib/dashboard'
import type { CalendarEvent, DashboardSeed } from '../types'

interface AlertsViewProps {
  brokenUrls: Set<string>
  seed: DashboardSeed
}

const AlertList = ({
  events,
  brokenUrls,
  emptyCopy,
}: {
  events: CalendarEvent[]
  brokenUrls: Set<string>
  emptyCopy: string
}) =>
  events.length ? (
    <div className="alert-list">
      {events.map((event) => {
        const url = safeUrl(event.url, brokenUrls)
        return (
          <article className="alert-row" key={event.id}>
            <span className={`alert-type event-${event.type}`}>
              {event.type === 'oa' ? 'OA' : 'Interview'}
            </span>
            <div>
              <strong>{event.company}</strong>
              <span>{event.role}</span>
            </div>
            <time dateTime={event.date}>
              {new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
              }).format(new Date(`${event.date}T12:00:00`))}
            </time>
            {url ? (
              <a
                aria-label={`View ${event.company} alert role`}
                href={url}
                rel="noreferrer"
                target="_blank"
              >
                <ArrowUpRight aria-hidden="true" size={17} />
              </a>
            ) : (
              <span className="link-unavailable">Link unavailable</span>
            )}
          </article>
        )
      })}
    </div>
  ) : (
    <div className="compact-empty">
      <CalendarCheck2 aria-hidden="true" size={20} />
      <span>{emptyCopy}</span>
    </div>
  )

export const AlertsView = ({ brokenUrls, seed }: AlertsViewProps) => {
  const alerts = buildAlerts(seed)
  const total = alerts.oneDay.length + alerts.oneWeek.length

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Stay ahead</p>
          <h1>Upcoming alerts</h1>
          <p>Time-sensitive moments, sorted by how soon they need you.</p>
        </div>
        <span className="count-badge">
          <BellRing aria-hidden="true" size={15} />
          {total} upcoming
        </span>
      </header>

      <div className="alert-sections">
        <section className="surface alert-section">
          <div className="surface-heading">
            <div>
              <p className="eyebrow coral-text">Immediate</p>
              <h2>Due within one day</h2>
            </div>
            <span className="section-count">{alerts.oneDay.length}</span>
          </div>
          <AlertList
            brokenUrls={brokenUrls}
            emptyCopy="Nothing needs your attention tomorrow."
            events={alerts.oneDay}
          />
        </section>

        <section className="surface alert-section">
          <div className="surface-heading">
            <div>
              <p className="eyebrow indigo-text">Coming up</p>
              <h2>Due within one week</h2>
            </div>
            <span className="section-count">{alerts.oneWeek.length}</span>
          </div>
          <AlertList
            brokenUrls={brokenUrls}
            emptyCopy="The next seven days are clear."
            events={alerts.oneWeek}
          />
        </section>
      </div>
    </div>
  )
}

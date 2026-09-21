import {
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { buildMonth, safeUrl } from '../lib/dashboard'
import type { CalendarEvent } from '../types'

interface MonthCalendarProps {
  brokenUrls: Set<string>
  events: CalendarEvent[]
  initialDate: string
}

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
})

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const MonthCalendar = ({
  brokenUrls,
  events,
  initialDate,
}: MonthCalendarProps) => {
  const initial = new Date(`${initialDate.slice(0, 10)}T12:00:00`)
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initial.getFullYear(), initial.getMonth(), 1),
  )
  const cells = useMemo(
    () =>
      buildMonth(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth(),
        events,
      ),
    [events, visibleMonth],
  )
  const monthLabel = monthFormatter.format(visibleMonth)
  const weeks = Array.from({ length: 6 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  )
  const hasEvents = cells.some(
    (cell) => cell.inCurrentMonth && cell.events.length > 0,
  )

  const moveMonth = (amount: number) => {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    )
  }

  return (
    <section className="surface calendar-surface" aria-label="Month calendar">
      <div className="calendar-toolbar">
        <div>
          <p className="eyebrow">Schedule</p>
          <h2 aria-live="polite">{monthLabel}</h2>
        </div>
        <div className="calendar-controls">
          <button
            aria-label="Previous month"
            className="icon-button"
            onClick={() => moveMonth(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={19} />
          </button>
          <button
            aria-label="Next month"
            className="icon-button"
            onClick={() => moveMonth(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={19} />
          </button>
        </div>
      </div>

      {!hasEvents && (
        <div className="calendar-empty" role="status">
          <CalendarCheck2 aria-hidden="true" size={20} />
          <span>
            <strong>No deadlines or interviews this month</strong>
            <small>Use the month controls to review another part of your schedule.</small>
          </span>
        </div>
      )}

      <div className="calendar-scroll">
        <div
          aria-label={`${monthLabel} calendar`}
          className="calendar-grid"
          role="grid"
        >
          <div className="calendar-row" role="row">
            {weekdays.map((day) => (
              <div className="calendar-weekday" key={day} role="columnheader">
                {day}
              </div>
            ))}
          </div>
          {weeks.map((week) => (
            <div className="calendar-row" key={week[0]?.date} role="row">
              {week.map((cell) => (
                <div
                  aria-label={dayFormatter.format(
                    new Date(`${cell.date}T12:00:00`),
                  )}
                  className="calendar-cell"
                  data-outside={!cell.inCurrentMonth}
                  key={cell.date}
                  role="gridcell"
                >
                  <time dateTime={cell.date}>
                    <span aria-hidden="true">{cell.day}</span>
                  </time>
                  <div className="calendar-events">
                    {cell.events.map((event) => {
                      const url = safeUrl(event.url, brokenUrls)
                      const label = `${event.company} · ${event.role}`
                      return url ? (
                        <a
                          aria-label={label}
                          className={`calendar-event event-${event.type}`}
                          href={url}
                          key={event.id}
                          rel="noreferrer"
                          target="_blank"
                          title={label}
                        >
                          <span className="calendar-event-copy">
                            <span className="calendar-event-company">
                              {event.company}
                            </span>
                            <span className="calendar-event-role">
                              {event.role}
                            </span>
                          </span>
                          <ExternalLink aria-hidden="true" size={10} />
                        </a>
                      ) : (
                        <span
                          aria-label={`${label} · Link unavailable`}
                          className={`calendar-event calendar-event-unavailable event-${event.type}`}
                          key={event.id}
                          title={label}
                        >
                          <span className="calendar-event-copy">
                            <span className="calendar-event-company">
                              {event.company}
                            </span>
                            <span className="calendar-event-role">
                              {event.role}
                            </span>
                          </span>
                          <small>Link unavailable</small>
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="calendar-legend" aria-label="Calendar event legend">
        <span><i className="legend-dot oa-dot" />Online assessment</span>
        <span><i className="legend-dot interview-dot" />Interview</span>
      </div>
    </section>
  )
}

import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
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
          <h2 aria-live="polite">{monthFormatter.format(visibleMonth)}</h2>
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

      <div className="calendar-scroll">
        <div className="calendar-grid">
          {weekdays.map((day) => (
            <div className="calendar-weekday" key={day}>
              {day}
            </div>
          ))}
          {cells.map((cell) => (
            <div
              className="calendar-cell"
              data-outside={!cell.inCurrentMonth}
              key={cell.date}
            >
              <time dateTime={cell.date}>
                <span className="sr-only">
                  {dayFormatter.format(new Date(`${cell.date}T12:00:00`))}
                </span>
                <span aria-hidden="true">{cell.day}</span>
              </time>
              <div className="calendar-events">
                {cell.events.map((event) => {
                  const url = safeUrl(event.url, brokenUrls)
                  const label = `${event.company} · ${event.role}`
                  return url ? (
                    <a
                      className={`calendar-event event-${event.type}`}
                      href={url}
                      key={event.id}
                      rel="noreferrer"
                      target="_blank"
                      title={label}
                    >
                      <span>{event.company}</span>
                      <ExternalLink aria-hidden="true" size={10} />
                    </a>
                  ) : (
                    <span
                      className={`calendar-event event-${event.type}`}
                      key={event.id}
                      title={`${label} · Link unavailable`}
                    >
                      {event.company}
                    </span>
                  )
                })}
              </div>
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

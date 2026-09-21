import { useMemo, useRef, useState, type KeyboardEvent } from 'react'

import { buildHeatmap } from '../lib/dashboard'
import type { HeatmapDay } from '../types'

interface HeatmapProps {
  counts: Record<string, number>
  endDate: string
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const formatDate = (date: string): string =>
  dateFormatter.format(new Date(`${date}T12:00:00`))

const levelFor = (count: number, maximum: number): number => {
  if (count <= 0 || maximum <= 0) return 0
  return Math.max(1, Math.ceil((count / maximum) * 4))
}

export const Heatmap = ({ counts, endDate }: HeatmapProps) => {
  const weeks = useMemo(() => buildHeatmap(counts, endDate), [counts, endDate])
  const maximum = Math.max(0, ...Object.values(counts))
  const initialDay = (): HeatmapDay => {
    const endDay = weeks.flatMap((week) => week.days).find((day) => day.date === endDate)
    return endDay ?? { date: endDate, count: counts[endDate] ?? 0 }
  }
  const [selected, setSelected] = useState<HeatmapDay>(initialDay)
  const [tabStopDate, setTabStopDate] = useState(() => initialDay().date)
  const dayRefs = useRef(new Map<string, HTMLButtonElement>())

  const moveSelection = (
    event: KeyboardEvent<HTMLButtonElement>,
    weekIndex: number,
    dayIndex: number,
  ) => {
    let target: HeatmapDay | undefined
    switch (event.key) {
      case 'ArrowUp':
        target = weeks[weekIndex]?.days[dayIndex - 1]
        break
      case 'ArrowDown':
        target = weeks[weekIndex]?.days[dayIndex + 1]
        break
      case 'ArrowLeft':
        target = weeks[weekIndex - 1]?.days[dayIndex]
        break
      case 'ArrowRight':
        target = weeks[weekIndex + 1]?.days[dayIndex]
        break
      default:
        return
    }

    event.preventDefault()
    if (!target) return
    setSelected(target)
    setTabStopDate(target.date)
    dayRefs.current.get(target.date)?.focus()
  }

  return (
    <section className="surface activity-surface" aria-labelledby="activity-grid-title">
      <div className="surface-heading">
        <div>
          <p className="eyebrow">Last 12 months</p>
          <h2 id="activity-grid-title">Application rhythm</h2>
        </div>
        <div className="heatmap-legend" aria-label="Activity intensity legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i className={`heat-level-${level}`} key={level} aria-hidden="true" />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="heatmap-layout">
        <div className="heatmap-scroll">
          <div className="heatmap" aria-label="Application activity by day">
            {weeks.map((week, weekIndex) => (
              <div className="heatmap-week" key={week.startDate}>
                {week.days.map((day, dayIndex) => {
                  const countLabel = `${day.count} ${
                    day.count === 1 ? 'application' : 'applications'
                  }`
                  return (
                    <button
                      aria-label={`${formatDate(day.date)}: ${countLabel}`}
                      aria-pressed={selected.date === day.date}
                      className="heatmap-day"
                      key={day.date}
                      onClick={() => {
                        setSelected(day)
                        setTabStopDate(day.date)
                      }}
                      onKeyDown={(event) =>
                        moveSelection(event, weekIndex, dayIndex)
                      }
                      ref={(node) => {
                        if (node) dayRefs.current.set(day.date, node)
                        else dayRefs.current.delete(day.date)
                      }}
                      tabIndex={tabStopDate === day.date ? 0 : -1}
                      title={`${formatDate(day.date)} · ${countLabel}`}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={`heatmap-cell heat-level-${levelFor(day.count, maximum)}`}
                      />
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="activity-detail" aria-live="polite">
          <span className="detail-kicker">Selected day</span>
          <strong>{formatDate(selected.date)}</strong>
          <span className="detail-count">
            {selected.count} {selected.count === 1 ? 'application' : 'applications'}
          </span>
          <p>
            {selected.count
              ? 'A focused day of progress in your search.'
              : 'No applications recorded on this day.'}
          </p>
        </div>
      </div>
    </section>
  )
}

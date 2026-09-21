import { BellRing, BriefcaseBusiness, CheckCircle2, Clock3 } from 'lucide-react'

import { Heatmap } from '../components/Heatmap'
import type { DashboardSeed } from '../types'

interface ActivityViewProps {
  seed: DashboardSeed
}

const Metric = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof BellRing
  label: string
  value: number
  tone: string
}) => (
  <article className="metric-card">
    <span className={`metric-icon ${tone}`}>
      <Icon aria-hidden="true" size={18} />
    </span>
    <span>
      <strong>{value.toLocaleString()}</strong>
      <small>{label}</small>
    </span>
  </article>
)

export const ActivityView = ({ seed }: ActivityViewProps) => (
  <div className="view">
    <header className="view-header">
      <div>
        <p className="eyebrow">Overview</p>
        <h1>Application activity</h1>
        <p>See the momentum behind your search, one focused day at a time.</p>
      </div>
      <span className="header-badge">
        <i aria-hidden="true" />
        Data up to date
      </span>
    </header>

    <section className="metrics" aria-label="Application summary">
      <Metric
        icon={CheckCircle2}
        label="Applied"
        tone="metric-green"
        value={seed.status_totals.applied ?? 0}
      />
      <Metric
        icon={Clock3}
        label="Pending OA"
        tone="metric-indigo"
        value={seed.pending_oa.length}
      />
      <Metric
        icon={BriefcaseBusiness}
        label="Interviews"
        tone="metric-coral"
        value={seed.pending_interviews.length}
      />
      <Metric
        icon={BellRing}
        label="Notified roles"
        tone="metric-blue"
        value={seed.notified_count}
      />
    </section>

    <Heatmap
      counts={seed.daily_applied_counts}
      endDate={seed.generated_at.slice(0, 10)}
    />
  </div>
)

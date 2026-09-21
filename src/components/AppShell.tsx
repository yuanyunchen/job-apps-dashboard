import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Clock3,
  Sparkles,
} from 'lucide-react'
import type { ReactNode } from 'react'

export type ViewId =
  | 'activity'
  | 'calendar'
  | 'pending-oa'
  | 'pending-interviews'
  | 'alerts'
  | 'notify'

interface NavigationItem {
  id: ViewId
  label: string
  icon: typeof Bell
}

const navigation: NavigationItem[] = [
  { id: 'activity', label: 'Activity', icon: ChartNoAxesColumnIncreasing },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'pending-oa', label: 'Pending OA', icon: Clock3 },
  {
    id: 'pending-interviews',
    label: 'Pending interviews',
    icon: BriefcaseBusiness,
  },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'notify', label: 'Big-tech notify', icon: Building2 },
]

interface AppShellProps {
  activeView: ViewId
  children: ReactNode
  generatedAt?: string
  onNavigate: (view: ViewId) => void
}

const formatRefreshDate = (value?: string): string => {
  if (!value) return 'Loading latest data'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Refresh date unavailable'
  return `Refreshed ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)}`
}

export const AppShell = ({
  activeView,
  children,
  generatedAt,
  onNavigate,
}: AppShellProps) => (
  <div className="app-shell">
    <aside className="rail">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Sparkles size={18} strokeWidth={2.25} />
        </span>
        <span>
          <strong>Jobflow</strong>
          <small>Application desk</small>
        </span>
      </div>
      <nav className="navigation" aria-label="Dashboard views">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            className="nav-button"
            data-active={activeView === id}
            key={id}
            onClick={() => onNavigate(id)}
            type="button"
          >
            <Icon aria-hidden="true" size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="rail-footer">
        <span className="live-dot" aria-hidden="true" />
        <span>
          <strong>Workspace synced</strong>
          <small>{formatRefreshDate(generatedAt)}</small>
        </span>
      </div>
    </aside>

    <div className="mobile-topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Sparkles size={17} />
        </span>
        <strong>Jobflow</strong>
      </div>
      <span className="mobile-refresh">{formatRefreshDate(generatedAt)}</span>
    </div>

    <main className="main-content">{children}</main>
  </div>
)

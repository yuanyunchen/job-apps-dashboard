import { RotateCcw, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AppShell, type ViewId } from './components/AppShell'
import { loadDashboardData } from './lib/dashboard'
import type { DashboardData, DashboardSeed, LinkCheckData } from './types'
import { ActivityView } from './views/ActivityView'
import { AlertsView } from './views/AlertsView'
import { CalendarView } from './views/CalendarView'
import { NotifyView } from './views/NotifyView'
import { PendingView } from './views/PendingView'

interface AppProps {
  initialData?: {
    seed: DashboardSeed
    linkCheck: LinkCheckData
  }
}

const prepareData = ({
  seed,
  linkCheck,
}: NonNullable<AppProps['initialData']>): DashboardData => ({
  seed,
  linkCheck,
  brokenUrls: new Set([...seed.broken_urls, ...linkCheck.bad]),
})

const CurrentView = ({
  data,
  view,
}: {
  data: DashboardData
  view: ViewId
}) => {
  switch (view) {
    case 'activity':
      return <ActivityView seed={data.seed} />
    case 'calendar':
      return <CalendarView brokenUrls={data.brokenUrls} seed={data.seed} />
    case 'pending-oa':
      return (
        <PendingView
          brokenUrls={data.brokenUrls}
          kind="oa"
          seed={data.seed}
        />
      )
    case 'pending-interviews':
      return (
        <PendingView
          brokenUrls={data.brokenUrls}
          kind="interviews"
          seed={data.seed}
        />
      )
    case 'alerts':
      return <AlertsView brokenUrls={data.brokenUrls} seed={data.seed} />
    case 'notify':
      return <NotifyView brokenUrls={data.brokenUrls} seed={data.seed} />
  }
}

export default function App({ initialData }: AppProps) {
  const [activeView, setActiveView] = useState<ViewId>('activity')
  const [data, setData] = useState<DashboardData | null>(() =>
    initialData ? prepareData(initialData) : null,
  )
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    initialData ? 'ready' : 'loading',
  )
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (initialData) return
    let active = true
    setStatus('loading')
    loadDashboardData()
      .then((result) => {
        if (!active) return
        setData(result)
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [initialData, retryKey])

  return (
    <AppShell
      activeView={activeView}
      generatedAt={data?.seed.generated_at}
      onNavigate={setActiveView}
    >
      {status === 'loading' && (
        <section className="state-surface" aria-live="polite">
          <span className="loading-orbit" aria-hidden="true" />
          <p className="eyebrow">Preparing your workspace</p>
          <h1>Loading application data</h1>
          <p>Your latest activity and opportunities are on the way.</p>
        </section>
      )}

      {status === 'error' && (
        <section className="state-surface" role="alert">
          <span className="empty-icon">
            <WifiOff aria-hidden="true" size={25} />
          </span>
          <p className="eyebrow">Connection interrupted</p>
          <h1>Couldn’t load your dashboard</h1>
          <p>Check your connection, then try loading the data again.</p>
          <button
            className="primary-button"
            onClick={() => setRetryKey((key) => key + 1)}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={16} />
            Try again
          </button>
        </section>
      )}

      {status === 'ready' && data && (
        <CurrentView data={data} view={activeView} />
      )}
    </AppShell>
  )
}

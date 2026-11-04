import { useOverview, useSearches, useSignals } from '../../api/admin'
import { PageLoading } from '../../layout/AppLayout'
import { useTitle } from '../../lib/useTitle'
import { Breakdown } from './Breakdown'
import { DailyChart } from './DailyChart'
import { periodDays } from './insightsFormat'
import { KpiTiles } from './KpiTiles'
import { PeriodPicker } from './PeriodPicker'
import { SearchTerms } from './SearchTerms'
import { SignalsList } from './SignalsList'
import { usePeriod } from './usePeriod'

/** Sales, what to act on, where sales came from and what shoppers searched for, for one period. */
export function DashboardPage() {
  useTitle('Dashboard')
  const [period, setPeriod] = usePeriod()
  const overview = useOverview(period)
  const signals = useSignals(period)
  const searches = useSearches(period)
  const days = periodDays(period)

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-h1">Dashboard</h1>
        <PeriodPicker period={period} onChange={setPeriod} />
      </div>
      {overview.isPending && <PageLoading />}
      {overview.isError && <p className="err" role="alert">{overview.error.message}</p>}
      {overview.data && (
        <>
          <KpiTiles current={overview.data.current} previous={overview.data.previous} days={days} />
          <div className="adm-grid">
            <section className="panel adm-card" aria-labelledby="sig-h">
              <h2 id="sig-h">What to act on</h2>
              {signals.isError && <p className="err">Could not load signals.</p>}
              {signals.data && <SignalsList signals={signals.data} period={period} />}
            </section>
            <section className="panel adm-card" aria-labelledby="rev-h">
              <h2 id="rev-h">Revenue per day</h2>
              {overview.data.current.orders === 0 ? (
                <p className="muted" style={{ fontSize: 14 }}>No orders in this period.</p>
              ) : (
                <DailyChart daily={overview.data.daily} />
              )}
            </section>
          </div>
          <div className="adm-two">
            <Breakdown period={period} />
            {searches.data && <SearchTerms top={searches.data.top} zeroResults={searches.data.zeroResults} />}
          </div>
        </>
      )}
    </>
  )
}

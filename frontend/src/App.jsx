import { useState } from 'react'
import MineSelector from './components/MineSelector'
import MineMap from './components/MineMap'
import ForecastChart from './components/ForecastChart'
import WeatherPanel from './components/WeatherPanel'
import AlertCards from './components/AlertCards'
import ShapChart from './components/ShapChart'
import { useMines, useForecast, useAlerts, useShap, useSatellite, useProduction } from './hooks/useApi'
import { ALERT_COLORS } from './utils/constants'

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-card rounded-lg border border-border px-4 py-3">
      <p className="text-xs text-text-muted font-medium">{label}</p>
      <p className="text-2xl font-bold mt-0.5" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

function PanelHeader({ title, subtitle }) {
  return (
    <div className="mb-2">
      <h2 className="text-sm font-semibold text-primary tracking-wide uppercase">{title}</h2>
      {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
    </div>
  )
}

export default function App() {
  const [selectedMine, setSelectedMine] = useState('balaghat')

  const { data: mines } = useMines()
  const { data: forecast } = useForecast(selectedMine)
  const { data: alerts } = useAlerts(selectedMine)
  const { data: allAlerts } = useAlerts(null)
  const { data: shap } = useShap(selectedMine)
  const { data: weather } = useSatellite(selectedMine, 90)
  const { data: production } = useProduction(selectedMine, 24)

  const currentMine = mines?.find(m => m.id === selectedMine)
  const latestForecast = forecast?.[0]

  const criticalCount = allAlerts?.filter(a => a.alert_level === 'CRITICAL').length || 0
  const warningCount = allAlerts?.filter(a => a.alert_level === 'WARNING').length || 0

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-primary text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">MangaLens</h1>
            <p className="text-xs text-blue-200 opacity-80">AI-Powered Manganese Intelligence Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <MineSelector mines={mines} selected={selectedMine} onSelect={setSelectedMine} />
          <div className="flex gap-2 text-xs">
            {criticalCount > 0 && (
              <span className="px-2 py-1 rounded-full font-bold" style={{ backgroundColor: ALERT_COLORS.CRITICAL }}>
                {criticalCount} Critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-2 py-1 rounded-full font-bold" style={{ backgroundColor: ALERT_COLORS.WARNING }}>
                {warningCount} Warning
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Selected Mine"
          value={currentMine?.name || '—'}
          sub={`${currentMine?.type || ''} — ${currentMine?.state || ''}`}
        />
        <StatCard
          label="Predicted Output"
          value={latestForecast ? `${(latestForecast.predicted_tonnes / 1000).toFixed(1)}k t` : '—'}
          sub={latestForecast?.period}
        />
        <StatCard
          label="Shortfall Risk"
          value={latestForecast ? `${Math.abs(latestForecast.shortfall_pct).toFixed(1)}%` : '—'}
          color={latestForecast ? ALERT_COLORS[latestForecast.alert_level] : undefined}
          sub={latestForecast?.alert_level?.replace('_', ' ')}
        />
        <StatCard
          label="Target"
          value={latestForecast ? `${(latestForecast.target_tonnes / 1000).toFixed(1)}k t` : '—'}
          sub="Monthly target"
        />
      </div>

      {/* Main Grid */}
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Panel 1: Map */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-col min-h-[300px]">
          <PanelHeader title="MOIL Mine Locations" subtitle="Click mine to select — color indicates alert status" />
          <div className="flex-1">
            <MineMap mines={mines} alerts={allAlerts} selected={selectedMine} onSelect={setSelectedMine} />
          </div>
        </div>

        {/* Panel 2: Forecast */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-col min-h-[300px]">
          <PanelHeader title="Production Forecast" subtitle={currentMine ? `${currentMine.name} — Actual vs Predicted vs Target` : 'Select a mine'} />
          <div className="flex-1">
            <ForecastChart forecast={forecast} production={production} />
          </div>
        </div>

        {/* Panel 3: Weather */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-col min-h-[250px]">
          <PanelHeader title="Environmental Data" subtitle={currentMine ? `${currentMine.name} — Last 90 days from satellite` : 'Satellite-derived indicators'} />
          <div className="flex-1">
            <WeatherPanel weather={weather} />
          </div>
        </div>

        {/* Panel 4: Alerts + Actions */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-col min-h-[250px]">
          <PanelHeader title="Alerts & Corrective Actions" subtitle={`${criticalCount + warningCount} active alerts across mines`} />
          <div className="flex-1 overflow-hidden">
            <AlertCards alerts={selectedMine ? alerts : allAlerts} />
          </div>
        </div>
      </div>

      {/* SHAP Panel (full width) */}
      <div className="px-6 pb-6">
        <div className="bg-card rounded-xl border border-border p-4 h-64">
          <PanelHeader title="Feature Importance (SHAP)" subtitle={currentMine ? `Top factors driving ${currentMine.name} shortfall prediction` : 'What drives the forecast?'} />
          <div className="h-48">
            <ShapChart shap={shap} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-primary text-blue-200 text-xs text-center py-2 opacity-80">
        MangaLens v1.0 — SIH26009 — Ministry of Steel / MOIL Ltd. — Built with Sentinel-2, XGBoost, React
      </footer>
    </div>
  )
}

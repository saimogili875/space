import { useState } from 'react'
import MineSelector from './components/MineSelector'
import MineMap from './components/MineMap'
import ForecastChart from './components/ForecastChart'
import WeatherPanel from './components/WeatherPanel'
import AlertCards from './components/AlertCards'
import ShapChart from './components/ShapChart'
import SpectralPanel from './components/SpectralPanel'
import { useMines, useForecast, useAlerts, useShap, useSatellite, useProduction, useHeatmap } from './hooks/useApi'
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

function PanelHeader({ title, subtitle, right }) {
  return (
    <div className="mb-2 flex items-start justify-between">
      <div>
        <h2 className="text-sm font-semibold text-primary tracking-wide uppercase">{title}</h2>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export default function App() {
  const [selectedMine, setSelectedMine] = useState('balaghat')
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [activeTab, setActiveTab] = useState('weather')

  const { data: mines } = useMines()
  const { data: forecast } = useForecast(selectedMine)
  const { data: alerts } = useAlerts(selectedMine)
  const { data: allAlerts } = useAlerts(null)
  const { data: shap } = useShap(selectedMine)
  const { data: weather } = useSatellite(selectedMine, 90)
  const { data: production } = useProduction(selectedMine, 24)
  const { data: heatmap } = useHeatmap(showHeatmap ? selectedMine : null)

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
      <div className="px-6 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Panel 1: Map */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-col min-h-[300px]">
          <PanelHeader
            title="MOIL Mine Locations"
            subtitle={showHeatmap ? `${currentMine?.name || ''} — Manganese probability heatmap` : 'Click mine to select — color indicates alert status'}
            right={
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  showHeatmap
                    ? 'bg-accent text-white border-accent'
                    : 'bg-transparent text-primary border-primary hover:bg-primary/10'
                }`}
              >
                {showHeatmap ? 'Hide Heatmap' : 'Show Mn Heatmap'}
              </button>
            }
          />
          <div className="flex-1">
            <MineMap
              mines={mines}
              alerts={allAlerts}
              selected={selectedMine}
              onSelect={setSelectedMine}
              heatmap={showHeatmap ? heatmap : null}
            />
          </div>
        </div>

        {/* Panel 2: Forecast */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-col min-h-[300px]">
          <PanelHeader title="Production Forecast" subtitle={currentMine ? `${currentMine.name} — Ensemble: XGBoost (60%) + LSTM (40%)` : 'Select a mine'} />
          <div className="flex-1">
            <ForecastChart forecast={forecast} production={production} />
          </div>
        </div>

        {/* Panel 3: Weather / Spectral toggle */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-col min-h-[250px]">
          <PanelHeader
            title={activeTab === 'weather' ? 'Environmental Data' : 'Spectral Analysis'}
            subtitle={activeTab === 'weather'
              ? (currentMine ? `${currentMine.name} — Last 90 days from satellite` : 'Satellite-derived indicators')
              : (currentMine ? `${currentMine.name} — Sentinel-2 band ratios` : 'Band ratio indices')
            }
            right={
              <div className="flex gap-1 text-xs">
                <button
                  onClick={() => setActiveTab('weather')}
                  className={`px-2 py-1 rounded ${activeTab === 'weather' ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10'}`}
                >
                  Weather
                </button>
                <button
                  onClick={() => setActiveTab('spectral')}
                  className={`px-2 py-1 rounded ${activeTab === 'spectral' ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10'}`}
                >
                  Spectral
                </button>
              </div>
            }
          />
          <div className="flex-1">
            {activeTab === 'weather'
              ? <WeatherPanel weather={weather} />
              : <SpectralPanel mineId={selectedMine} />
            }
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
        MangaLens v1.0 — SIH26009 — Ministry of Steel / MOIL Ltd. — XGBoost + LSTM Ensemble | Sentinel-2 Spectral | React
      </footer>
    </div>
  )
}

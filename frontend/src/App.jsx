import { useState } from 'react'
import MineSelector from './components/MineSelector'
import MineMap from './components/MineMap'
import ForecastChart from './components/ForecastChart'
import WeatherPanel from './components/WeatherPanel'
import AlertCards from './components/AlertCards'
import ShapChart from './components/ShapChart'
import SpectralPanel from './components/SpectralPanel'
import WhatIfSimulator from './components/WhatIfSimulator'
import AnomalyPanel from './components/AnomalyPanel'
import MineCompare from './components/MineCompare'
import ArchDiagram from './components/ArchDiagram'
import ROICalculator from './components/ROICalculator'
import NotificationCenter from './components/NotificationCenter'
import VoiceQuery from './components/VoiceQuery'
import AuditTrail from './components/AuditTrail'
import RoleViews from './components/RoleViews'
import { useMines, useForecast, useAlerts, useShap, useSatellite, useProduction, useHeatmap, useAutoRefresh } from './hooks/useApi'
import { ALERT_COLORS, API_BASE } from './utils/constants'
import { t, LANGUAGES } from './utils/i18n'

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

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
    </span>
  )
}

function formatTimestamp(date) {
  if (!date) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function App() {
  const [selectedMine, setSelectedMine] = useState('balaghat')
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [activeTab, setActiveTab] = useState('weather')
  const [showWhatIf, setShowWhatIf] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [showArch, setShowArch] = useState(false)
  const [showROI, setShowROI] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [showAudit, setShowAudit] = useState(false)
  const [showRoles, setShowRoles] = useState(false)
  const [lang, setLang] = useState('en')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { data: mines } = useMines()
  const { data: forecast, lastUpdated: forecastUpdated, refetch: refetchForecast } = useForecast(selectedMine)
  const { data: alerts, refetch: refetchAlerts } = useAlerts(selectedMine)
  const { data: allAlerts, lastUpdated: alertsUpdated, refetch: refetchAllAlerts } = useAlerts(null)
  const { data: shap, refetch: refetchShap } = useShap(selectedMine)
  const { data: weather, refetch: refetchWeather } = useSatellite(selectedMine, 90)
  const { data: production, refetch: refetchProduction } = useProduction(selectedMine, 24)
  const { data: heatmap } = useHeatmap(showHeatmap ? selectedMine : null)

  useAutoRefresh([refetchForecast, refetchAlerts, refetchAllAlerts, refetchShap, refetchWeather, refetchProduction], 60000)

  const currentMine = mines?.find(m => m.id === selectedMine)
  const latestForecast = forecast?.[0]

  const criticalCount = allAlerts?.filter(a => a.alert_level === 'CRITICAL').length || 0
  const warningCount = allAlerts?.filter(a => a.alert_level === 'WARNING').length || 0

  const downloadReport = () => {
    window.open(`${API_BASE}/report/${selectedMine}`, '_blank')
  }

  const headerButtons = (
    <>
      <button
        onClick={() => setShowVoice(true)}
        className="text-xs px-3 py-1.5 rounded-lg bg-green-500/80 hover:bg-green-500 transition-colors border border-green-400 font-semibold"
      >
        🧠 {t('btn_voice', lang)}
      </button>
      <button
        onClick={downloadReport}
        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
        title="Download PDF Report"
      >
        {t('btn_pdf', lang)}
      </button>
      <button
        onClick={() => setShowArch(true)}
        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
      >
        {t('btn_arch', lang)}
      </button>
      <button
        onClick={() => setShowROI(true)}
        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
      >
        {t('btn_roi', lang)}
      </button>
      <button
        onClick={() => setShowNotifications(true)}
        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
      >
        {t('btn_notify', lang)}
      </button>
      <button
        onClick={() => setShowAudit(true)}
        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
      >
        📜 {t('btn_audit', lang)}
      </button>
      <button
        onClick={() => setShowRoles(true)}
        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
      >
        🎭 {t('btn_roles', lang)}
      </button>
      <button
        onClick={() => { setShowCompare(!showCompare); if (!showCompare) setShowWhatIf(false) }}
        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
          showCompare
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-white/10 hover:bg-white/20 border-white/20'
        }`}
      >
        {t('btn_compare', lang)}
      </button>
      <button
        onClick={() => { setShowWhatIf(!showWhatIf); if (!showWhatIf) setShowCompare(false) }}
        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
          showWhatIf
            ? 'bg-accent text-white border-accent'
            : 'bg-white/10 hover:bg-white/20 border-white/20'
        }`}
      >
        {t('btn_whatif', lang)}
      </button>
    </>
  )

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-primary text-white px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold tracking-tight">{t('app_title', lang)}</h1>
              <p className="text-[10px] md:text-xs text-blue-200 opacity-80 truncate">{t('app_subtitle', lang)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <LiveDot />
              <span className="text-[10px] text-green-300 hidden sm:inline">{t('live', lang)}</span>
            </div>
            <div className="flex items-center gap-0.5 ml-1">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                    lang === l.code
                      ? 'bg-white text-primary font-bold'
                      : 'text-blue-200 hover:text-white'
                  }`}
                  title={l.name}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <MineSelector mines={mines} selected={selectedMine} onSelect={setSelectedMine} />

            {/* Desktop buttons */}
            <div className="hidden lg:flex items-center gap-2">
              {headerButtons}
            </div>

            {/* Alert badges — always visible */}
            <div className="flex gap-1.5 text-xs flex-shrink-0">
              {criticalCount > 0 && (
                <span className="px-2 py-1 rounded-full font-bold animate-pulse" style={{ backgroundColor: ALERT_COLORS.CRITICAL }}>
                  {criticalCount} <span className="hidden sm:inline">Critical</span>
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2 py-1 rounded-full font-bold" style={{ backgroundColor: ALERT_COLORS.WARNING }}>
                  {warningCount} <span className="hidden sm:inline">Warning</span>
                </span>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileMenuOpen
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-white/20 flex flex-wrap gap-2">
            {headerButtons}
          </div>
        )}
      </header>

      {/* What-If Simulator (collapsible) */}
      {showWhatIf && (
        <div className="px-4 md:px-6 py-3">
          <div className="bg-card rounded-xl border-2 border-accent p-3 md:p-4">
            <PanelHeader
              title="What-If Simulator"
              subtitle={currentMine ? `${currentMine.name} — Adjust parameters to see production impact` : 'Select a mine first'}
              right={
                <button onClick={() => setShowWhatIf(false)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
              }
            />
            <WhatIfSimulator mineId={selectedMine} mineName={currentMine?.name} />
          </div>
        </div>
      )}

      {/* Mine Comparison (collapsible) */}
      {showCompare && (
        <div className="px-4 md:px-6 py-3">
          <div className="bg-card rounded-xl border-2 border-blue-400 p-3 md:p-4">
            <PanelHeader
              title="Mine Comparison"
              subtitle={currentMine ? `Comparing ${currentMine.name} with other mines` : 'Select mines to compare'}
              right={
                <button onClick={() => setShowCompare(false)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
              }
            />
            <MineCompare mines={mines} currentMineId={selectedMine} />
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="px-4 md:px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <StatCard
          label={t('selected_mine', lang)}
          value={currentMine?.name || '—'}
          sub={`${currentMine?.type || ''} — ${currentMine?.state || ''}`}
        />
        <StatCard
          label={t('predicted_output', lang)}
          value={latestForecast ? `${(latestForecast.predicted_tonnes / 1000).toFixed(1)}k t` : '—'}
          sub={latestForecast?.period}
        />
        <StatCard
          label={t('shortfall_risk', lang)}
          value={latestForecast ? `${Math.abs(latestForecast.shortfall_pct).toFixed(1)}%` : '—'}
          color={latestForecast ? ALERT_COLORS[latestForecast.alert_level] : undefined}
          sub={latestForecast?.alert_level?.replace('_', ' ')}
        />
        <StatCard
          label={t('target', lang)}
          value={latestForecast ? `${(latestForecast.target_tonnes / 1000).toFixed(1)}k t` : '—'}
          sub={t('monthly_target', lang)}
        />
      </div>

      {/* Main Grid */}
      <div className="px-4 md:px-6 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        {/* Panel 1: Map */}
        <div className="bg-card rounded-xl border border-border p-3 md:p-4 flex flex-col min-h-[250px] md:min-h-[300px]">
          <PanelHeader
            title={t('mine_locations', lang)}
            subtitle={showHeatmap ? `${currentMine?.name || ''} — ${t('heatmap_sub', lang)}` : t('mine_locations_sub', lang)}
            right={
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  showHeatmap
                    ? 'bg-accent text-white border-accent'
                    : 'bg-transparent text-primary border-primary hover:bg-primary/10'
                }`}
              >
                {showHeatmap ? t('heatmap_hide', lang) : t('heatmap_show', lang)}
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
        <div className="bg-card rounded-xl border border-border p-3 md:p-4 flex flex-col min-h-[250px] md:min-h-[300px]">
          <PanelHeader
            title={t('production_forecast', lang)}
            subtitle={currentMine ? `${currentMine.name} — ${t('ensemble_sub', lang)}` : t('select_mine', lang)}
            right={
              forecastUpdated && (
                <span className="text-[10px] text-text-muted flex items-center gap-1">
                  <LiveDot /> {formatTimestamp(forecastUpdated)}
                </span>
              )
            }
          />
          <div className="flex-1">
            <ForecastChart forecast={forecast} production={production} />
          </div>
        </div>

        {/* Panel 3: Weather / Spectral toggle */}
        <div className="bg-card rounded-xl border border-border p-3 md:p-4 flex flex-col min-h-[220px] md:min-h-[250px]">
          <PanelHeader
            title={activeTab === 'weather' ? t('env_data', lang) : t('spectral', lang)}
            subtitle={activeTab === 'weather'
              ? (currentMine ? `${currentMine.name} — ${t('satellite_sub', lang)}` : t('satellite_sub', lang))
              : (currentMine ? `${currentMine.name} — ${t('band_ratios', lang)}` : t('band_ratios', lang))
            }
            right={
              <div className="flex gap-1 text-xs">
                <button
                  onClick={() => setActiveTab('weather')}
                  className={`px-2 py-1 rounded ${activeTab === 'weather' ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10'}`}
                >
                  {t('weather', lang)}
                </button>
                <button
                  onClick={() => setActiveTab('spectral')}
                  className={`px-2 py-1 rounded ${activeTab === 'spectral' ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10'}`}
                >
                  {t('spectral_btn', lang)}
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
        <div className="bg-card rounded-xl border border-border p-3 md:p-4 flex flex-col min-h-[220px] md:min-h-[250px]">
          <PanelHeader
            title={t('alerts_title', lang)}
            subtitle={`${criticalCount + warningCount} ${t('alerts_sub', lang)}`}
            right={
              alertsUpdated && (
                <span className="text-[10px] text-text-muted flex items-center gap-1">
                  <LiveDot /> {formatTimestamp(alertsUpdated)}
                </span>
              )
            }
          />
          <div className="flex-1 overflow-hidden">
            <AlertCards alerts={selectedMine ? alerts : allAlerts} />
          </div>
        </div>
      </div>

      {/* Anomaly + SHAP row (full width, side by side) */}
      <div className="px-4 md:px-6 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        {/* Anomaly Detection */}
        <div className="bg-card rounded-xl border border-border p-3 md:p-4 min-h-[250px] md:min-h-[280px] flex flex-col">
          <PanelHeader
            title={t('anomaly_title', lang)}
            subtitle={currentMine ? `${currentMine.name} — ${t('anomaly_sub', lang)}` : t('proactive_scanning', lang)}
          />
          <div className="flex-1">
            <AnomalyPanel mineId={selectedMine} />
          </div>
        </div>

        {/* SHAP */}
        <div className="bg-card rounded-xl border border-border p-3 md:p-4 min-h-[250px] md:min-h-[280px] flex flex-col">
          <PanelHeader title={t('shap_title', lang)} subtitle={currentMine ? `${currentMine.name} — ${t('shap_sub', lang)}` : t('what_drives', lang)} />
          <div className="flex-1">
            <ShapChart shap={shap} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-primary text-blue-200 text-[10px] md:text-xs text-center py-2 px-4 opacity-80">
        {t('footer', lang)} — XGBoost + LSTM | Sentinel-2 | React
      </footer>

      {/* Modals */}
      {showArch && <ArchDiagram onClose={() => setShowArch(false)} />}
      {showROI && <ROICalculator onClose={() => setShowROI(false)} />}
      {showNotifications && <NotificationCenter onClose={() => setShowNotifications(false)} />}
      {showVoice && <VoiceQuery onClose={() => setShowVoice(false)} lang={lang} />}
      {showAudit && <AuditTrail onClose={() => setShowAudit(false)} lang={lang} />}
      {showRoles && <RoleViews onClose={() => setShowRoles(false)} lang={lang} selectedMine={selectedMine} />}
    </div>
  )
}

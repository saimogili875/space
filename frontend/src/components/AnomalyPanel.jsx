import { useState, useEffect } from 'react'
import { API_BASE, ALERT_COLORS } from '../utils/constants'

const TYPE_ICONS = {
  production: '⚠',
  multivariate: '🔍',
  weather: '☁',
}

const TYPE_LABELS = {
  production: 'Production',
  multivariate: 'Pattern',
  weather: 'Weather',
}

export default function AnomalyPanel({ mineId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!mineId) return
    setLoading(true)
    fetch(`${API_BASE}/anomaly/${mineId}?months=12`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mineId])

  if (loading) return <div className="flex items-center justify-center h-full text-text-muted text-sm">Scanning anomalies...</div>
  if (!data) return <div className="flex items-center justify-center h-full text-text-muted text-sm">Select a mine</div>

  const { anomalies, summary } = data
  const score = summary?.health_score ?? 100
  const scoreColor = score >= 80 ? '#27ae60' : score >= 60 ? '#f39c12' : '#e74c3c'

  return (
    <div className="flex flex-col h-full">
      {/* Health score bar */}
      <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border">
        <div className="flex-shrink-0">
          <div className="relative w-14 h-14">
            <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3"
                className="text-gray-200 dark:text-gray-700" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor} strokeWidth="3"
                strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: scoreColor }}>
              {score}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Health Score</p>
          <p className="text-xs text-text-muted">
            {summary.critical > 0 && <span className="text-red-500 font-bold mr-2">{summary.critical} critical</span>}
            {summary.warning > 0 && <span className="text-yellow-500 font-bold mr-2">{summary.warning} warning</span>}
            {summary.total_anomalies === 0 && <span className="text-green-500 font-bold">All clear</span>}
          </p>
        </div>
      </div>

      {/* Anomaly list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {anomalies.length === 0 ? (
          <div className="text-center text-text-muted text-sm py-4">No anomalies detected in last 12 months</div>
        ) : (
          anomalies.slice(0, 8).map((a, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-border bg-surface">
              <span className="text-base flex-shrink-0 mt-0.5" title={TYPE_LABELS[a.type]}>
                {TYPE_ICONS[a.type] || '⚠'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono text-text-muted">{a.date}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: ALERT_COLORS[a.severity] || '#999' }}>
                    {a.severity}
                  </span>
                  <span className="text-[10px] text-text-muted uppercase">{TYPE_LABELS[a.type]}</span>
                </div>
                <p className="text-xs leading-tight">{a.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

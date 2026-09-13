import { useState, useEffect } from 'react'
import { API_BASE } from '../utils/constants'

const CATEGORY_COLORS = {
  ml: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', icon: '🤖' },
  alert: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: '🚨' },
  anomaly: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', icon: '⚠️' },
  decision: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: '📋' },
  satellite: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: '🛰️' },
  user: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', icon: '👤' },
}

const ACTION_LABELS = {
  model_retrained: 'Model Retrained',
  alert_generated: 'Alert Generated',
  anomaly_detected: 'Anomaly Detected',
  forecast_generated: 'Forecast Generated',
  notification_sent: 'Notification Sent',
  satellite_update: 'Satellite Update',
  corrective_action: 'Corrective Action',
  model_drift_check: 'Model Drift Check',
  what_if_simulation: 'What-If Simulation',
}

export default function AuditTrail({ onClose, lang = 'en' }) {
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = filter !== 'all' ? `?category=${filter}` : ''
        const [logRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/audit${params}`),
          fetch(`${API_BASE}/audit/stats`),
        ])
        const logData = await logRes.json()
        const statsData = await statsRes.json()
        setEntries(logData.entries || [])
        setStats(statsData)
      } catch {
        setEntries([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [filter])

  const formatTime = (ts) => {
    const d = new Date(ts)
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const titles = {
    en: { title: 'Audit Trail & Decision Log', sub: 'Complete record of AI decisions, alerts, and system events', total: 'Total Events', system: 'System', user: 'User Actions', filter: 'Filter' },
    hi: { title: 'ऑडिट ट्रेल और निर्णय लॉग', sub: 'AI निर्णयों, अलर्ट और सिस्टम इवेंट्स का पूर्ण रिकॉर्ड', total: 'कुल इवेंट', system: 'सिस्टम', user: 'उपयोगकर्ता', filter: 'फ़िल्टर' },
    mr: { title: 'ऑडिट ट्रेल आणि निर्णय लॉग', sub: 'AI निर्णय, अलर्ट आणि सिस्टम इव्हेंट्सची संपूर्ण नोंद', total: 'एकूण इव्हेंट', system: 'सिस्टम', user: 'वापरकर्ता', filter: 'फिल्टर' },
  }
  const t = titles[lang] || titles.en

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <span className="text-xl">📜</span> {t.title}
            </h2>
            <p className="text-xs text-text-muted">{t.sub}</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1 rounded-lg border border-border">
            {lang === 'hi' ? 'बंद करें' : lang === 'mr' ? 'बंद करा' : 'Close'}
          </button>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 p-4 border-b border-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total_events}</div>
              <div className="text-[10px] text-text-muted uppercase">{t.total}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{stats.system_events}</div>
              <div className="text-[10px] text-text-muted uppercase">{t.system}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{stats.user_actions}</div>
              <div className="text-[10px] text-text-muted uppercase">{t.user}</div>
            </div>
          </div>
        )}

        {/* Filter pills */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border overflow-x-auto">
          <span className="text-xs text-text-muted font-medium">{t.filter}:</span>
          {['all', 'ml', 'alert', 'anomaly', 'decision', 'satellite'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`text-xs px-3 py-1 rounded-full transition-colors whitespace-nowrap ${
                filter === cat
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-text-muted hover:text-primary'
              }`}
            >
              {cat === 'all' ? '📊 All' : `${CATEGORY_COLORS[cat]?.icon || '📋'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-text-muted text-sm">Loading audit trail...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">No entries found</div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              {entries.map((entry, i) => {
                const cat = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.user
                return (
                  <div key={i} className="relative pl-10 pb-4">
                    <div className={`absolute left-2 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${cat.bg}`}>
                      {cat.icon}
                    </div>
                    <div className="bg-surface border border-border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${cat.bg} ${cat.text}`}>
                          {entry.category}
                        </span>
                        <span className="text-[10px] font-medium text-text-primary">
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                        {entry.mine_id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {entry.mine_id}
                          </span>
                        )}
                        <span className="text-[10px] text-text-muted ml-auto whitespace-nowrap">
                          {formatTime(entry.ts)}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">{entry.details}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className={`text-[9px] ${entry.actor === 'system' ? 'text-blue-500' : 'text-green-500'}`}>
                          {entry.actor === 'system' ? '⚙️ System' : '👤 User'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

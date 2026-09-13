import { useState, useEffect } from 'react'
import { API_BASE, ALERT_COLORS } from '../utils/constants'

const CHANNEL_ICONS = {
  email: '✉️',
  sms: '📱',
  dashboard: '📊',
}

export default function NotificationCenter({ onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [testSent, setTestSent] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/notifications`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const sendTest = async (mineId) => {
    setTestSent(mineId)
    try {
      await fetch(`${API_BASE}/notifications/test/${mineId}`, { method: 'POST' })
    } catch (e) {
      console.error(e)
    }
    setTimeout(() => setTestSent(null), 3000)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center" onClick={onClose}>
        <div className="bg-card rounded-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
          <p className="text-text-muted">Loading notification queue...</p>
        </div>
      </div>
    )
  }

  if (!data) return null
  const { notifications, summary, escalation_rules } = data

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-primary">Alert Notification Center</h2>
            <p className="text-xs text-text-muted">Email/SMS alert dispatch — simulated for prototype</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1 rounded-lg border border-border">Close</button>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-5">
          <div className="rounded-lg bg-surface border border-border p-3 text-center">
            <p className="text-[10px] text-text-muted uppercase">Total Alerts</p>
            <p className="text-xl font-bold">{summary.total}</p>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-center">
            <p className="text-[10px] text-red-500 uppercase">Critical</p>
            <p className="text-xl font-bold text-red-600">{summary.critical}</p>
          </div>
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-center">
            <p className="text-[10px] text-yellow-600 uppercase">Warning</p>
            <p className="text-xl font-bold text-yellow-600">{summary.warning}</p>
          </div>
          <div className="rounded-lg bg-surface border border-border p-3 text-center">
            <p className="text-[10px] text-text-muted uppercase">Mines Affected</p>
            <p className="text-xl font-bold">{summary.unique_mines}</p>
          </div>
        </div>

        {/* Escalation rules */}
        <div className="mb-5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-semibold text-primary uppercase mb-2">Escalation Policy</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-xs">
            <div>
              <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold mr-1">CRITICAL</span>
              Email + SMS + Dashboard, escalate in {escalation_rules.CRITICAL.escalation_minutes}min, auto-action enabled
            </div>
            <div>
              <span className="px-1.5 py-0.5 rounded bg-yellow-500 text-white text-[10px] font-bold mr-1">WARNING</span>
              Email + Dashboard, escalate in {escalation_rules.WARNING.escalation_minutes}min
            </div>
          </div>
        </div>

        {/* Notification queue */}
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <div key={n.id || i} className="rounded-lg border border-border overflow-hidden">
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface transition-colors"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: ALERT_COLORS[n.alert_level] || '#999' }}>
                  {n.alert_level}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{n.mine_name} — {n.period}</p>
                  <p className="text-xs text-text-muted">Shortfall: {Math.abs(n.shortfall_pct).toFixed(1)}% | Cause: {n.primary_cause}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {n.channels.map(ch => (
                    <span key={ch} title={ch} className="text-sm">{CHANNEL_ICONS[ch] || ch}</span>
                  ))}
                </div>
                <span className="text-xs text-text-muted flex-shrink-0">{expanded === i ? '▲' : '▼'}</span>
              </div>

              {expanded === i && (
                <div className="border-t border-border p-3 bg-surface space-y-3">
                  {/* Recipients */}
                  <div>
                    <p className="text-[10px] text-text-muted uppercase font-semibold mb-1">Recipients</p>
                    <div className="space-y-1">
                      {n.recipients.map((r, ri) => (
                        <div key={ri} className="flex items-center gap-2 text-xs">
                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] capitalize">{r.role.replace('_', ' ')}</span>
                          <span className="font-medium">{r.name}</span>
                          <span className="text-text-muted">{r.email}</span>
                          <span className="text-text-muted">{r.phone}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Email preview */}
                  <div>
                    <p className="text-[10px] text-text-muted uppercase font-semibold mb-1">Email Preview</p>
                    <div className="rounded bg-white dark:bg-gray-900 border border-border p-2 text-xs">
                      <p className="font-bold mb-1">{n.message.subject}</p>
                      <pre className="whitespace-pre-wrap text-text-muted font-sans text-[11px]">{n.message.body}</pre>
                    </div>
                  </div>

                  {/* SMS preview */}
                  <div>
                    <p className="text-[10px] text-text-muted uppercase font-semibold mb-1">SMS Preview</p>
                    <div className="rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 text-xs">
                      {n.message.sms}
                    </div>
                  </div>

                  {/* Test button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); sendTest(n.mine_id) }}
                    disabled={testSent === n.mine_id}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {testSent === n.mine_id ? 'Sent (Simulated)' : 'Send Test Notification'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            <strong>Prototype Mode:</strong> Notifications are simulated. In production, this integrates with
            MOIL's SMTP server for email and Twilio/MSG91 for SMS. All contact details shown are placeholders.
          </p>
        </div>
      </div>
    </div>
  )
}

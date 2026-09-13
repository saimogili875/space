import { useState, useEffect } from 'react'
import { API_BASE } from '../utils/constants'

const ROLES = [
  { id: 'manager', icon: '👷', label: 'Mine Manager', labelHi: 'खदान प्रबंधक', labelMr: 'खाण व्यवस्थापक', desc: 'Operational detail for your mine', descHi: 'आपकी खदान का संचालन विवरण', descMr: 'तुमच्या खाणीचा कार्यात्मक तपशील' },
  { id: 'director', icon: '📊', label: 'Regional Director', labelHi: 'क्षेत्रीय निदेशक', labelMr: 'प्रादेशिक संचालक', desc: 'Multi-mine regional overview', descHi: 'बहु-खदान क्षेत्रीय अवलोकन', descMr: 'बहु-खाण प्रादेशिक विहंगावलोकन' },
  { id: 'hq', icon: '🏛️', label: 'MOIL HQ / Ministry', labelHi: 'MOIL मुख्यालय / मंत्रालय', labelMr: 'MOIL मुख्यालय / मंत्रालय', desc: 'Strategic fleet-wide summary', descHi: 'रणनीतिक बेड़ा सारांश', descMr: 'रणनीतिक फ्लीट सारांश' },
]

export default function RoleViews({ onClose, lang = 'en', selectedMine }) {
  const [role, setRole] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const getLabel = (r) => lang === 'hi' ? r.labelHi : lang === 'mr' ? r.labelMr : r.label
  const getDesc = (r) => lang === 'hi' ? r.descHi : lang === 'mr' ? r.descMr : r.desc

  useEffect(() => {
    if (!role) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const [forecastRes, alertsRes, auditRes] = await Promise.all([
          fetch(`${API_BASE}/forecast/${selectedMine || 'balaghat'}`),
          fetch(`${API_BASE}/alerts`),
          fetch(`${API_BASE}/audit/stats`),
        ])
        const forecast = await forecastRes.json()
        const alerts = await alertsRes.json()
        const audit = await auditRes.json()
        setData({ forecast, alerts, audit })
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [role, selectedMine])

  const downloadExcel = (mineId) => {
    const param = mineId ? `?mine_id=${mineId}` : ''
    window.open(`${API_BASE}/export/excel${param}`, '_blank')
  }

  const titles = {
    en: { title: 'Role-Based Dashboard', sub: 'Select your role to see a customized view', download: 'Download Excel', downloadAll: 'Download Fleet Excel', back: 'Back' },
    hi: { title: 'भूमिका-आधारित डैशबोर्ड', sub: 'अपनी भूमिका चुनें', download: 'Excel डाउनलोड', downloadAll: 'फ्लीट Excel डाउनलोड', back: 'वापस' },
    mr: { title: 'भूमिका-आधारित डॅशबोर्ड', sub: 'तुमची भूमिका निवडा', download: 'Excel डाउनलोड', downloadAll: 'फ्लीट Excel डाउनलोड', back: 'मागे' },
  }
  const t = titles[lang] || titles.en

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <span className="text-xl">🎭</span> {t.title}
            </h2>
            <p className="text-xs text-text-muted">{t.sub}</p>
          </div>
          <div className="flex gap-2">
            {role && (
              <button onClick={() => setRole(null)} className="text-xs text-primary hover:underline px-2 py-1">
                ← {t.back}
              </button>
            )}
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1 rounded-lg border border-border">
              {lang === 'hi' ? 'बंद करें' : lang === 'mr' ? 'बंद करा' : 'Close'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Role selection */}
          {!role && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
              {ROLES.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className="bg-surface border-2 border-border hover:border-primary rounded-xl p-5 text-center transition-all hover:shadow-lg group"
                >
                  <div className="text-4xl mb-3">{r.icon}</div>
                  <div className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors">{getLabel(r)}</div>
                  <div className="text-[11px] text-text-muted mt-1">{getDesc(r)}</div>
                </button>
              ))}
            </div>
          )}

          {/* Mine Manager View */}
          {role === 'manager' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">👷 {getLabel(ROLES[0])}</h3>
                <button onClick={() => downloadExcel(selectedMine)} className="text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors">
                  📥 {t.download}
                </button>
              </div>

              {loading ? <p className="text-sm text-text-muted text-center py-8">Loading...</p> : data && (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {data.forecast?.slice(0, 1).map((fc, i) => (
                      <div key={i} className="bg-surface border border-border rounded-lg p-3 text-center">
                        <div className="text-[10px] text-text-muted uppercase">Predicted</div>
                        <div className="text-xl font-bold text-primary">{(fc.predicted_tonnes / 1000).toFixed(1)}k t</div>
                      </div>
                    ))}
                    {data.forecast?.slice(0, 1).map((fc, i) => (
                      <div key={`t${i}`} className="bg-surface border border-border rounded-lg p-3 text-center">
                        <div className="text-[10px] text-text-muted uppercase">Target</div>
                        <div className="text-xl font-bold">{(fc.target_tonnes / 1000).toFixed(1)}k t</div>
                      </div>
                    ))}
                    {data.forecast?.slice(0, 1).map((fc, i) => (
                      <div key={`s${i}`} className="bg-surface border border-border rounded-lg p-3 text-center">
                        <div className="text-[10px] text-text-muted uppercase">Shortfall</div>
                        <div className={`text-xl font-bold ${Math.abs(fc.shortfall_pct) > 10 ? 'text-red-500' : Math.abs(fc.shortfall_pct) > 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {Math.abs(fc.shortfall_pct).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                    <div className="bg-surface border border-border rounded-lg p-3 text-center">
                      <div className="text-[10px] text-text-muted uppercase">My Alerts</div>
                      <div className="text-xl font-bold text-red-500">
                        {data.alerts?.filter(a => a.mine_id === (selectedMine || 'balaghat')).length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Forecast Table */}
                  <div className="bg-surface border border-border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 border-b border-border bg-primary/5">
                      <span className="text-xs font-semibold text-primary">4-Month Forecast</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-text-muted">
                            <th className="px-3 py-2 text-left">Period</th>
                            <th className="px-3 py-2 text-right">Predicted</th>
                            <th className="px-3 py-2 text-right">Target</th>
                            <th className="px-3 py-2 text-right">Shortfall</th>
                            <th className="px-3 py-2 text-center">Status</th>
                            <th className="px-3 py-2 text-left">Top Factor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.forecast?.map((fc, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="px-3 py-2 font-medium">{fc.period}</td>
                              <td className="px-3 py-2 text-right">{(fc.predicted_tonnes / 1000).toFixed(1)}k</td>
                              <td className="px-3 py-2 text-right">{(fc.target_tonnes / 1000).toFixed(1)}k</td>
                              <td className="px-3 py-2 text-right font-semibold">{fc.shortfall_pct.toFixed(1)}%</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  fc.alert_level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                  fc.alert_level === 'WARNING' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>{fc.alert_level}</span>
                              </td>
                              <td className="px-3 py-2 text-text-muted">{fc.top_factors?.[0]?.feature || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions needed */}
                  <div className="bg-surface border border-border rounded-lg p-3">
                    <div className="text-xs font-semibold text-primary mb-2">🎯 Recommended Actions</div>
                    {data.alerts?.filter(a => a.mine_id === (selectedMine || 'balaghat')).slice(0, 3).map((a, i) => (
                      <div key={i} className="text-xs text-text-secondary mb-1.5">
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${a.alert_level === 'CRITICAL' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        {a.period}: {a.actions?.map(act => act.action).join('; ') || a.primary_cause}
                      </div>
                    ))}
                    {data.alerts?.filter(a => a.mine_id === (selectedMine || 'balaghat')).length === 0 && (
                      <div className="text-xs text-green-600">All clear — no actions needed</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Regional Director View */}
          {role === 'director' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">📊 {getLabel(ROLES[1])}</h3>
                <button onClick={() => downloadExcel()} className="text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors">
                  📥 {t.downloadAll}
                </button>
              </div>

              {loading ? <p className="text-sm text-text-muted text-center py-8">Loading...</p> : data && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-surface border border-border rounded-lg p-3 text-center">
                      <div className="text-[10px] text-text-muted uppercase">Total Mines</div>
                      <div className="text-2xl font-bold text-primary">10</div>
                    </div>
                    <div className="bg-surface border border-border rounded-lg p-3 text-center">
                      <div className="text-[10px] text-text-muted uppercase">Critical Alerts</div>
                      <div className="text-2xl font-bold text-red-500">{data.alerts?.filter(a => a.alert_level === 'CRITICAL').length || 0}</div>
                    </div>
                    <div className="bg-surface border border-border rounded-lg p-3 text-center">
                      <div className="text-[10px] text-text-muted uppercase">Warnings</div>
                      <div className="text-2xl font-bold text-yellow-500">{data.alerts?.filter(a => a.alert_level === 'WARNING').length || 0}</div>
                    </div>
                  </div>

                  {/* Alert heatmap table */}
                  <div className="bg-surface border border-border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 border-b border-border bg-primary/5">
                      <span className="text-xs font-semibold text-primary">Mine Alert Matrix</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-text-muted">
                            <th className="px-3 py-2 text-left">Mine</th>
                            <th className="px-3 py-2 text-center">Critical</th>
                            <th className="px-3 py-2 text-center">Warning</th>
                            <th className="px-3 py-2 text-center">On Track</th>
                            <th className="px-3 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(
                            (data.alerts || []).reduce((acc, a) => {
                              if (!acc[a.mine_name]) acc[a.mine_name] = { critical: 0, warning: 0 }
                              if (a.alert_level === 'CRITICAL') acc[a.mine_name].critical++
                              else if (a.alert_level === 'WARNING') acc[a.mine_name].warning++
                              return acc
                            }, {})
                          ).sort((a, b) => (b[1].critical * 10 + b[1].warning) - (a[1].critical * 10 + a[1].warning))
                           .map(([name, counts], i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="px-3 py-2 font-medium">{name}</td>
                              <td className="px-3 py-2 text-center">
                                {counts.critical > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{counts.critical}</span>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {counts.warning > 0 && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{counts.warning}</span>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {counts.critical === 0 && counts.warning === 0 && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">✓</span>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`w-3 h-3 rounded-full inline-block ${counts.critical > 0 ? 'bg-red-500' : counts.warning > 0 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-surface border border-border rounded-lg p-3">
                    <div className="text-xs font-semibold text-primary mb-2">📋 Priority Actions</div>
                    {data.alerts?.filter(a => a.alert_level === 'CRITICAL').slice(0, 5).map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-text-secondary mb-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                        <span><strong>{a.mine_name}</strong> ({a.period}): {a.primary_cause} — {Math.abs(a.shortfall_pct).toFixed(1)}% shortfall</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* HQ / Ministry View */}
          {role === 'hq' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">🏛️ {getLabel(ROLES[2])}</h3>
                <button onClick={() => downloadExcel()} className="text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors">
                  📥 {t.downloadAll}
                </button>
              </div>

              {loading ? <p className="text-sm text-text-muted text-center py-8">Loading...</p> : data && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-surface border border-border rounded-lg p-3 text-center">
                      <div className="text-[10px] text-text-muted uppercase">MOIL Mines</div>
                      <div className="text-2xl font-bold text-primary">10</div>
                    </div>
                    <div className="bg-surface border border-border rounded-lg p-3 text-center">
                      <div className="text-[10px] text-text-muted uppercase">Total Alerts</div>
                      <div className="text-2xl font-bold text-red-500">{data.alerts?.length || 0}</div>
                    </div>
                    <div className="bg-surface border border-border rounded-lg p-3 text-center">
                      <div className="text-[10px] text-text-muted uppercase">AI Events</div>
                      <div className="text-2xl font-bold text-blue-500">{data.audit?.total_events || 0}</div>
                    </div>
                    <div className="bg-surface border border-border rounded-lg p-3 text-center">
                      <div className="text-[10px] text-text-muted uppercase">States Covered</div>
                      <div className="text-2xl font-bold text-green-500">2</div>
                      <div className="text-[9px] text-text-muted">MP + MH</div>
                    </div>
                  </div>

                  {/* Strategic summary */}
                  <div className="bg-surface border border-border rounded-lg p-4">
                    <div className="text-xs font-semibold text-primary mb-3">🎯 Strategic Summary</div>
                    <div className="space-y-2 text-xs text-text-secondary">
                      <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                        <span>Fleet-wide critical alerts</span>
                        <span className="font-bold text-red-500">{data.alerts?.filter(a => a.alert_level === 'CRITICAL').length || 0}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                        <span>Mines requiring immediate attention</span>
                        <span className="font-bold text-yellow-600">
                          {new Set(data.alerts?.filter(a => a.alert_level === 'CRITICAL').map(a => a.mine_id)).size}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                        <span>AI model decisions logged</span>
                        <span className="font-bold text-blue-500">{data.audit?.total_events || 0}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                        <span>Top risk factor across fleet</span>
                        <span className="font-bold text-text-primary">Rainfall / actual_tonnes_lag1</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span>Estimated monthly savings potential</span>
                        <span className="font-bold text-green-600">₹8-15 Crore</span>
                      </div>
                    </div>
                  </div>

                  {/* Compliance */}
                  <div className="bg-surface border border-border rounded-lg p-4">
                    <div className="text-xs font-semibold text-primary mb-3">✅ Compliance & Accountability</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[10px]">✓</span>
                        <span>ML model explainability (SHAP)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[10px]">✓</span>
                        <span>Complete audit trail</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[10px]">✓</span>
                        <span>Satellite data integration</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[10px]">✓</span>
                        <span>Trilingual support</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[10px]">✓</span>
                        <span>Offline-capable (PWA)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[10px]">✓</span>
                        <span>Excel export for records</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

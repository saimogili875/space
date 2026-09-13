import { useState, useEffect } from 'react'
import { API_BASE } from '../utils/constants'

function BigStat({ label, value, sub, color }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-500 uppercase font-medium tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-0.5" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </div>
  )
}

export default function ROICalculator({ onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/roi`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center" onClick={onClose}>
        <div className="bg-card rounded-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
          <p className="text-text-muted">Calculating ROI across all 10 mines...</p>
        </div>
      </div>
    )
  }

  if (!data) return null
  const { summary, without_mangalens, with_mangalens, mine_breakdown } = data

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-primary">ROI & Business Impact</h2>
            <p className="text-xs text-text-muted">MangaLens saves MOIL Rs {summary.annual_savings_crore} Cr/year by catching shortfalls {summary.early_detection_months} months early</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1 rounded-lg border border-border">Close</button>
        </div>

        {/* Hero stats */}
        <div className="grid grid-cols-4 gap-4 mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-border">
          <BigStat label="Annual Savings" value={`Rs ${summary.annual_savings_crore} Cr`} color="#16a34a" />
          <BigStat label="ROI" value={`${summary.roi_pct}%`} color="#e67e22" />
          <BigStat label="Tonnes Recovered" value={summary.tonnes_recovered_annually.toLocaleString()} sub="per year" />
          <BigStat label="Mines Monitored" value={summary.mines_monitored} sub="MOIL fleet" />
        </div>

        {/* Before vs After */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border-2 border-red-200 dark:border-red-900 p-4">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-3">Without MangaLens</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Detection delay</span>
                <span className="font-bold text-red-500">{without_mangalens.detection_delay_months} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Recovery rate</span>
                <span className="font-bold text-red-500">{without_mangalens.recovery_rate_pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Annual shortfall</span>
                <span className="font-bold">{without_mangalens.annual_shortfall_tonnes.toLocaleString()}t</span>
              </div>
              <div className="flex justify-between border-t pt-2 border-red-200 dark:border-red-900">
                <span className="text-text-muted">Revenue lost</span>
                <span className="font-bold text-red-600">Rs {without_mangalens.lost_revenue_crore} Cr</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-green-200 dark:border-green-900 p-4">
            <p className="text-xs font-bold text-green-500 uppercase tracking-wide mb-3">With MangaLens</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Detection delay</span>
                <span className="font-bold text-green-500">{with_mangalens.detection_delay_months} month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Recovery rate</span>
                <span className="font-bold text-green-500">{with_mangalens.recovery_rate_pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Tonnes recovered</span>
                <span className="font-bold">{with_mangalens.recoverable_tonnes.toLocaleString()}t</span>
              </div>
              <div className="flex justify-between border-t pt-2 border-green-200 dark:border-green-900">
                <span className="text-text-muted">Revenue saved</span>
                <span className="font-bold text-green-600">Rs {with_mangalens.saved_revenue_crore} Cr</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mine breakdown table */}
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Per-Mine Breakdown</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-2 py-1.5 text-left">Mine</th>
                  <th className="px-2 py-1.5 text-right">Shortfall (4m)</th>
                  <th className="px-2 py-1.5 text-right">Annual Est.</th>
                  <th className="px-2 py-1.5 text-right">Recoverable</th>
                  <th className="px-2 py-1.5 text-right">Value Saved</th>
                  <th className="px-2 py-1.5 text-center">Alerts</th>
                </tr>
              </thead>
              <tbody>
                {mine_breakdown.map((m, i) => (
                  <tr key={m.mine_id} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-2 py-1.5 font-medium">{m.name}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{m.forecast_shortfall_4m.toLocaleString()}t</td>
                    <td className="px-2 py-1.5 text-right font-mono">{m.annual_shortfall_estimate.toLocaleString()}t</td>
                    <td className="px-2 py-1.5 text-right font-mono text-green-600">{m.recoverable_tonnes.toLocaleString()}t</td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-green-600">Rs {m.value_saved_lakh}L</td>
                    <td className="px-2 py-1.5 text-center">
                      {m.critical_alerts > 0 && <span className="px-1 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold mr-1">{m.critical_alerts}C</span>}
                      {m.warning_alerts > 0 && <span className="px-1 py-0.5 rounded bg-yellow-500 text-white text-[10px] font-bold">{m.warning_alerts}W</span>}
                      {m.critical_alerts === 0 && m.warning_alerts === 0 && <span className="text-green-500 text-[10px]">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom note */}
        <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Methodology:</strong> Shortfall estimated from 4-month ensemble forecast extrapolated annually.
            Recovery rate of {(with_mangalens.recovery_rate_pct)}% assumes {summary.early_detection_months}-month early detection enables
            shift rescheduling, equipment maintenance, and buffer stock deployment. Mn ore valued at Rs 7,000/tonne.
            Platform cost estimated at Rs {summary.platform_cost_crore} Cr/year (infrastructure + maintenance).
          </p>
        </div>
      </div>
    </div>
  )
}
